import type { QuotationStatus, RevisionStatus } from "@catering/shared-types";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";

interface QuotationStatusBadgeProps {
  status: QuotationStatus | RevisionStatus;
  className?: string | undefined;
}

const STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; variant: StatusVariant }
> = {
  draft: { label: "Draft", variant: "neutral" },
  sent: { label: "Sent to Client", variant: "info" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
  expired: { label: "Expired", variant: "warning" },
  superseded: { label: "Superseded", variant: "neutral" },
};

export function QuotationStatusBadge({ status, className }: QuotationStatusBadgeProps) {
  const config = STATUS_CONFIG[status as QuotationStatus] ?? {
    label: status,
    variant: "neutral",
  };

  return (
    <StatusBadge variant={config.variant} className={className ?? ""}>
      {config.label}
    </StatusBadge>
  );
}
