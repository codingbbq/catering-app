import type { PaymentStatus } from "@catering/shared-types";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className = "" }: PaymentStatusBadgeProps) {
  switch (status) {
    case "allocated":
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
        >
          Fully Allocated
        </span>
      );
    case "partially_allocated":
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          Partially Allocated
        </span>
      );
    case "unallocated":
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F5F5F4] text-[#737373] border border-[#E5E5E5] ${className}`}
        >
          Unallocated
        </span>
      );
    case "void":
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-300 line-through ${className}`}
        >
          Void
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-50 text-neutral-600 border border-neutral-200 ${className}`}
        >
          {status}
        </span>
      );
  }
}
