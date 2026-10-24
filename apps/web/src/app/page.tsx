export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="card w-full max-w-5xl bg-base-100 shadow-xl">
        <div className="card-body gap-8">
          <div className="space-y-4">
            <span className="badge badge-primary badge-outline">Scaffold Ready</span>
            <h1 className="text-4xl font-semibold tracking-tight">Catering SaaS monorepo baseline</h1>
            <p className="max-w-3xl text-base-content/70">
              This workspace is prepared for a multi-tenant catering platform with independent
              Next.js and NestJS applications, shared Zod contracts, Prisma, and core developer
              tooling.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Frontend</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Next.js App Router, Tailwind CSS, daisyUI, TanStack Query, Form, and Table.
              </p>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Backend</h2>
              <p className="mt-2 text-sm text-base-content/70">
                NestJS with Prisma and PostgreSQL-ready configuration without assuming a running
                database.
              </p>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-200 p-5">
              <h2 className="text-lg font-medium">Shared packages</h2>
              <p className="mt-2 text-sm text-base-content/70">
                Shared types, central TypeScript presets, and reusable lint configuration.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-base-300 p-5 text-sm text-base-content/70">
            Next steps are to finish installation, validate lint and typecheck, and then begin
            domain-by-domain feature design.
          </div>
        </div>
      </section>
    </main>
  );
}
