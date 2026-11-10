import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] bg-white p-12 text-center">
      {icon ? (
        <div className="mb-3 text-[#737373]">{icon}</div>
      ) : (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#171717]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-[#737373]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
