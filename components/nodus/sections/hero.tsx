"use client";

import React from "react";
import { Container } from "../container";
import { Heading } from "../heading";
import { SubHeading } from "../subheading";
import { Star } from "@/components/nodus/icons/general";
import { motion } from "motion/react";
import { NodusButton } from "../button";
import { Badge } from "../badge";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export const Hero = () => {
  const t = useTranslations("Marketing");
  const locale = useLocale();

  return (
    <Container className="border-divide flex flex-col items-center justify-center border-x px-4 pt-10 pb-10 md:pt-32 md:pb-20">
      <Badge text={t("hero.badge")} />
      <Heading className="mt-4 text-center">
        {t("hero.titleLine1")} <br />{" "}
        <span className="text-brand">{t("hero.titleHighlight")}</span>
      </Heading>

      <SubHeading className="mx-auto mt-6 max-w-lg text-center">
        {t("hero.subtitle")}
      </SubHeading>

      <div className="mt-6 flex items-center gap-4">
        <NodusButton as={Link} href={`/${locale}/register`}>
          {t("hero.ctaPrimary")}
        </NodusButton>
        <NodusButton variant="secondary" as={Link} href={`/${locale}/pricing`}>
          {t("hero.ctaSecondary")}
        </NodusButton>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="flex items-center">
          {[...Array(5)].map((_, index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{ duration: 1, delay: index * 0.05 }}
            >
              <Star key={index} className="text-yellow-500" />
            </motion.div>
          ))}
        </div>
        <span className="border-r border-gray-500 pr-4 text-[10px] text-gray-600 sm:text-sm dark:text-gray-400">
          {t("hero.rating")}
        </span>
      </div>
    </Container>
  );
};
