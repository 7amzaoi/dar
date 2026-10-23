"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/data";

/**
 * Client-side route guard for the mock role.
 * TODO(backend): enforce on the server too (proxy.ts / layout-level session check);
 * a client guard alone is not a security boundary.
 */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { ready, currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = ready && currentUser?.role === role && currentUser.status === "approved";

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (currentUser.status !== "approved") router.replace("/pending-approval");
    else if (currentUser.role !== role) router.replace(homeFor(currentUser));
  }, [ready, currentUser, role, router, pathname]);

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy>
        <div className="flex flex-col items-center gap-4 opacity-70">
          <Logo href="#" />
          <span className="h-px w-24 overflow-hidden bg-border">
            <span className="block h-full w-1/3 animate-[shimmer_1.2s_ease-in-out_infinite] bg-brand" />
          </span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
