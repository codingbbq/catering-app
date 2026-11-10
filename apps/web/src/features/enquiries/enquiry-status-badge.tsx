import type { EnquiryStatus } from "@catering/shared-types";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";

interface EnquiryStatusBadgeProps {
  status: EnquiryStatus;
  className?: string | undefined;
}

const STATUS_CONFIG: Record<EnquiryStatus, { label: string; variant: StatusVariant }> = {
  new: { label: "New", variant: "info" },
  qualified: { label: "Qualified", variant: "success" },
  proposal_sent: { label: "Proposal Sent", variant: "warning" },
  converted: { label: "Converted", variant: "success" },
  lost: { label: "Lost", variant: "error" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

export function EnquiryStatusBadge({ status, className }: EnquiryStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "neutral" };
  return (
    <StatusBadge variant={config.variant} className={className ?? ""}>
      {config.label}
    </StatusBadge>
  );
}
