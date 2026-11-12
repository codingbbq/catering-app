"use client";

import type { Menu } from "@catering/shared-types";
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
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

const columnHelper = createColumnHelper<Menu>();

interface MenuTableProps {
  data: Menu[];
  tenantSlug: string;
  onDuplicate?: (menu: Menu) => void;
  onArchiveToggle?: (menu: Menu) => void;
}

export function MenuTable({
  data,
  tenantSlug,
  onDuplicate,
  onArchiveToggle,
}: MenuTableProps) {
  const { formatCurrency } = useTenantCurrency();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Menu Name",
        cell: (info) => {
          const menu = info.row.original;
          return (
            <div className="space-y-0.5 min-w-0 max-w-sm">
              <Link
                href={`/tenant/${tenantSlug}/menus/${menu.id}`}
                className="font-medium text-[#171717] hover:underline block truncate"
              >
                {menu.name}
              </Link>
              {menu.description && (
                <p className="text-xs text-[#737373] truncate">
                  {menu.description}
                </p>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("serviceStyle", {
        header: "Service Style",
        cell: (info) => {
          const style = info.getValue();
          if (!style) return <span className="text-xs text-[#A3A3A3]">—</span>;
          const label = style
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <span className="inline-flex items-center rounded border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-0.5 text-xs text-[#262626] font-medium">
              {label}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const variant =
            status === "active"
              ? "success"
              : status === "draft"
                ? "neutral"
                : "warning";
          return (
            <StatusBadge variant={variant}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor("itemsCount", {
        header: "Items",
        cell: (info) => {
          const count = info.getValue() ?? info.row.original.items?.length ?? 0;
          return (
            <span className="font-mono text-xs text-[#262626]">
              {count} {count === 1 ? "item" : "items"}
            </span>
          );
        },
      }),
      columnHelper.accessor("totalSellingPrice", {
        header: "Indicative Price",
        cell: (info) => {
          const price = info.getValue() ?? 0;
          return (
            <span className="font-mono text-xs font-semibold text-[#171717]">
              {formatCurrency(price)}
            </span>
          );
        },
      }),
      columnHelper.accessor("minGuests", {
        header: "Min Guests",
        cell: (info) => {
          const guests = info.getValue();
          return (
            <span className="font-mono text-xs text-[#737373]">
              {guests ? `${guests} pax` : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("updatedAt", {
        header: "Last Updated",
        cell: (info) => {
          const dateStr = info.getValue();
          const formatted = new Date(dateStr).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          return (
            <span className="font-mono text-xs text-[#737373]">
              {formatted}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => {
          const menu = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Link
                href={`/tenant/${tenantSlug}/menus/${menu.id}`}
                className="btn btn-ghost btn-xs text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4]"
                title="View Menu Details"
              >
                View
              </Link>
              <Link
                href={`/tenant/${tenantSlug}/menus/${menu.id}/edit`}
                className="btn btn-ghost btn-xs text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4]"
                title="Edit Menu"
              >
                Edit
              </Link>
              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => onDuplicate(menu)}
                  className="btn btn-ghost btn-xs text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4]"
                  title="Duplicate Menu"
                >
                  Duplicate
                </button>
              )}
              {onArchiveToggle && (
                <button
                  type="button"
                  onClick={() => onArchiveToggle(menu)}
                  className={`btn btn-ghost btn-xs ${
                    menu.status === "archived"
                      ? "text-emerald-700 hover:text-emerald-800"
                      : "text-amber-700 hover:text-amber-800"
                  } hover:bg-[#F5F5F4]`}
                  title={menu.status === "archived" ? "Reactivate Menu" : "Archive Menu"}
                >
                  {menu.status === "archived" ? "Reactivate" : "Archive"}
                </button>
              )}
            </div>
          );
        },
      }),
    ],
    [tenantSlug, onDuplicate, onArchiveToggle, formatCurrency],
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
      pagination: {
        pageSize: 15,
      },
    },
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] bg-white p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F4] text-[#737373] mb-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-[#171717]">No menus found</h3>
        <p className="mt-1 text-xs text-[#737373] max-w-sm">
          No menus match your current search or status filter. Create your first reusable menu to start building quotations.
        </p>
        <Link
          href={`/tenant/${tenantSlug}/menus/new`}
          className="btn btn-sm bg-[#171717] hover:bg-[#262626] text-white border-0 mt-4 gap-1.5"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Build New Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-medium cursor-pointer select-none"
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
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-[#FAFAFA] transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-[#737373]">
          <div>
            Showing{" "}
            <span className="font-mono font-medium text-[#171717]">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </span>{" "}
            to{" "}
            <span className="font-mono font-medium text-[#171717]">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                data.length,
              )}
            </span>{" "}
            of{" "}
            <span className="font-mono font-medium text-[#171717]">
              {data.length}
            </span>{" "}
            menus
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-xs border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA] disabled:opacity-40"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <span className="px-2 font-mono">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <button
              type="button"
              className="btn btn-xs border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA] disabled:opacity-40"
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
