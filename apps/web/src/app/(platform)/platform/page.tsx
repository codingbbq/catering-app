import { AccessContextPanel } from '@/features/tenancy/access-context-panel';

export default function PlatformPage() {
  return (
    <AccessContextPanel
      title="Platform access boundary"
      description="This shell is reserved for SaaS-operator capabilities such as tenant lifecycle management and platform oversight. Tenant business workflows should not be mounted here."
      scope="platform"
      details={[
        'Platform routes are separated from tenant-facing routes.',
        'Super Admin features should never depend on tenant-scoped navigation state.',
        'Future tenant onboarding and suspension controls belong inside this shell.',
        'Authentication will later determine which users can reach this context.',
      ]}
    />
  );
}
