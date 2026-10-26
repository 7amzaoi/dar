"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/shared/auth-shell";
import { Field } from "@/components/shared/field";
import { FadeIn } from "@/components/shared/motion";
import { homeFor, useAuth } from "@/lib/auth";
import type { User } from "@/lib/data";
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
  const { loginWithEmail } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    email: z.email(t("auth.errEmail")),
    password: z.string().min(8, t("auth.errPassword")),
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
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setFormError(code === "NO_USER" ? t("auth.errNoUser") : code === "VERIFY_EMAIL" ? t("auth.errVerifyEmail") : t("auth.errCredentials"));
    }
  });


  const { errors, isSubmitting } = form.formState;

  return (
    <FadeIn>
      <div className="eyebrow mb-4">{t("auth.loginEyebrow")}</div>
      <h1 className="display-lg">{t("auth.loginTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("auth.loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5" noValidate>
        <Field id="email" label={t("auth.email")} error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" spellCheck={false} dir="ltr" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...form.register("email")} />
        </Field>
        <Field id="password" label={t("auth.password")} error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" dir="ltr" aria-invalid={!!errors.password} {...form.register("password")} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
