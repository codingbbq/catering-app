import { AccessContextBadge } from './access-context-badge';

type AccessContextPanelProps = {
  title: string;
  description: string;
  scope: 'platform' | 'tenant';
  tenantSlug?: string | undefined;
  details: string[];
};

export function AccessContextPanel({
  title,
  description,
  scope,
  tenantSlug,
  details,
}: AccessContextPanelProps) {
  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body gap-6">
        <div className="space-y-3">
          <AccessContextBadge scope={scope} tenantSlug={tenantSlug} />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-3xl text-base-content/70">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail} className="rounded-2xl border border-base-300 bg-base-200 p-4 text-sm text-base-content/80">
              {detail}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
