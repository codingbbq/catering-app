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
        header: "Customer / Account",
        cell: (info) => {
          const customer = info.row.original;
          return (
            <div>
              <Link
                href={`/tenant/${tenantSlug}/customers/${customer.id}`}
                className="font-semibold text-primary hover:underline"
              >
                {info.getValue()}
              </Link>
              {customer.email && (
                <div className="text-xs text-base-content/60 md:hidden">{customer.email}</div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-sm font-mono">
            {info.getValue() ?? <span className="text-base-content/40 italic">None</span>}
          </span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => (
          <span className="text-sm">
            {info.getValue() ?? <span className="text-base-content/40 italic">None</span>}
          </span>
        ),
      }),
      columnHelper.accessor("contactCount", {
        header: "Contacts",
        cell: (info) => {
          const count = info.getValue();
          return (
            <span className="badge badge-sm badge-ghost">
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
            <span
              className={`badge badge-sm ${
                isActive ? "badge-success text-success-content" : "badge-ghost opacity-60"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => (
          <span className="text-xs text-base-content/70">
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
              className="btn btn-ghost btn-xs"
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
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-base-200 bg-base-100 shadow-sm">
        <table className="table table-zebra w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-base-200/50">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={canSort ? "cursor-pointer select-none" : ""}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-xs text-base-content/50">
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
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-base-content/60">
                  No customers found matching your criteria.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover ${!row.original.isActive ? "opacity-75" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-base-content/70">
          <div>
            Showing{" "}
            <span className="font-medium">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length,
              )}
            </span>{" "}
            of <span className="font-medium">{data.length}</span> results
          </div>

          <div className="join">
            <button
              className="btn btn-sm join-item"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button className="btn btn-sm join-item pointer-events-none">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
