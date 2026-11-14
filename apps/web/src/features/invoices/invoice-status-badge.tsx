import type { InvoiceStatus } from "@catering/shared-types";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  isOverdue?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: StatusVariant }
> = {
  draft: { label: "Draft", variant: "neutral" },
  issued: { label: "Issued", variant: "info" },
  partially_paid: { label: "Partially Paid", variant: "warning" },
  paid: { label: "Paid in Full", variant: "success" },
  void: { label: "Void", variant: "error" },
};

export function InvoiceStatusBadge({
  status,
  isOverdue,
  className,
}: InvoiceStatusBadgeProps) {
  if (isOverdue && (status === "issued" || status === "partially_paid")) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <StatusBadge variant="error" className={className ?? ""}>
          Overdue
        </StatusBadge>
        {status === "partially_paid" && (
          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            Partial
          </span>
        )}
      </div>
    );
  }

  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "neutral",
  };

  return (
    <StatusBadge variant={config.variant} className={className ?? ""}>
      {config.label}
    </StatusBadge>
  );
}
