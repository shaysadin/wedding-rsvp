"use client";

import Link from "next/link";
import { NodusButton } from "./button";
import { Container } from "./container";
import { Logo } from "./logo";
import { SubHeading } from "./subheading";
import { SendIcon } from "@/components/nodus/icons/general";
import { useTranslations, useLocale } from "next-intl";
import { ModeToggle } from "./mode-toggle";

export const Footer = () => {
  const t = useTranslations("Marketing");
  const locale = useLocale();

  const product = [
    {
      title: t("footer.features"),
      href: `/${locale}/#features`,
    },
    {
      title: t("footer.pricing"),
      href: `/${locale}/pricing`,
    },
    {
      title: t("footer.howItWorks"),
      href: `/${locale}/#how-it-works`,
    },
  ];

  const company = [
    {
      title: t("footer.signIn"),
      href: `/${locale}/login`,
    },
    {
      title: t("footer.signUp"),
      href: `/${locale}/register`,
    },
    {
      title: t("footer.blog"),
      href: `/${locale}/blog`,
    },
    {
      title: t("footer.contact"),
      href: `mailto:support@wedinex.com`,
    },
  ];

  const legal = [
    {
      title: t("footer.privacyPolicy"),
      href: `/${locale}/privacy`,
    },
    {
      title: t("footer.termsOfService"),
      href: `/${locale}/terms`,
    },
  ];

  return (
    <Container>
      <div className="px-4 py-12 md:py-20">
        {/* Top section - Logo and menus */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Logo section - compact */}
          <div className="max-w-xs shrink-0">
            <Logo />
            <SubHeading as="p" className="mt-3 text-start text-sm">
              {t("footer.tagline")}
            </SubHeading>
            <NodusButton as={Link} href={`/${locale}/register`} className="mt-4">
              {t("footer.getStarted")}
            </NodusButton>
          </div>

          {/* Menus - centered */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">{t("footer.product")}</p>
              {product.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="text-footer-link my-1 text-sm font-medium"
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">{t("footer.company")}</p>
              {company.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="text-footer-link my-1 text-sm font-medium"
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">{t("footer.legal")}</p>
              {legal.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="text-footer-link my-1 text-sm font-medium"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter - compact */}
          <div className="max-w-80 w-full shrink-0">
            <p className="text-footer-link text-sm font-medium">{t("footer.newsletter")}</p>
            <div className="mt-2 flex w-full items-center rounded-xl border border-gray-300 bg-gray-200 p-1 placeholder-gray-600 dark:border-neutral-700 dark:bg-neutral-800">
              <input
                type="email"
                placeholder={t("footer.emailPlaceholder")}
                className="flex-1 bg-transparent px-2 text-sm outline-none focus:outline-none"
              />
              <NodusButton className="my-0 flex size-8 shrink-0 items-center justify-center rounded-lg px-0 py-0 text-center">
                <SendIcon />
              </NodusButton>
            </div>
            <SubHeading
              as="p"
              className="mt-3 text-start text-xs"
            >
              {t("footer.newsletterDescription")}
            </SubHeading>
          </div>
        </div>
      </div>
      <div className="my-4 flex flex-col items-center justify-between px-4 pt-8 md:flex-row">
        <p className="text-footer-link text-sm">
          © {new Date().getFullYear()} Wedinex. {t("footer.allRightsReserved")}
        </p>
        <div className="mt-4 flex items-center gap-4 md:mt-0">
          <ModeToggle />
          <Link
            href="https://twitter.com"
            className="text-footer-link transition-colors hover:text-gray-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
          </Link>
          <Link
            href="https://instagram.com"
            className="text-footer-link transition-colors hover:text-gray-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </Link>
          <Link
            href="https://facebook.com"
            className="text-footer-link transition-colors hover:text-gray-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </Link>
        </div>
      </div>
    </Container>
  );
};
