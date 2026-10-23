"use client";

import { FadeIn, Reveal } from "@/components/shared/motion";
import { useT } from "@/lib/i18n";

export default function LegalPage() {
  const { t } = useT();
  const sections = [
    { id: "terms", title: t("legal.termsTitle"), body: [t("legal.terms1"), t("legal.terms2"), t("legal.terms3")] },
    { id: "privacy", title: t("legal.privacyTitle"), body: [t("legal.privacy1"), t("legal.privacy2"), t("legal.privacy3")] },
  ];
  return (
    <div className="container-page py-16 lg:py-24">
      <FadeIn className="max-w-2xl">
        <h1 className="display-lg">{t("legal.title")}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t("legal.draft")}</p>
      </FadeIn>
      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        {sections.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.08}>
            <section id={s.id} className="scroll-mt-28">
              <h2 className="display-md">{s.title}</h2>
              <div className="mt-6 max-w-[62ch] space-y-4 leading-relaxed text-muted-foreground">
                {s.body.map((p) => (
                  <p key={p} className="text-pretty">{p}</p>
                ))}
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
