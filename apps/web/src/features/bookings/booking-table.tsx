"use client";

import type { BookingListItem } from "@catering/shared-types";
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
import { BookingStatusBadge } from "./booking-status-badge";

const columnHelper = createColumnHelper<BookingListItem>();

interface BookingTableProps {
  data: BookingListItem[];
  tenantSlug: string;
}

export function BookingTable({ data, tenantSlug }: BookingTableProps) {
  const { formatCurrency } = useTenantCurrency();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "eventDate", desc: false },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("bookingNumber", {
        header: "Booking # & Title",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/tenant/${tenantSlug}/bookings/${item.id}`}
                  className="font-mono text-xs font-semibold text-[#171717] hover:underline"
                >
                  {item.bookingNumber}
                </Link>
                {item.quotationNumber && (
                  <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-mono text-[#737373]">
                    {item.quotationNumber}
                  </span>
                )}
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
              {item.customerPhone && (
                <div className="text-[11px] font-mono text-[#737373]">
                  {item.customerPhone}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("eventDate", {
        header: "Event Date",
        cell: (info) => {
          const date = new Date(info.getValue());
          const item = info.row.original;
          return (
            <div>
              <span className="font-mono text-xs font-medium text-[#171717]">
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {item.venueName && (
                <div className="text-[11px] text-[#737373] truncate max-w-[180px]">
                  {item.venueName}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <BookingStatusBadge status={info.getValue()} />,
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
        header: "Booking Value",
        cell: (info) => (
          <div className="text-right">
            <span className="font-mono text-xs font-semibold text-[#171717]">
              {formatCurrency(info.getValue())}
            </span>
            <div className="text-[10px] text-[#737373] capitalize">
              {info.row.original.serviceType.replace(/_/g, " ")}
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <div className="text-right">
            <Link
              href={`/tenant/${tenantSlug}/bookings/${info.row.original.id}`}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              Manage &rarr;
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
      pagination: { pageSize: 20 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold text-[#737373] uppercase tracking-wider"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-xs text-[#737373]"
                >
                  No bookings found matching criteria.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[#FAFAFA] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-[#737373]">
          <div>
            Showing{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              data.length,
            )}{" "}
            of {data.length} bookings
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="font-mono text-xs">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
