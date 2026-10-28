"use client";

import type { ReactNode } from "react";
import { AlertTriangle, type LucideIcon, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import type { QueryResult } from "@/lib/hooks/use-query";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border px-5 py-12 text-center sm:px-6 sm:py-16", className)}>
      <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-secondary text-brand-strong">
        <Icon className="size-6" strokeWidth={1.4} />
      </span>
      <h3 className="font-display text-2xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, className, message }: { onRetry?: () => void; className?: string; message?: string }) {
  const { t } = useT();
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-[1.5rem] border border-destructive/30 bg-destructive/5 px-5 py-10 text-center sm:px-6 sm:py-14", className)}>
      <AlertTriangle className="mb-4 size-7 text-destructive" strokeWidth={1.4} />
      <h3 className="font-display text-2xl">{t("common.errorTitle")}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message ?? t("common.errorBody")}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3", className)} aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-[1.5rem]" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/**
 * Renders loading / error / empty / data states for a query in one place.
 */
export function QueryView<T>({
  query,
  loading,
  empty,
  isEmpty = (d) => Array.isArray(d) && d.length === 0,
  children,
}: {
  query: QueryResult<T>;
  loading: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.error) return <ErrorState onRetry={query.reload} />;
  if (query.loading || query.data === undefined) return <>{loading}</>;
  if (empty && isEmpty(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
