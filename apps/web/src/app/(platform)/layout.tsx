import type { ReactNode } from 'react';
import { AccessContextBadge } from '@/features/tenancy/access-context-badge';
import { UserNav } from '@/features/auth/user-nav';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-base-300 bg-base-100/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-base-content/60">Catering SaaS Platform</p>
              <h1 className="text-xl font-semibold">Super Admin Console</h1>
            </div>
            <AccessContextBadge scope="platform" />
          </div>
          <UserNav signInHref="/platform/sign-in" />
        </div>
      </header>
      <main className="flex flex-1 px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
