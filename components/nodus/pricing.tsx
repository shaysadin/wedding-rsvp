"use client";
import React, { useState } from "react";
import { Container } from "@/components/nodus/container";
import { Badge } from "@/components/nodus/badge";
import { SectionHeading } from "@/components/nodus/seciton-heading";
import { motion } from "motion/react";
import { DivideX } from "@/components/nodus/divide";
import { Button } from "@/components/nodus/button";
import { SlidingNumber } from "@/components/nodus/sliding-number";
import { CheckIcon } from "@/components/nodus/icons/card-icons";
import { Scale } from "@/components/nodus/scale";
import { tiers, businessPlan } from "@/components/nodus/constants/pricing";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2, MessageCircle, Sparkles } from "lucide-react";

export const Pricing = () => {
  const t = useTranslations("Marketing.pricing");

  const tabs = [
    {
      title: t("monthly"),
      value: "monthly",
      badge: "",
    },
    {
      title: t("yearly"),
      value: "yearly",
      badge: "20%",
    },
  ];
  const [activeTier, setActiveTier] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="">
      <Container className="border-divide flex flex-col items-center justify-center border-x pt-10 pb-10">
        <Badge text={t("badge")} />
        <SectionHeading className="mt-4">{t("title")}</SectionHeading>
        <p className="mt-2 text-center text-gray-600 dark:text-neutral-400">
          {t("subtitle")}
        </p>
        <div className="relative mt-8 flex items-center gap-4 rounded-xl bg-gray-50 p-2 dark:bg-neutral-800">
          <Scale className="opacity-50" />
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTier(tab.value as "monthly" | "yearly")}
              className="relative z-20 flex w-32 justify-center py-1 text-center sm:w-40"
            >
              {activeTier === tab.value && (
                <motion.div
                  layoutId="active-span"
                  className="shadow-aceternity absolute inset-0 h-full w-full rounded-md bg-white dark:bg-neutral-950"
                ></motion.div>
              )}
              <span className="relative z-20 flex items-center gap-2 text-sm sm:text-base">
                {tab.title}{" "}
                {tab.badge && (
                  <span className="bg-brand/10 text-brand rounded-full px-2 py-1 text-xs font-medium">
                    -{tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </Container>
      <DivideX />
      <Container className="border-divide border-x">
        <div className="divide-divide grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {tiers.map((tier, tierIdx) => (
            <div className="p-4 md:p-8" key={tier.id + "tier-meta"}>
              <div className="flex items-center gap-2">
                <h3 className="text-charcoal-700 text-xl font-medium dark:text-neutral-100">
                  {t(`tiers.${tier.id}.title`)}
                </h3>
                {tier.featured && (
                  <span className="bg-brand/10 text-brand rounded-full px-2 py-0.5 text-xs font-medium">
                    {t("popular")}
                  </span>
                )}
              </div>
              <p className="text-base text-gray-600 dark:text-neutral-400">
                {t(`tiers.${tier.id}.subtitle`)}
              </p>
              <span className="mt-6 flex justify-end items-baseline-last text-2xl font-medium dark:text-white" dir="ltr">
                $
                <Price
                  value={activeTier === "monthly" ? tier.monthly : tier.yearly}
                />
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {activeTier === "monthly" ? t("perMonth") : t("perYear")}
                </span>
              </span>

              <div
                key={tier.id + "tier-list-of-items"}
                className="flex flex-col gap-4 px-0 py-4 md:hidden md:p-8"
              >
                {tier.features.map((featureKey, idx) => (
                  <Step key={featureKey + tierIdx + idx}>{t(featureKey)}</Step>
                ))}
              </div>
              <Button
                className="mt-6 w-full"
                as={Link}
                href={tier.ctaLink}
                variant={tier.featured ? "brand" : "secondary"}
              >
                {t(tier.ctaKey)}
              </Button>
            </div>
          ))}
        </div>
      </Container>
      <DivideX />
      <Container className="border-divide hidden border-x md:block">
        <div className="divide-divide grid grid-cols-1 md:grid-cols-3 md:divide-x">
          {tiers.map((tier, index) => (
            <div
              key={tier.id + "tier-list-of-items"}
              className="flex flex-col gap-4 p-4 md:p-8"
            >
              {tier.features.map((featureKey, idx) => (
                <Step key={featureKey + index + idx}>{t(featureKey)}</Step>
              ))}
            </div>
          ))}
        </div>
      </Container>

      {/* Business Plan Card */}
      <DivideX />
      <Container className="border-divide border-x">
        <div className="p-6 md:p-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/30 p-6 md:p-10">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-400/20 to-purple-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-400/20 to-violet-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left side - Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
                    <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t("tiers.business.title")}
                    </h3>
                    <p className="text-violet-600 dark:text-violet-400 font-medium">
                      {t("tiers.business.subtitle")}
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-neutral-300 mb-6 text-lg">
                  {t("tiers.business.description")}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {businessPlan.features.map((featureKey, idx) => (
                    <div key={featureKey + idx} className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-violet-500 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-neutral-200">
                        {t(featureKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - CTA */}
              <div className="flex flex-col items-center lg:items-end gap-4">
                <div className="text-center lg:text-right mb-2">
                  <p className="text-gray-500 dark:text-neutral-400 text-sm">
                    {t("tiers.business.startingFrom")}
                  </p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white" dir="ltr">
                    ${businessPlan.priceFrom} - ${businessPlan.priceTo}
                    <span className="text-lg font-normal text-gray-500 dark:text-neutral-400 ml-1">
                      {t("perMonth")}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <Button
                    as={Link}
                    href={businessPlan.ctaLink}
                    variant="brand"
                    className="flex items-center justify-center gap-2 px-6"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("contactSales")}
                  </Button>
                  <Button
                    as="a"
                    href={businessPlan.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    className="flex items-center justify-center gap-2 px-6"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("chatOnWhatsApp")}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 dark:text-neutral-500 text-center lg:text-right">
                  {t("tiers.business.noCommitment")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

const Step = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="text-charcoal-700 flex items-center gap-2 dark:text-neutral-100">
      <CheckIcon className="h-4 w-4 shrink-0 text-emerald-500" />
      {children}
    </div>
  );
};

const Price = ({ value }: { value: number }) => {
  return <SlidingNumber value={value} />;
};
