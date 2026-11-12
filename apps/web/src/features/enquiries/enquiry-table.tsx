"use client";

import type { EnquiryItem } from "@catering/shared-types";
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
import { EnquiryStatusBadge } from "./enquiry-status-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

const columnHelper = createColumnHelper<EnquiryItem>();

interface EnquiryTableProps {
  data: EnquiryItem[];
  tenantSlug: string;
}

const SERVICE_LABELS: Record<string, string> = {
  event_catering: "Event Catering",
  daily_meals: "Daily Meals",
  other: "Other",
};

export function EnquiryTable({ data, tenantSlug }: EnquiryTableProps) {
  const { formatCurrency } = useTenantCurrency();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Enquiry Title",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div>
              <Link
                href={`/tenant/${tenantSlug}/enquiries/${item.id}`}
                className="font-medium text-[#171717] hover:underline"
              >
                {info.getValue()}
              </Link>
              <div className="text-[11px] text-[#737373] md:hidden">
                Customer: {item.customerName}
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
            <Link
              href={`/tenant/${tenantSlug}/customers/${item.customerId}`}
              className="text-xs text-[#262626] hover:underline"
            >
              {info.getValue()}
            </Link>
          );
        },
      }),
      columnHelper.accessor("serviceType", {
        header: "Service",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-xs text-[#737373]">
              {SERVICE_LABELS[val] ?? val}
            </span>
          );
        },
      }),
      columnHelper.accessor("eventDate", {
        header: "Event Date",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return <span className="text-xs text-[#A3A3A3] italic">—</span>;
          const d = new Date(val);
          return (
            <span className="font-mono text-xs text-[#262626]">
              {d.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          );
        },
      }),
      columnHelper.accessor("guestCount", {
        header: "Guests",
        cell: (info) => {
          const val = info.getValue();
          return val !== null && val !== undefined ? (
            <span className="font-mono text-xs text-[#262626]">{val.toLocaleString()} pax</span>
          ) : (
            <span className="text-xs text-[#A3A3A3] italic">—</span>
          );
        },
      }),
      columnHelper.accessor("estimatedBudget", {
        header: "Budget",
        cell: (info) => {
          const val = info.getValue();
          return val !== null && val !== undefined ? (
            <span className="font-mono text-xs text-[#262626]">
              {formatCurrency(val)}
            </span>
          ) : (
            <span className="text-xs text-[#A3A3A3] italic">—</span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <EnquiryStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("nextAction", {
        header: "Next Step",
        cell: (info) => {
          const action = info.getValue();
          const actionDate = info.row.original.nextActionDate;
          if (!action) return <span className="text-xs text-[#A3A3A3] italic">—</span>;
          return (
            <div className="text-xs text-[#525252]">
              <div>{action}</div>
              {actionDate && (
                <div className="font-mono text-[10px] text-[#737373]">
                  Due: {new Date(actionDate).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => (
          <div className="flex justify-end">
            <Link
              href={`/tenant/${tenantSlug}/enquiries/${info.row.original.id}`}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#FAFAFA] transition-colors"
            >
              Open
            </Link>
          </div>
        ),
      }),
    ],
    [tenantSlug, formatCurrency],
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
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3">
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-1 hover:text-[#171717]"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-[#737373]">
                  No enquiries match the current filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-xs text-[#737373] px-1">
          <span>
            Showing {table.getRowModel().rows.length} of {data.length} results
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 font-medium text-[#262626] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAFAFA]"
            >
              Previous
            </button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 font-medium text-[#262626] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAFAFA]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
