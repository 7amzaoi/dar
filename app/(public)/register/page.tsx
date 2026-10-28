"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Check, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AuthShell } from "@/components/shared/auth-shell";
import { Field } from "@/components/shared/field";
import { ArrowBack, ArrowForward } from "@/components/shared/icons";
import { FadeIn } from "@/components/shared/motion";
import { homeFor, useAuth, type RegisterInput } from "@/lib/auth";
import en from "@/lib/i18n/en";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = Object.keys(en.countries);

export default function RegisterPage() {
  const { t, country } = useT();
  const router = useRouter();
  const { startRegistration, resendRegistrationCode, completeRegistration } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState<string | null>(null);
  /** details kept while the emailed code is being entered (step 3) */
  const [pending, setPending] = useState<RegisterInput | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const schema = z.object({
    role: z.enum(["manufacturer", "retailer"]),
    companyName: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
    contactName: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
    email: z.email(t("auth.errEmail")),
    password: z.string().min(8, t("auth.errPassword")),
    country: z.string().min(1, t("auth.errRequired")),
    city: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
    phone: z.string().trim().min(6, t("auth.errMin", { n: 6 })),
    whatsapp: z.string().trim().refine((v) => v === "" || /^\+?[\d\s()-]{8,}$/.test(v), t("whatsapp.errNumber")),
    about: z.string().trim().min(20, t("auth.errMin", { n: 20 })),
    agree: z.boolean().refine((v) => v, t("auth.errAgree")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: "retailer", companyName: "", contactName: "", email: "", password: "", country: "", city: "", phone: "", whatsapp: "", about: "", agree: false },
  });
  const { errors, isSubmitting } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  const messageFor = (failure: unknown) => {
    const reason = failure instanceof Error ? failure.message : "";
    if (reason === "EMAIL_TAKEN") return t("auth.errEmailTaken");
    if (reason === "VERIFY_EMAIL") return t("auth.errVerifyEmail");
    if (reason === "WEAK_PASSWORD") return t("auth.errPassword");
    if (reason === "INVALID_CODE") return t("auth.errCodeInvalid");
    if (reason === "RATE_LIMITED") return t("auth.errTooManyAttempts");
    return t("common.errorBody");
  };

  const onSubmit = form.handleSubmit(async ({ agree, ...values }) => {
    void agree;
    setFormError(null);
    try {
      // an identity that already has an account (seeded, or a finished sign-up) needs no code
      const existing = await startRegistration(values);
      if (existing) {
        router.push(homeFor(existing));
        return;
      }
      setPending(values);
      setCode("");
      setCodeError(null);
      setStep(3);
    } catch (e) {
      setFormError(messageFor(e));
    }
  });

  const onVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    if (!/^d{6}$/.test(code.trim())) {
      setCodeError(t("auth.errCodeFormat"));
      return;
    }
    setCodeError(null);
    setVerifying(true);
    try {
      router.push(homeFor(await completeRegistration(pending, code.trim())));
    } catch (e) {
      setCodeError(messageFor(e));
    } finally {
      setVerifying(false);
    }
  };

  const roles = [
    { value: "retailer" as const, icon: Building2, title: t("auth.roleRetailer"), body: t("auth.roleRetailerBody") },
    { value: "manufacturer" as const, icon: Factory, title: t("auth.roleManufacturer"), body: t("auth.roleManufacturerBody") },
  ];

  const err = (k: keyof Values) => errors[k]?.message;

  return (
    <AuthShell
      image="/images/photos/scenes/collection-atrium.webp"
      caption={<p className="max-w-sm font-display text-3xl leading-snug">{t("landing.ctaBody")}</p>}
    >
      <FadeIn>
        <div className="eyebrow mb-4">{t("auth.registerEyebrow")}</div>
        <h1 className="display-lg">{t("auth.registerTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("auth.registerSubtitle")}</p>

        <ol className="mt-8 flex items-center gap-3 text-xs" aria-label="Steps">
          {[t("auth.step1"), t("auth.step2"), t("auth.step3")].map((label, i, all) => {
            const n = (i + 1) as 1 | 2 | 3;
            const done = step > n;
            return (
              <li key={label} className="flex items-center gap-2" aria-current={step === n ? "step" : undefined}>
                <span className={cn("inline-flex size-6 items-center justify-center rounded-full border text-[0.7rem]", step >= n ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>
                  {done ? <Check className="size-3" /> : n}
                </span>
                <span className={step === n ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                {i < all.length - 1 && <span className="mx-1 h-px w-8 bg-border" aria-hidden />}
              </li>
            );
          })}
        </ol>

        {step === 3 && pending ? (
          <form onSubmit={onVerify} className="mt-8 space-y-5" noValidate>
            <p className="text-muted-foreground" aria-live="polite">
              {t("auth.verifySent", { email: pending.email })}
            </p>
            <Field id="code" label={t("auth.forgotCode")} error={codeError ?? undefined}>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
                className="tracking-[0.4em] tabular-nums"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={!!codeError}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={verifying}>
              {verifying ? t("common.saving") : t("auth.verifyCta")}
            </Button>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => resendRegistrationCode(pending.email).then(() => setCodeError(null), (e) => setCodeError(messageFor(e)))}
              >
                {t("auth.forgotResend")}
              </button>
              <button type="button" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setStep(2)}>
                {t("auth.verifyChangeEmail")}
              </button>
            </div>
          </form>
        ) : (
        <form onSubmit={onSubmit} className="mt-8" noValidate>
          {step === 1 ? (
            <fieldset>
              <legend className="mb-4 text-sm font-medium">{t("auth.roleQuestion")}</legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {roles.map((r) => {
                  const active = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => form.setValue("role", r.value)}
                      className={cn(
                        "flex flex-col items-start gap-3 rounded-[1.5rem] border p-5 text-start transition-[border-color,background-color,box-shadow]",
                        active ? "border-foreground bg-surface shadow-soft" : "border-border hover:border-foreground/40",
                      )}
                    >
                      <span className="flex w-full items-center justify-between">
                        <r.icon className="size-6 text-brand-strong" strokeWidth={1.3} />
                        <span className={cn("inline-flex size-5 items-center justify-center rounded-full border", active ? "border-foreground bg-foreground text-background" : "border-border")}>
                          {active && <Check className="size-3" />}
                        </span>
                      </span>
                      <span className="font-display text-xl">{r.title}</span>
                      <span className="text-sm text-muted-foreground">{r.body}</span>
                    </button>
                  );
                })}
              </div>
              <Button type="button" size="lg" className="mt-8 w-full" onClick={() => setStep(2)}>
                {t("common.confirm")} <ArrowForward className="size-4" />
              </Button>
            </fieldset>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="companyName" label={t("auth.companyName")} error={err("companyName")}>
                  <Input id="companyName" autoComplete="organization" aria-invalid={!!errors.companyName} {...form.register("companyName")} />
                </Field>
                <Field id="contactName" label={t("auth.contactName")} error={err("contactName")}>
                  <Input id="contactName" autoComplete="name" aria-invalid={!!errors.contactName} {...form.register("contactName")} />
                </Field>
              </div>
              <Field id="email" label={t("auth.email")} error={err("email")}>
                <Input id="email" type="email" autoComplete="email" spellCheck={false} dir="ltr" aria-invalid={!!errors.email} {...form.register("email")} />
              </Field>
              <Field id="password" label={t("auth.password")} error={err("password")} hint={t("auth.passwordHint")}>
                <Input id="password" type="password" autoComplete="new-password" dir="ltr" aria-invalid={!!errors.password} {...form.register("password")} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field id="country" label={t("auth.country")} error={err("country")}>
                  <Controller
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="country" className="w-full" aria-invalid={!!errors.country}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c} value={c}>{country(c)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field id="city" label={t("auth.city")} error={err("city")}>
                  <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...form.register("city")} />
                </Field>
                <Field id="phone" label={t("auth.phone")} error={err("phone")}>
                  <Input id="phone" type="tel" autoComplete="tel" dir="ltr" aria-invalid={!!errors.phone} {...form.register("phone")} />
                </Field>
              </div>
              <Field id="whatsapp" label={t("whatsapp.number")} optionalLabel={t("common.optional")} error={err("whatsapp")} hint={t("whatsapp.numberHint")}>
                <Input id="whatsapp" type="tel" autoComplete="tel" dir="ltr" placeholder="+966 55 123 4567" aria-invalid={!!errors.whatsapp} {...form.register("whatsapp")} />
              </Field>
              <Field id="about" label={t("auth.about")} error={err("about")}>
                <Textarea id="about" rows={4} placeholder={t("auth.aboutPlaceholder")} aria-invalid={!!errors.about} {...form.register("about")} />
              </Field>
              <Controller
                control={form.control}
                name="agree"
                render={({ field }) => (
                  <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" aria-invalid={!!errors.agree} />
                      <span className="text-muted-foreground">{t("auth.agree")}</span>
                    </label>
                    {errors.agree && <p role="alert" className="mt-2 text-xs text-destructive">{errors.agree.message}</p>}
                  </div>
                )}
              />
              {formError && (
                <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {formError}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
                  <ArrowBack className="size-4" /> {t("common.back")}
                </Button>
                <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? t("common.saving") : t("auth.submit")}
                </Button>
              </div>
            </div>
          )}
        </form>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("common.signIn")}
          </Link>
        </p>
      </FadeIn>
    </AuthShell>
  );
}
