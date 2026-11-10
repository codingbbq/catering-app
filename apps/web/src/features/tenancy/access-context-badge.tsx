import { StatusBadge } from "@/components/ui/status-badge";

type AccessContextBadgeProps = {
  scope: "platform" | "tenant";
  tenantSlug?: string | undefined;
};

export function AccessContextBadge({ scope, tenantSlug }: AccessContextBadgeProps) {
  const label =
    scope === "platform"
      ? "Platform Super Admin"
      : tenantSlug
        ? `Tenant: ${tenantSlug}`
        : "Tenant Workspace";

  return (
    <StatusBadge variant={scope === "platform" ? "neutral" : "info"} showDot={true}>
      {label}
    </StatusBadge>
  );
}
