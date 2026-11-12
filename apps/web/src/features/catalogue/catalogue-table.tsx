"use client";

import type { CatalogueItem } from "@catering/shared-types";
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
import { formatImageUrl } from "./catalogue-image-gallery";
import { DietaryTagBadge } from "./dietary-tag-badge";
import { PricingUnitBadge } from "./pricing-unit-badge";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

const columnHelper = createColumnHelper<CatalogueItem>();

interface CatalogueTableProps {
  data: CatalogueItem[];
  tenantSlug: string;
  onArchiveToggle?: (item: CatalogueItem) => void;
}

export function CatalogueTable({
  data,
  tenantSlug,
  onArchiveToggle,
}: CatalogueTableProps) {
  const { formatCurrency } = useTenantCurrency();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Item & Category",
        cell: (info) => {
          const item = info.row.original;
          const thumbUrl = item.primaryImageUrl || item.images?.[0]?.url;

          return (
            <div className="flex items-center gap-3">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formatImageUrl(thumbUrl)}
                  alt={item.name}
                  className="h-10 w-10 rounded-md border border-[#E5E5E5] object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#E5E5E5] bg-[#FAFAFA] text-[#A3A3A3]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/tenant/${tenantSlug}/catalogue/${item.id}`}
                    className="font-medium text-[#171717] hover:underline truncate"
                  >
                    {info.getValue()}
                  </Link>
                  {item.isArchived && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#E5E5E5] text-[#737373]">
                      Archived
                    </span>
                  )}
                  {(item.images?.length || 0) > 1 && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono text-[#737373] bg-[#F5F5F4] border border-[#E5E5E5]">
                      {item.images.length} pics
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#737373]">
                  <span className="capitalize font-medium text-[#525252]">
                    {item.category}
                  </span>
                  {item.description && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-xs">{item.description}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("pricingUnit", {
        header: "Unit",
        cell: (info) => <PricingUnitBadge unit={info.getValue()} />,
      }),
      columnHelper.accessor("costPrice", {
        header: "Unit Cost",
        cell: (info) => {
          const val = info.getValue();
          if (val === null || val === undefined) {
            return <span className="font-mono text-xs text-[#A3A3A3]">—</span>;
          }
          return (
            <span className="font-mono text-xs text-[#525252]">
              {formatCurrency(val)}
            </span>
          );
        },
      }),
      columnHelper.accessor("sellingPrice", {
        header: "Selling Price",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-[#171717]">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "margin",
        header: "Gross Margin",
        cell: (info) => {
          const item = info.row.original;
          if (item.costPrice === null || item.costPrice === undefined || item.sellingPrice <= 0) {
            return <span className="font-mono text-xs text-[#A3A3A3]">—</span>;
          }
          const margin = ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100;
          const isLow = margin < 35;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={isLow ? "font-medium text-[#B45309]" : "text-[#171717]"}>
                {margin.toFixed(1)}%
              </span>
              {isLow && (
                <span title="Margin below 35%" className="inline-block h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("dietaryTags", {
        header: "Dietary",
        cell: (info) => {
          const tags = info.getValue() || [];
          if (tags.length === 0) {
            return <span className="text-[11px] text-[#A3A3A3]">—</span>;
          }
          const visible = tags.slice(0, 3);
          const remaining = tags.length - visible.length;
          return (
            <div className="flex flex-wrap items-center gap-1">
              {visible.map((tag) => (
                <DietaryTagBadge key={tag} tag={tag} />
              ))}
              {remaining > 0 && (
                <span className="text-[10px] text-[#737373]">+{remaining}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/tenant/${tenantSlug}/catalogue/${item.id}`}
                className="rounded border border-[#E5E5E5] px-2 py-1 text-[11px] font-medium text-[#262626] hover:bg-[#F5F5F4] transition-colors"
              >
                Edit
              </Link>
              {onArchiveToggle && (
                <button
                  type="button"
                  onClick={() => onArchiveToggle(item)}
                  className="rounded px-2 py-1 text-[11px] text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4] transition-colors"
                >
                  {item.isArchived ? "Reactivate" : "Archive"}
                </button>
              )}
            </div>
          );
        },
      }),
    ],
    [tenantSlug, onArchiveToggle, formatCurrency],
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
      <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                  className="px-4 py-10 text-center text-xs text-[#737373]"
                >
                  No catalogue items match your current filter.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-xs text-[#737373] px-1">
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
            items
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-[#E5E5E5] px-2.5 py-1 text-xs disabled:opacity-40 hover:bg-[#FAFAFA] transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-mono">
              {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount()}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-[#E5E5E5] px-2.5 py-1 text-xs disabled:opacity-40 hover:bg-[#FAFAFA] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
