import type { CommunicationStatus } from "@catering/shared-types";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";

const STATUS_CONFIG: Record<
  CommunicationStatus,
  { label: string; variant: StatusVariant }
> = {
  draft: { label: "Draft", variant: "info" },
  pending: { label: "Pending", variant: "warning" },
  sent: { label: "Sent", variant: "neutral" },
  delivered: { label: "Delivered", variant: "success" },
  failed: { label: "Failed", variant: "error" },
};

export function CommunicationStatusBadge({
  status,
  className = "",
}: {
  status: CommunicationStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "neutral" as StatusVariant,
  };

  return (
    <StatusBadge variant={config.variant} className={className}>
      {config.label}
    </StatusBadge>
  );
}
