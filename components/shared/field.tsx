import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + hint/error, wired for accessibility. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
  optionalLabel,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  optionalLabel?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[0.8rem] font-medium">
        <span>{label}</span>
        {optionalLabel && <span className="text-xs font-normal text-muted-foreground">{optionalLabel}</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
