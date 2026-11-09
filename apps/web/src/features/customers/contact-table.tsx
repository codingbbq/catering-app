"use client";

import type { CustomerContact } from "@catering/shared-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";

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
        header: "Name",
        cell: (info) => {
          const contact = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{info.getValue()}</span>
              {contact.isPrimary && (
                <span className="badge badge-primary badge-xs gap-1 font-semibold">
                  ★ Primary
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("role", {
        header: "Role / Title",
        cell: (info) => (
          <span className="text-sm">
            {info.getValue() ?? <span className="text-base-content/40 italic">Not set</span>}
          </span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-sm font-mono">
            {info.getValue() ? (
              <a
                href={`mailto:${info.getValue()}`}
                className="text-primary hover:underline"
              >
                {info.getValue()}
              </a>
            ) : (
              <span className="text-base-content/40 italic">None</span>
            )}
          </span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => (
          <span className="text-sm">
            {info.getValue() ? (
              <a
                href={`tel:${info.getValue()}`}
                className="text-primary hover:underline"
              >
                {info.getValue()}
              </a>
            ) : (
              <span className="text-base-content/40 italic">None</span>
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
                  className="btn btn-ghost btn-xs text-xs"
                  disabled={isActionPending}
                  title="Make this the primary contact"
                >
                  Make primary
                </button>
              )}
              <button
                type="button"
                onClick={() => onEditContact(contact)}
                className="btn btn-ghost btn-xs"
                disabled={isActionPending}
              >
                Edit
              </button>
            </div>
          );
        },
      }),
    ],
    [onEditContact, onSetPrimary, isActionPending],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-base-content/60">
        <p className="font-medium">No contacts added yet</p>
        <p className="text-xs text-base-content/50 mt-1">
          Add the primary organizer or billing representative for this customer.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-base-200 bg-base-100">
      <table className="table table-sm w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-base-200/50">
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`hover ${row.original.isPrimary ? "bg-primary/5" : ""}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
