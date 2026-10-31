import { AccessContextPanel } from '@/features/tenancy/access-context-panel';

export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <AccessContextPanel
      title="Tenant access boundary"
      description="This shell is reserved for tenant business workflows. Every future customer, enquiry, quotation, booking, finance, and operations screen should execute inside a resolved tenant context."
      scope="tenant"
      tenantSlug={tenantSlug}
      details={[
        'Tenant business data must never cross tenant boundaries.',
        'Tenant-aware API calls will require explicit tenant context enforcement.',
        'Platform oversight should stay outside this route tree.',
        'Future auth will validate tenant membership before rendering this shell.',
      ]}
    />
  );
}
