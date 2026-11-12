import type { BookingStatus } from "@catering/shared-types";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string | undefined;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: StatusVariant }
> = {
  draft: { label: "Draft / Unconfirmed", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "success" },
  in_progress: { label: "In Progress", variant: "info" },
  completed: { label: "Completed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "error" },
};

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
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
