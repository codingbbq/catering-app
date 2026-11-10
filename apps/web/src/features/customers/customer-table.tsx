"use client";

import type { CustomerItem } from "@catering/shared-types";
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
import { StatusBadge } from "@/components/ui/status-badge";

const columnHelper = createColumnHelper<CustomerItem>();

interface CustomerTableProps {
  data: CustomerItem[];
  tenantSlug: string;
}

export function CustomerTable({ data, tenantSlug }: CustomerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Customer Account",
        cell: (info) => {
          const customer = info.row.original;
          return (
            <div>
              <Link
                href={`/tenant/${tenantSlug}/customers/${customer.id}`}
                className="font-medium text-[#171717] hover:underline"
              >
                {info.getValue()}
              </Link>
              {customer.email && (
                <div className="text-[11px] text-[#737373] md:hidden">{customer.email}</div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("email", {
        header: "Email Address",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="font-mono text-xs text-[#262626]">{val}</span>
          ) : (
            <span className="text-xs text-[#A3A3A3] italic">—</span>
          );
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-xs text-[#262626]">{val}</span>
          ) : (
            <span className="text-xs text-[#A3A3A3] italic">—</span>
          );
        },
      }),
      columnHelper.accessor("contactCount", {
        header: "Contacts",
        cell: (info) => {
          const count = info.getValue();
          return (
            <span className="inline-flex items-center rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#737373]">
              {count} {count === 1 ? "contact" : "contacts"}
            </span>
          );
        },
      }),
      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => {
          const isActive = info.getValue();
          return (
            <StatusBadge variant={isActive ? "success" : "neutral"} showDot={true}>
              {isActive ? "Active" : "Inactive"}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Added",
        cell: (info) => (
          <span className="text-xs text-[#737373]">
            {new Date(info.getValue()).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => (
          <div className="text-right">
            <Link
              href={`/tenant/${tenantSlug}/customers/${info.row.original.id}`}
              className="inline-flex items-center rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
            >
              Manage &rarr;
            </Link>
          </div>
        ),
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
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className={`py-3 px-4 ${canSort ? "cursor-pointer select-none" : ""}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-[10px] text-[#A3A3A3]">
                              {sortDirection === "asc"
                                ? "▲"
                                : sortDirection === "desc"
                                  ? "▼"
                                  : "⇅"}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-xs text-[#737373]">
                    No customer accounts match your criteria.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-[#FAFAFA] transition-colors ${
                      !row.original.isActive ? "opacity-75" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {table.getPageCount() > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F0F0] bg-[#FAFAFA] px-4 py-2.5 text-xs text-[#737373]">
            <div>
              Showing{" "}
              <span className="font-medium text-[#171717]">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-[#171717]">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  data.length,
                )}
              </span>{" "}
              of <span className="font-medium text-[#171717]">{data.length}</span> records
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 disabled:hover:bg-white"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <span className="px-2 text-xs text-[#737373]">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 disabled:hover:bg-white"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
