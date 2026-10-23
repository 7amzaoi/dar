"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageManager } from "@/components/dashboard/image-manager";
import { PriceTierEditor, tierErrors } from "@/components/dashboard/price-tier-editor";
import { TagInput } from "@/components/dashboard/tag-input";
import { Field } from "@/components/shared/field";
import { childCategories, db, topLevelCategories, type Category, type Collection, type Product } from "@/lib/data";
import { useT } from "@/lib/i18n";
import en from "@/lib/i18n/en";
import { placeholderSet, PRODUCT_PLACEHOLDERS } from "@/lib/placeholders";

const MATERIAL_KEYS = Object.keys(en.materials);
const COLOR_KEYS = Object.keys(en.colors);

function Section({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-hairline py-10 first:border-t-0 first:pt-0 lg:grid-cols-[260px_1fr] lg:gap-12">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function ProductForm({
  initial,
  manufacturerId,
  categories,
  collections,
}: {
  initial?: Product;
  manufacturerId: string;
  categories: Category[];
  collections: Collection[];
}) {
  const { t, tx, material, color } = useT();
  const router = useRouter();

  const req = t("auth.errRequired");
  const positive = z.number({ error: req }).positive(req);
  const schema = z
    .object({
      titleAr: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
      titleEn: z.string().trim().min(2, t("auth.errMin", { n: 2 })),
      descriptionAr: z.string().trim().min(10, t("auth.errMin", { n: 10 })),
      descriptionEn: z.string().trim().min(10, t("auth.errMin", { n: 10 })),
      categoryId: z.string().min(1, req),
      collectionId: z.string(),
      materials: z.array(z.string()).min(1, req),
      colors: z.array(z.string()).min(1, req),
      width: positive,
      height: positive,
      depth: positive,
      minOrderQty: z.number({ error: req }).int().min(1, req),
      stockStatus: z.enum(["in_stock", "made_to_order", "out_of_stock"]),
      leadTimeDays: z.number().int().min(0).optional(),
      priceTiers: z.array(z.object({ minQty: z.number(), unitPrice: z.number(), currency: z.string() })),
      images: z.array(z.string()).min(1, t("mfr.imagesErr")),
      published: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (tierErrors(v.priceTiers, v.minOrderQty).length) ctx.addIssue({ code: "custom", path: ["priceTiers"], message: t("mfr.tierErrMin") });
      if (v.priceTiers.some((p) => p.unitPrice <= 0)) ctx.addIssue({ code: "custom", path: ["priceTiers"], message: req });
    });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          titleAr: initial.titleAr,
          titleEn: initial.titleEn,
          descriptionAr: initial.descriptionAr,
          descriptionEn: initial.descriptionEn,
          categoryId: initial.categoryId,
          collectionId: initial.collectionId ?? "none",
          materials: initial.materials,
          colors: initial.colors,
          width: initial.dimensions.width,
          height: initial.dimensions.height,
          depth: initial.dimensions.depth,
          minOrderQty: initial.minOrderQty,
          stockStatus: initial.stockStatus,
          leadTimeDays: initial.leadTimeDays,
          priceTiers: initial.priceTiers,
          images: initial.images,
          published: initial.published,
        }
      : {
          titleAr: "",
          titleEn: "",
          descriptionAr: "",
          descriptionEn: "",
          categoryId: "",
          collectionId: "none",
          materials: [],
          colors: [],
          width: 0,
          height: 0,
          depth: 0,
          minOrderQty: 4,
          stockStatus: "made_to_order",
          leadTimeDays: 30,
          priceTiers: [{ minQty: 4, unitPrice: 0, currency: "USD" }],
          images: [],
          published: false,
        },
  });

  const { errors, isSubmitting } = form.formState;
  const moq = useWatch({ control: form.control, name: "minOrderQty" });

  const onSubmit = form.handleSubmit(async (v) => {
    const payload = {
      manufacturerId,
      titleAr: v.titleAr,
      titleEn: v.titleEn,
      descriptionAr: v.descriptionAr,
      descriptionEn: v.descriptionEn,
      categoryId: v.categoryId,
      collectionId: v.collectionId === "none" ? undefined : v.collectionId,
      materials: v.materials,
      colors: v.colors,
      dimensions: { width: v.width, height: v.height, depth: v.depth, unit: "cm" as const },
      priceTiers: v.priceTiers,
      minOrderQty: v.minOrderQty,
      stockStatus: v.stockStatus,
      leadTimeDays: v.leadTimeDays,
      images: v.images,
      published: v.published,
    };
    try {
      if (initial) {
        await db.products.update(initial.id, payload);
        toast.success(t("mfr.updatedToast"));
      } else {
        await db.products.create(payload);
        toast.success(t("mfr.createdToast"));
      }
      router.push("/manufacturer/products");
    } catch {
      toast.error(t("common.errorBody"));
    }
  });

  const num = (name: "width" | "height" | "depth" | "leadTimeDays") => ({
    ...form.register(name, { setValueAs: (v: string) => (v === "" ? undefined : Number(v)) }),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="pb-28">
      <Section title={t("mfr.secBasics")} body={t("mfr.secBasicsBody")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="titleAr" label={t("mfr.titleAr")} error={errors.titleAr?.message}>
            <Input id="titleAr" dir="rtl" lang="ar" aria-invalid={!!errors.titleAr} {...form.register("titleAr")} />
          </Field>
          <Field id="titleEn" label={t("mfr.titleEn")} error={errors.titleEn?.message}>
            <Input id="titleEn" dir="ltr" lang="en" aria-invalid={!!errors.titleEn} {...form.register("titleEn")} />
          </Field>
        </div>
        <Field id="descriptionAr" label={t("mfr.descAr")} error={errors.descriptionAr?.message}>
          <Textarea id="descriptionAr" dir="rtl" lang="ar" rows={4} aria-invalid={!!errors.descriptionAr} {...form.register("descriptionAr")} />
        </Field>
        <Field id="descriptionEn" label={t("mfr.descEn")} error={errors.descriptionEn?.message}>
          <Textarea id="descriptionEn" dir="ltr" lang="en" rows={4} aria-invalid={!!errors.descriptionEn} {...form.register("descriptionEn")} />
        </Field>
      </Section>

      <Section title={t("mfr.secMedia")} body={t("mfr.secMediaBody")}>
        <Controller
          control={form.control}
          name="images"
          render={({ field }) => (
            <div>
              <ImageManager value={field.value} onChange={field.onChange} library={PRODUCT_PLACEHOLDERS} expandLibraryPick={placeholderSet} invalid={!!errors.images} />
              {errors.images && <p role="alert" className="mt-2 text-xs text-destructive">{errors.images.message}</p>}
            </div>
          )}
        />
      </Section>

      <Section title={t("mfr.secSpecs")} body={t("mfr.secSpecsBody")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="categoryId" label={t("mfr.category")} error={errors.categoryId?.message}>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="categoryId" className="w-full" aria-invalid={!!errors.categoryId}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {topLevelCategories(categories).map((top) => (
                      <SelectGroup key={top.id}>
                        <SelectLabel>{tx(top.nameAr, top.nameEn)}</SelectLabel>
                        {childCategories(categories, top.id).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {tx(c.nameAr, c.nameEn)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="collectionId" label={t("mfr.collection")} optionalLabel={t("common.optional")}>
            <Controller
              control={form.control}
              name="collectionId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="collectionId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("mfr.noCollection")}</SelectItem>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {tx(c.nameAr, c.nameEn)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Field id="materials" label={t("mfr.materials")} error={errors.materials?.message}>
          <Controller
            control={form.control}
            name="materials"
            render={({ field }) => <TagInput id="materials" value={field.value} onChange={field.onChange} suggestions={MATERIAL_KEYS} labelFor={material} invalid={!!errors.materials} />}
          />
        </Field>
        <Field id="colors" label={t("mfr.colors")} error={errors.colors?.message}>
          <Controller
            control={form.control}
            name="colors"
            render={({ field }) => <TagInput id="colors" value={field.value} onChange={field.onChange} suggestions={COLOR_KEYS} labelFor={color} invalid={!!errors.colors} />}
          />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          {(["width", "height", "depth"] as const).map((d) => (
            <Field key={d} id={d} label={`${t(`mfr.${d}`)} (cm)`} error={errors[d]?.message}>
              <Input id={d} type="number" min={1} inputMode="numeric" aria-invalid={!!errors[d]} {...num(d)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title={t("mfr.secAvailability")} body={t("mfr.secAvailabilityBody")}>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="minOrderQty" label={t("mfr.moq")} error={errors.minOrderQty?.message}>
            <Input
              id="minOrderQty"
              type="number"
              min={1}
              aria-invalid={!!errors.minOrderQty}
              {...form.register("minOrderQty", {
                setValueAs: (v: string) => Number(v),
                // keep the first price tier anchored to the MOQ
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = Number(e.target.value);
                  const tiers = form.getValues("priceTiers");
                  if (tiers[0] && next > 0) form.setValue("priceTiers", [{ ...tiers[0], minQty: next }, ...tiers.slice(1)]);
                },
              })}
            />
          </Field>
          <Field id="stockStatus" label={t("mfr.stockStatus")}>
            <Controller
              control={form.control}
              name="stockStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="stockStatus" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["in_stock", "made_to_order", "out_of_stock"] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.stock.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="leadTimeDays" label={t("mfr.leadTime")} optionalLabel={t("common.optional")}>
            <Input id="leadTimeDays" type="number" min={0} {...num("leadTimeDays")} />
          </Field>
        </div>
      </Section>

      <Section title={t("mfr.secPricing")} body={t("mfr.secPricingBody")}>
        <Controller
          control={form.control}
          name="priceTiers"
          render={({ field }) => <PriceTierEditor value={field.value} onChange={field.onChange} moq={moq} invalid={!!errors.priceTiers} />}
        />
        <Controller
          control={form.control}
          name="published"
          render={({ field }) => (
            <label className="flex cursor-pointer items-start justify-between gap-6 rounded-md border border-border bg-surface p-5">
              <span>
                <span className="block text-sm font-medium">{t("mfr.publishNow")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t("mfr.publishNowBody")}</span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-background/90 backdrop-blur lg:start-[272px]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-3 px-5 py-4 sm:px-8 lg:px-12">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("common.saving") : initial ? t("common.saveChanges") : t("common.create")}
          </Button>
        </div>
      </div>
    </form>
  );
}
