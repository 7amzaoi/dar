"use client";

import { ErrorState } from "@/components/shared/states";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-page py-16 sm:py-24">
      <ErrorState onRetry={reset} />
    </main>
  );
}
