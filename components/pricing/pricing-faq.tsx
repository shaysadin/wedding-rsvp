"use client";

import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { HeaderSection } from "../shared/header-section";

const faqKeys = ["item1", "item2", "item3", "item4", "item5", "item6"] as const;

export function PricingFaq() {
  const t = useTranslations("pricing.faq");

  return (
    <section className="container max-w-4xl py-2">
      <HeaderSection
        label={t("label")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <Accordion type="single" collapsible className="my-12 w-full">
        {faqKeys.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger>{t(`questions.${key}.question`)}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground sm:text-[15px]">
              {t(`questions.${key}.answer`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
