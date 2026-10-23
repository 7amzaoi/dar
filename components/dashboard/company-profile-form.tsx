"use client";

import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/dashboard/widgets";
import { Field } from "@/components/shared/field";
import { CompanyMark } from "@/components/shared/logo";
import { db, type Company } from "@/lib/data";
import { useT } from "@/lib/i18n";
import en from "@/lib/i18n/en";

const COUNTRY_CODES = Object.keys(en.countries);

export function CompanyProfileForm({ company }: { company: Company }) {
  const { t, country, city } = useT();
  const schema = z.object({
    name: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
    phone: z.string().trim().min(6, t("auth.errMin", { n: 6 })),
    country: z.string().min(1, t("auth.errRequired")),
    city: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
    about: z.string().trim().min(20, t("auth.errMin", { n: 20 })),
    aboutEn: z.string().trim(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: company.name, phone: company.phone, country: company.country, city: company.city, about: company.about, aboutEn: company.aboutEn ?? "" },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const live = useWatch({ control: form.control });

  const onSubmit = form.handleSubmit(async (v) => {
    // TODO(backend): logo upload + server-side validation of company edits.
    const saved = await db.companies.update(company.id, { ...v, aboutEn: v.aboutEn || undefined });
    form.reset({ ...v, aboutEn: saved.aboutEn ?? "" });
    toast.success(t("mfr.profileSaved"));
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <form onSubmit={onSubmit} noValidate>
        <Panel>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="name" label={t("mfr.companyName")} error={errors.name?.message}>
                <Input id="name" aria-invalid={!!errors.name} {...form.register("name")} />
              </Field>
              <Field id="phone" label={t("auth.phone")} error={errors.phone?.message}>
                <Input id="phone" type="tel" dir="ltr" aria-invalid={!!errors.phone} {...form.register("phone")} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="country" label={t("auth.country")} error={errors.country?.message}>
                <Controller
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="country" className="w-full">
                        <SelectValue />
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
              <Field id="city" label={t("auth.city")} error={errors.city?.message}>
                <Input id="city" aria-invalid={!!errors.city} {...form.register("city")} />
              </Field>
            </div>
            <Field id="about" label={t("mfr.aboutAr")} error={errors.about?.message}>
              <Textarea id="about" dir="rtl" rows={5} aria-invalid={!!errors.about} {...form.register("about")} />
            </Field>
            <Field id="aboutEn" label={t("mfr.aboutEn")} optionalLabel={t("common.optional")}>
              <Textarea id="aboutEn" dir="ltr" rows={5} {...form.register("aboutEn")} />
            </Field>
          </div>
          <div className="mt-8 flex justify-end gap-2 border-t border-hairline pt-5">
            <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => form.reset()}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? t("common.saving") : t("common.saveChanges")}
            </Button>
          </div>
        </Panel>
      </form>

      <div className="space-y-4">
        <Panel>
          <CompanyMark name={live.name || company.name} className="size-16 text-2xl" />
          <div className="mt-5 font-display text-3xl">{live.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">{city(live.city ?? "")}, {country(live.country ?? "")}</div>
          <p className="mt-4 line-clamp-6 text-sm leading-relaxed text-muted-foreground" dir="auto">{live.about}</p>
        </Panel>
        {company.type === "manufacturer" && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/company/${company.id}`}>{t("mfr.viewPublic")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
