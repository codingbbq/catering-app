import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="card w-full max-w-5xl bg-base-100 shadow-xl">
        <div className="card-body gap-8">
          <div className="space-y-4">
            <span className="badge badge-primary badge-outline">FND-001 Ready</span>
            <h1 className="text-4xl font-semibold tracking-tight">Tenant isolation foundation</h1>
            <p className="max-w-3xl text-base-content/70">
              The workspace now separates platform and tenant route shells, shared tenancy
              contracts, and foundational API guardrails before business modules are introduced.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Platform shell</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Reserved for Super Admin capabilities and tenant lifecycle operations.
              </p>
              <Link className="btn btn-sm btn-secondary mt-4" href="/platform">
                Open platform shell
              </Link>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Tenant shell</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Reserved for tenant-scoped business workflows with explicit tenant context.
              </p>
              <Link className="btn btn-sm btn-primary mt-4" href="/tenant/demo-catering">
                Open tenant shell
              </Link>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Shared guardrails</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Shared contracts, Prisma tenant models, and NestJS access-scope enforcement.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-base-300 p-5 text-sm text-base-content/70">
            Next steps are to connect authentication and tenant membership on top of these
            boundaries before business-domain features are implemented.
          </div>
        </div>
      </section>
    </main>
  );
}
