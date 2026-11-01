import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="card w-full max-w-5xl bg-base-100 shadow-xl">
        <div className="card-body gap-8">
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className="badge badge-primary badge-outline">FND-001 Ready</span>
              <span className="badge badge-secondary badge-outline">IAM-001 Ready</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Catering SaaS Platform</h1>
            <p className="max-w-3xl text-base-content/70">
              Multi-tenant catering platform with tenant isolation, JWT authentication,
              session management, and platform/tenant route separation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Platform Admin</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Super Admin Console for platform oversight and tenant lifecycle management.
              </p>
              <div className="mt-4 flex gap-2">
                <Link className="btn btn-sm btn-secondary" href="/platform/sign-in">
                  Sign in
                </Link>
                <Link className="btn btn-sm btn-ghost" href="/platform">
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Tenant Access</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Tenant-scoped business workflows with authenticated user context.
              </p>
              <div className="mt-4 flex gap-2">
                <Link className="btn btn-sm btn-primary" href="/tenant/demo-catering/sign-in">
                  Sign in
                </Link>
                <Link className="btn btn-sm btn-ghost" href="/tenant/demo-catering">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-base-300 p-5 text-sm text-base-content/70">
            <p className="font-medium text-base-content">Auth flows available:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Platform and tenant sign-in with JWT tokens</li>
              <li>Token refresh and session management</li>
              <li>Invitation-based tenant user onboarding</li>
              <li>Password forgot and reset</li>
              <li>Protected route enforcement via access-scope guards</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
