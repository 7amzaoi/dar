import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:gap-6 md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
        <h2 className="display-md">{title}</h2>
        {body && <p className="mt-4 max-w-xl text-muted-foreground">{body}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
