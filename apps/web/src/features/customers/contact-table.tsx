"use client";

import type { CustomerContact } from "@catering/shared-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

const columnHelper = createColumnHelper<CustomerContact>();

interface ContactTableProps {
  data: CustomerContact[];
  onEditContact: (contact: CustomerContact) => void;
  onSetPrimary: (contact: CustomerContact) => void;
  isActionPending?: boolean;
}

export function ContactTable({
  data,
  onEditContact,
  onSetPrimary,
  isActionPending = false,
}: ContactTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Contact Person",
        cell: (info) => {
          const contact = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#171717]">{info.getValue()}</span>
              {contact.isPrimary && (
                <StatusBadge variant="neutral" showDot={false} className="text-[10px] px-1.5 py-0">
                  Primary
                </StatusBadge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("role", {
        header: "Designation / Role",
        cell: (info) => (
          <span className="text-xs text-[#262626]">
            {info.getValue() ?? <span className="text-[#A3A3A3] italic">—</span>}
          </span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-xs font-mono text-[#262626]">
            {info.getValue() ? (
              <a href={`mailto:${info.getValue()}`} className="hover:underline">
                {info.getValue()}
              </a>
            ) : (
              <span className="text-[#A3A3A3] italic">—</span>
            )}
          </span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => (
          <span className="text-xs text-[#262626]">
            {info.getValue() ? (
              <a href={`tel:${info.getValue()}`} className="hover:underline">
                {info.getValue()}
              </a>
            ) : (
              <span className="text-[#A3A3A3] italic">—</span>
            )}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => {
          const contact = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              {!contact.isPrimary && (
                <button
                  type="button"
                  onClick={() => onSetPrimary(contact)}
                  className="rounded border border-[#E5E5E5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors"
                  disabled={isActionPending}
                  title="Make this the primary contact"
                >
                  Set Primary
                </button>
              )}
              <button
                type="button"
                onClick={() => onEditContact(contact)}
                className="rounded border border-[#E5E5E5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#262626] hover:bg-[#F5F5F5] transition-colors"
                disabled={isActionPending}
              >
                Edit
              </button>
            </div>
          );
        },
      }),
    ],
    [isActionPending, onEditContact, onSetPrimary],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-2.5 px-4">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-xs text-[#737373]">
                  No contacts added yet.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2.5 px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
