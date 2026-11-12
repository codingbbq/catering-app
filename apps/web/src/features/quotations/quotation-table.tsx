"use client";

import type { QuotationListItem } from "@catering/shared-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";
import { QuotationStatusBadge } from "./quotation-status-badge";

const columnHelper = createColumnHelper<QuotationListItem>();

interface QuotationTableProps {
  data: QuotationListItem[];
  tenantSlug: string;
}

export function QuotationTable({ data, tenantSlug }: QuotationTableProps) {
  const { formatCurrency } = useTenantCurrency();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("quotationNumber", {
        header: "Quote # & Title",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/tenant/${tenantSlug}/quotations/${item.id}`}
                  className="font-mono text-xs font-semibold text-[#171717] hover:underline"
                >
                  {item.quotationNumber}
                </Link>
                <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-mono text-[#737373]">
                  v{item.currentRevisionNumber}
                </span>
              </div>
              <div className="font-medium text-xs text-[#262626] truncate max-w-[200px] sm:max-w-[280px]">
                {item.title}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("customerName", {
        header: "Customer",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div>
              <Link
                href={`/tenant/${tenantSlug}/customers/${item.customerId}`}
                className="text-xs font-medium text-[#171717] hover:underline"
              >
                {info.getValue()}
              </Link>
              <div className="text-[11px] text-[#737373]">
                <Link
                  href={`/tenant/${tenantSlug}/enquiries/${item.enquiryId}`}
                  className="hover:underline"
                >
                  Enquiry: {item.enquiryTitle}
                </Link>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <QuotationStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("guestCount", {
        header: "Guests",
        cell: (info) => (
          <span className="font-mono text-xs text-[#262626]">
            {info.getValue() ? `${info.getValue()} guests` : "—"}
          </span>
        ),
      }),
      columnHelper.accessor("totalAmount", {
        header: "Total Quoted",
        cell: (info) => (
          <div className="text-right">
            <span className="font-mono text-xs font-semibold text-[#171717]">
              {formatCurrency(info.getValue())}
            </span>
            <div className="text-[10px] text-[#737373]">
              {info.row.original.totalRevisions > 1
                ? `${info.row.original.totalRevisions} revisions`
                : "Initial revision"}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("validUntil", {
        header: "Valid Until",
        cell: (info) => (
          <span className="font-mono text-xs text-[#737373]">
            {info.getValue()
              ? new Date(info.getValue()!).toLocaleDateString()
              : "No expiry"}
          </span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => (
          <span className="font-mono text-xs text-[#737373]">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/tenant/${tenantSlug}/quotations/${item.id}`}
                className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] transition-colors"
              >
                View
              </Link>
            </div>
          );
        },
      }),
    ],
    [tenantSlug],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#737373]"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: isSortable ? "pointer" : "default" }}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() ? (
                          <span className="text-[10px] text-[#171717]">
                            {header.column.getIsSorted() === "asc" ? "▲" : "▼"}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#FAFAFA]/80 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-[#737373]">
        <div>
          Showing{" "}
          <span className="font-mono font-medium text-[#262626]">
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}
          </span>{" "}
          to{" "}
          <span className="font-mono font-medium text-[#262626]">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              data.length,
            )}
          </span>{" "}
          of <span className="font-mono font-medium text-[#262626]">{data.length}</span> quotes
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] disabled:opacity-40 hover:bg-[#FAFAFA]"
          >
            Previous
          </button>
          <span className="font-mono text-xs text-[#262626]">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] disabled:opacity-40 hover:bg-[#FAFAFA]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
