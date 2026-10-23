"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { homeFor, useAuth } from "@/lib/auth";
import { resetDemoData, type Role } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Floating dev-only control to preview the app as any role.
 * Rendered only when NODE_ENV === "development" (see Providers).
 * TODO(backend): delete together with the mock auth.
 */
export function DevRoleSwitcher() {
  const { t } = useT();
  const router = useRouter();
  const { currentUser, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const active: Role | "guest" = currentUser?.role ?? "guest";

  const choose = async (role: Role | "guest") => {
    if (role === "guest") {
      logout();
      router.push("/");
    } else {
      const user = await login(role);
      router.push(homeFor(user));
    }
    setOpen(false);
  };

  const options: (Role | "guest")[] = ["guest", "retailer", "manufacturer", "admin"];

  return (
    <div className="fixed bottom-5 end-5 z-[60] print:hidden">
      {open ? (
        <div className="w-64 rounded-3xl border border-border bg-popover p-3 text-popover-foreground shadow-lift">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <div className="text-xs font-medium">{t("dev.title")}</div>
              <div className="text-[0.65rem] text-muted-foreground">{t("dev.devOnly")}</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={t("common.close")}>
              <X className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {options.map((r) => (
              <button
                key={r}
                onClick={() => choose(r)}
                className={cn(
                  "rounded-full border px-2 py-2 text-xs transition-colors",
                  active === r ? "border-brand bg-brand/10 text-brand-strong" : "border-border hover:bg-muted",
                )}
              >
                {t(`status.role.${r}`)}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              resetDemoData();
              toast.success(t("dev.resetDone"));
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[0.7rem] text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="size-3" />
            {t("dev.reset")}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-popover/95 px-3.5 py-2 text-xs shadow-lift backdrop-blur hover:border-brand"
          aria-label={t("dev.title")}
        >
          <FlaskConical className="size-3.5 text-brand-strong" />
          <span className="text-muted-foreground">{t("dev.title")}:</span>
          <span className="font-medium">{t(`status.role.${active}`)}</span>
        </button>
      )}
    </div>
  );
}
