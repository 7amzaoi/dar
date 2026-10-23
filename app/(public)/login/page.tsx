"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Factory, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/shared/auth-shell";
import { Field } from "@/components/shared/field";
import { ArrowForward } from "@/components/shared/icons";
import { FadeIn } from "@/components/shared/motion";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role, User } from "@/lib/data";
import { useT } from "@/lib/i18n";

function safeNext(next: string | null, user: User) {
  // only follow same-site paths that match the signed-in role's area (or public pages)
  if (!next || !next.startsWith("/") || next.startsWith("//")) return homeFor(user);
  const area = next.split("/")[1];
  if (["manufacturer", "retailer", "admin"].includes(area) && area !== user.role) return homeFor(user);
  return user.status === "pending" ? "/pending-approval" : next;
}

function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { login, loginWithEmail } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    email: z.email(t("auth.errEmail")),
    password: z.string().min(6, t("auth.errPassword")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const finish = (user: User) => {
    if (user.status === "suspended") {
      setFormError(`${t("auth.suspendedTitle")} ${t("auth.suspendedBody")}`);
      return;
    }
    router.push(safeNext(next, user));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      finish(await loginWithEmail(values.email, values.password));
    } catch {
      setFormError(t("auth.errNoUser"));
    }
  });

  const demos: { role: Role; icon: typeof Factory; title: string; body: string }[] = [
    { role: "retailer", icon: Building2, title: t("auth.demoRetailer"), body: t("auth.demoRetailerBody") },
    { role: "manufacturer", icon: Factory, title: t("auth.demoManufacturer"), body: t("auth.demoManufacturerBody") },
    { role: "admin", icon: ShieldCheck, title: t("auth.demoAdmin"), body: t("auth.demoAdminBody") },
  ];

  const { errors, isSubmitting } = form.formState;

  return (
    <FadeIn>
      <div className="eyebrow mb-4">{t("auth.loginEyebrow")}</div>
      <h1 className="display-lg">{t("auth.loginTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("auth.loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5" noValidate>
        <Field id="email" label={t("auth.email")} error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" dir="ltr" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...form.register("email")} />
        </Field>
        <Field id="password" label={t("auth.password")} error={errors.password?.message} hint={t("auth.passwordHint")}>
          <Input id="password" type="password" autoComplete="current-password" dir="ltr" aria-invalid={!!errors.password} {...form.register("password")} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("common.loading") : t("auth.loginCta")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("common.register")}
        </Link>
      </p>

      {/* TODO(backend): remove demo sign-in once real auth is wired. */}
      <div className="mt-12 border-t border-hairline pt-8">
        <h2 className="font-display text-xl">{t("auth.demoTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.demoBody")}</p>
        <div className="mt-5 grid gap-2.5">
          {demos.map((d) => (
            <button
              key={d.role}
              type="button"
              onClick={async () => finish(await login(d.role))}
              className="group flex items-center gap-4 rounded-md border border-border bg-surface px-4 py-3.5 text-start transition-all hover:border-brass/60 hover:shadow-soft"
            >
              <d.icon className="size-5 shrink-0 text-brass-deep" strokeWidth={1.4} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{d.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{d.body}</span>
              </span>
              <ArrowForward className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

export default function LoginPage() {
  const { t } = useT();
  return (
    <AuthShell
      image="/images/scenes/hero-dining.svg"
      caption={<p className="max-w-sm font-display text-3xl leading-snug">{t("landing.title")}</p>}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
