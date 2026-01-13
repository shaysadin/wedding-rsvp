"use client";

import React from "react";
import { Container } from "@/components/nodus/container";
import { LogoSVG } from "@/components/nodus/logo";
import { Heading } from "@/components/nodus/heading";
import { SubHeading } from "@/components/nodus/subheading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/nodus/button";
import { AuthIllustration } from "@/components/nodus/auth-illustration";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

export const Contact = () => {
  const t = useTranslations("Marketing.contact");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted");
  };
  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 md:py-20">
      <div className="grid grid-cols-1 gap-10 px-4 md:grid-cols-2 md:px-8 lg:gap-40">
        <div>
          <LogoSVG />
          <Heading className="mt-4 text-left lg:text-4xl">{t("title")}</Heading>
          <SubHeading as="p" className="mt-4 max-w-xl text-left">
            {t("subtitle")}
          </SubHeading>
          <form className="mt-6 flex flex-col gap-8">
            <div className="h-full w-full rounded-2xl">
              <Label>{t("nameLabel")}</Label>
              <Input
                type="text"
                className="mt-4 border-none focus:ring-gray-300"
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="h-full w-full rounded-2xl">
              <Label>{t("emailLabel")}</Label>
              <Input
                type="email"
                className="mt-4 border-none focus:ring-gray-300"
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <div className="h-full w-full rounded-2xl">
              <Label>{t("messageLabel")}</Label>
              <Textarea
                className="mt-4 border-none focus:ring-gray-300"
                placeholder={t("messagePlaceholder")}
                rows={15}
              />
            </div>
            <Button>{t("button")}</Button>
          </form>
        </div>
        <AuthIllustration />
      </div>
    </Container>
  );
};
