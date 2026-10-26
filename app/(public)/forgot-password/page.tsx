"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/shared/auth-shell";
import { Field } from "@/components/shared/field";
import { FadeIn } from "@/components/shared/motion";
import { authClient, homeFor, useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

/**
 * Password reset with a 6-digit email code (Neon Auth email OTP). Codes work on Neon's shared
 * SMTP sender; reset links would need custom SMTP. Step 1 asks for the email, step 2 for the
 * code and the new password, then the member is signed in with it.
 */

function ErrorNote({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {children}
    </p>
  );
}

export default function ForgotPasswordPage() {
  const { t } = useT();
  const router = useRouter();
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errorFor = (code: string) =>
    /INVALID_OTP|OTP_EXPIRED|invalid otp|expired/i.test(code)
      ? t("auth.errCodeInvalid")
      : /TOO_MANY|too many|RATE_LIMITED|429/i.test(code)
        ? t("auth.errTooManyAttempts")
        : /PASSWORD/i.test(code)
          ? t("auth.errPassword")
          : t("common.errorBody");

  /** The Neon client sometimes returns `{ error }` and sometimes throws an AuthApiError; this yields the code either way. */
  const attempt = async (call: () => Promise<{ error?: { code?: string; message?: string } | null }>) => {
    try {
      const { error } = await call();
      return error ? `${error.code ?? ""} ${error.message ?? ""}`.trim() || "ERROR" : null;
    } catch (e) {
      // the thrown AuthApiError carries its own generic code; the server's reason is in the message
      const err = e as { code?: string; message?: string };
      return `${err.code ?? ""} ${err.message ?? ""}`.trim() || "ERROR";
    }
  };

  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.email(t("auth.errEmail")) })),
    defaultValues: { email: "" },
  });

  const resetSchema = z
    .object({
      otp: z.string().trim().regex(/^\d{6}$/, t("auth.errCodeFormat")),
      password: z.string().min(8, t("auth.errPassword")),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("auth.errPasswordMatch") });
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { otp: "", password: "", confirm: "" } });

  const sendCode = async (address: string) => {
    setFormError(null);
    // Neon Auth answers "sent" even for unknown emails, so check first and say so plainly.
    const check = await fetch("/api/account-exists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: address }) })
      .then((r) => (r.ok ? (r.json() as Promise<{ exists: boolean }>) : null))
      .catch(() => null);
    if (!check) {
      setFormError(t("auth.errTooManyAttempts"));
      return;
    }
    if (!check.exists) {
      emailForm.setError("email", { message: t("auth.errNoAccountEmail") });
      return;
    }
    const failed = await attempt(() => authClient.emailOtp.sendVerificationOtp({ email: address, type: "forget-password" }));
    if (failed) {
      setFormError(errorFor(failed));
      return;
    }
    setEmail(address);
  };

  const onSend = emailForm.handleSubmit(({ email: address }) => sendCode(address.trim().toLowerCase()));

  const onReset = resetForm.handleSubmit(async ({ otp, password }) => {
    if (!email) return;
    setFormError(null);
    const failed = await attempt(() => authClient.emailOtp.resetPassword({ email, otp, password }));
    if (failed) {
      setFormError(errorFor(failed));
      return;
    }
    toast.success(t("auth.forgotDone"));
    try {
      router.push(homeFor(await loginWithEmail(email, password)));
    } catch {
      // password changed, but no marketplace account to open: send them to sign in
      router.push("/login");
    }
  });

  return (
    <AuthShell image="/images/scenes/hero-dining.svg" caption={<p className="max-w-sm font-display text-3xl leading-snug">{t("landing.title")}</p>}>
      <FadeIn>
        <div className="eyebrow mb-4">{t("auth.forgotEyebrow")}</div>
        <h1 className="display-lg">{t("auth.forgotTitle")}</h1>

        {!email ? (
          <>
            <p className="mt-3 text-muted-foreground">{t("auth.forgotSubtitle")}</p>
            <form onSubmit={onSend} className="mt-10 space-y-5" noValidate>
              <Field id="email" label={t("auth.email")} error={emailForm.formState.errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" spellCheck={false} dir="ltr" aria-invalid={!!emailForm.formState.errors.email} {...emailForm.register("email")} />
              </Field>
              <ErrorNote>{formError}</ErrorNote>
              <Button type="submit" size="lg" className="w-full" disabled={emailForm.formState.isSubmitting}>
                {emailForm.formState.isSubmitting ? t("common.loading") : t("auth.forgotSendCta")}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-muted-foreground" aria-live="polite">
              {t("auth.forgotCodeSent", { email })}
            </p>
            <form onSubmit={onReset} className="mt-10 space-y-5" noValidate>
              <Field id="otp" label={t("auth.forgotCode")} error={resetForm.formState.errors.otp?.message}>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  dir="ltr"
                  className="tracking-[0.4em] tabular-nums"
                  aria-invalid={!!resetForm.formState.errors.otp}
                  {...resetForm.register("otp")}
                />
              </Field>
              <Field id="password" label={t("auth.forgotNewPassword")} error={resetForm.formState.errors.password?.message} hint={t("auth.passwordHint")}>
                <Input id="password" type="password" autoComplete="new-password" dir="ltr" aria-invalid={!!resetForm.formState.errors.password} {...resetForm.register("password")} />
              </Field>
              <Field id="confirm" label={t("auth.forgotConfirmPassword")} error={resetForm.formState.errors.confirm?.message}>
                <Input id="confirm" type="password" autoComplete="new-password" dir="ltr" aria-invalid={!!resetForm.formState.errors.confirm} {...resetForm.register("confirm")} />
              </Field>
              <ErrorNote>{formError}</ErrorNote>
              <Button type="submit" size="lg" className="w-full" disabled={resetForm.formState.isSubmitting}>
                {resetForm.formState.isSubmitting ? t("common.loading") : t("auth.forgotResetCta")}
              </Button>
            </form>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => void sendCode(email)}>
                {t("auth.forgotResend")}
              </button>
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => {
                  setEmail(null);
                  setFormError(null);
                  resetForm.reset();
                }}
              >
                {t("auth.forgotChangeEmail")}
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("auth.forgotBackToLogin")}
          </Link>
        </p>
      </FadeIn>
    </AuthShell>
  );
}
