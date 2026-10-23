"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Free-form tags with quick-pick suggestions (e.g. materials, colours). */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  labelFor = (v) => v,
  invalid,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  labelFor?: (v: string) => string;
  invalid?: boolean;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setDraft("");
  };

  const unused = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-2.5">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          invalid ? "border-destructive" : "border-input",
        )}
      >
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
            {labelFor(v)}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`${t("common.remove")} ${labelFor(v)}`} className="text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : t("mfr.tagPlaceholder")}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          aria-invalid={invalid}
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground">
              + {labelFor(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
