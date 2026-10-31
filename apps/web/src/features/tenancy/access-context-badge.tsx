type AccessContextBadgeProps = {
  scope: 'platform' | 'tenant';
  tenantSlug?: string | undefined;
};

export function AccessContextBadge({ scope, tenantSlug }: AccessContextBadgeProps) {
  const label = scope === 'platform' ? 'Platform Context' : `Tenant Context${tenantSlug ? `: ${tenantSlug}` : ''}`;
  const className =
    scope === 'platform'
      ? 'badge badge-secondary badge-outline'
      : 'badge badge-primary badge-outline';

  return <span className={className}>{label}</span>;
}
