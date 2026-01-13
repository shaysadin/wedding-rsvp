"use client";

import React from "react";
import { Container } from "@/components/nodus/container";
import { DivideX } from "@/components/nodus/divide";
import { SectionHeading } from "@/components/nodus/seciton-heading";
import { SubHeading } from "@/components/nodus/subheading";
import { Button } from "@/components/nodus/button";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export const Security = () => {
  const t = useTranslations("Marketing.security");
  const locale = useLocale();

  return (
    <>
      <Container className="border-divide border-x">
        <h2 className="pt-10 pb-5 text-center font-mono text-sm tracking-tight text-neutral-500 uppercase md:pt-20 md:pb-10 dark:text-neutral-400">
          {t("badge")}
        </h2>
      </Container>
      <DivideX />
      <Container className="border-divide grid grid-cols-1 border-x bg-gray-100 px-8 py-12 md:grid-cols-2 dark:bg-neutral-900">
        <div>
          <SectionHeading className="text-start">
            {t("title")}
          </SectionHeading>
          <SubHeading as="p" className="mt-4 text-start">
            {t("description")}
          </SubHeading>
          <Button
            className="mt-4 mb-8 inline-block w-full md:w-auto"
            as={Link}
            href={`/${locale}/pricing`}
          >
            {t("button")}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-10">
          <Image
            src="/logos/CCPA.png"
            alt="CCPA"
            height={100}
            width={100}
            className="h-auto w-14"
            draggable={false}
          />
          <Image
            src="/logos/GDPR.png"
            alt="GDPR"
            height={100}
            width={100}
            className="h-auto w-14"
            draggable={false}
          />
          <Image
            src="/logos/ISO.png"
            alt="ISO"
            height={100}
            width={100}
            className="h-auto w-14"
            draggable={false}
          />
        </div>
      </Container>
    </>
  );
};
