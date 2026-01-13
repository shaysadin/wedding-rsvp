"use client";
import React from "react";
import { Container } from "@/components/nodus/container";
import { Badge } from "@/components/nodus/badge";
import { SubHeading } from "@/components/nodus/subheading";
import { SectionHeading } from "@/components/nodus/seciton-heading";
import { Card, CardDescription, CardTitle } from "./card";
import {
  BrainIcon,
  FingerprintIcon,
  MouseBoxIcon,
  NativeIcon,
  RealtimeSyncIcon,
  SDKIcon,
} from "@/components/nodus/icons/bento-icons";
import {
  LLMModelSelectorSkeleton,
  NativeToolsIntegrationSkeleton,
  TextToWorkflowBuilderSkeleton,
} from "./skeletons";
import { useTranslations } from "next-intl";

type Tab = {
  title: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  id: string;
};

export const AgenticIntelligence = () => {
  const t = useTranslations("Marketing.features");

  return (
    <Container className="border-divide border-x">
      <div className="flex flex-col items-center py-16">
        <Badge text={t("badge")} />
        <SectionHeading className="mt-4">{t("title")}</SectionHeading>

        <SubHeading as="p" className="mx-auto mt-6 max-w-lg px-2">
          {t("subtitle")}
        </SubHeading>
        <div className="border-divide divide-divide mt-16 grid grid-cols-1 divide-y border-y md:grid-cols-2 md:divide-x">
          <Card className="overflow-hidden mask-b-from-80%">
            <div className="flex items-center gap-2">
              <BrainIcon />
              <CardTitle>{t("whatsappTitle")}</CardTitle>
            </div>
            <CardDescription>{t("whatsappDescription")}</CardDescription>
            <TextToWorkflowBuilderSkeleton />
          </Card>
          <Card className="overflow-hidden mask-b-from-80%">
            <div className="flex items-center gap-2">
              <MouseBoxIcon />
              <CardTitle>{t("voiceTitle")}</CardTitle>
            </div>
            <CardDescription>{t("voiceDescription")}</CardDescription>
            <LLMModelSelectorSkeleton />
          </Card>
        </div>
        <div className="w-full">
          <Card className="relative w-full max-w-none overflow-hidden">
            <div className="pointer-events-none absolute inset-0 h-full w-full bg-[radial-gradient(var(--color-dots)_1px,transparent_1px)] mask-radial-from-10% [background-size:10px_10px]"></div>
            <div className="flex items-center gap-2">
              <NativeIcon />
              <CardTitle>{t("seatingTitle")}</CardTitle>
            </div>
            <CardDescription>{t("seatingDescription")}</CardDescription>
            <NativeToolsIntegrationSkeleton />
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-2">
              <FingerprintIcon />
              <CardTitle>{t("guestTitle")}</CardTitle>
            </div>
            <CardDescription>{t("guestDescription")}</CardDescription>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <RealtimeSyncIcon />
              <CardTitle>{t("taskTitle")}</CardTitle>
            </div>
            <CardDescription>{t("taskDescription")}</CardDescription>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <SDKIcon />
              <CardTitle>{t("supplierTitle")}</CardTitle>
            </div>
            <CardDescription>{t("supplierDescription")}</CardDescription>
          </Card>
        </div>
      </div>
    </Container>
  );
};
