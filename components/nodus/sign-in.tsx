"use client";

import React from "react";
import { Container } from "./container";
import { LogoSVG } from "./logo";
import { Heading } from "./heading";
import { SubHeading } from "./subheading";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./button";
import { FacebookIcon, GoogleIcon, AppleIcon } from "./icons/general";
import Link from "next/link";
import { AuthIllustration } from "./auth-illustration";
import { useTranslations, useLocale } from "next-intl";

export const SignIn = () => {
  const t = useTranslations("Marketing.signIn");
  const locale = useLocale();

  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 md:py-20">
      <div className="grid grid-cols-1 gap-10 px-4 md:grid-cols-2 md:px-8 lg:gap-40">
        <div>
          <LogoSVG />
          <Heading className="mt-4 text-left lg:text-4xl">
            {t("title")}
          </Heading>
          <SubHeading as="p" className="mt-4 max-w-xl text-left">
            {t("subtitle")}
          </SubHeading>
          <form className="mt-6 flex flex-col gap-8">
            <div className="h-full w-full rounded-2xl">
              <Label>{t("emailLabel")}</Label>
              <Input
                type="email"
                className="mt-4 border-none focus:ring-gray-300"
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <div className="h-full w-full rounded-2xl">
              <Label>{t("passwordLabel")}</Label>
              <Input
                type="password"
                className="mt-4 border-none focus:ring-gray-300"
                placeholder={t("passwordPlaceholder")}
              />
            </div>
            <Button>{t("button")}</Button>
            <div className="mt-2 flex items-center">
              <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-700"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-neutral-400">
                {t("or")}
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-700"></div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Button
                variant="secondary"
                className="flex w-full justify-center py-4"
              >
                <GoogleIcon />
              </Button>
              <Button
                variant="secondary"
                className="flex w-full justify-center py-4"
              >
                <FacebookIcon />
              </Button>
              <Button
                variant="secondary"
                className="flex w-full justify-center py-4"
              >
                <AppleIcon />
              </Button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600 dark:text-neutral-400">
              {t("noAccount")}{" "}
            </span>
            <Link
              href={`/${locale}/register`}
              className="text-brand text-sm font-medium hover:underline"
            >
              {t("signUpLink")}
            </Link>
          </div>
        </div>
        <AuthIllustration />
      </div>
    </Container>
  );
};
