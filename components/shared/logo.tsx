import Link from "next/link";
import { cn } from "@/lib/utils";

/** Dār wordmark: Latin + Arabic set together, with a brass macron mark. */
export function Logo({ className, href = "/", compact = false }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-baseline gap-2 text-foreground", className)} aria-label="Dār — home">
      <span className="font-display text-[1.7rem] leading-none tracking-tight" lang="en">
        D<span className="relative">ā<span className="absolute inset-x-[0.08em] top-[0.18em] h-[0.06em] bg-brass" aria-hidden /></span>r
      </span>
      {!compact && (
        <span className="font-display text-lg leading-none text-muted-foreground transition-colors group-hover:text-brass-deep" lang="ar">
          دار
        </span>
      )}
    </Link>
  );
}

/** Monogram used in place of company logos. */
export function CompanyMark({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-surface font-display text-lg text-brass-deep",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
