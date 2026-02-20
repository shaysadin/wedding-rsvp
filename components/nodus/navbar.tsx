"use client";

import React, { useState } from "react";
import { Logo } from "./logo";
import { Container } from "./container";
import Link from "next/link";
import { NodusButton, GlowingButton } from "./button";
import { CloseIcon, HamburgerIcon } from "@/components/nodus/icons/general";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ModeToggle } from "./mode-toggle";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";

const navItems = [
  {
    titleKey: "pricing",
    href: "/pricing",
  },
  {
    titleKey: "about",
    href: "/about",
  },
  {
    titleKey: "contact",
    href: "/contact",
  },
  {
    titleKey: "blog",
    href: "/blog",
  },
];

export const Navbar = () => {
  const t = useTranslations("Marketing");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const items = navItems.map((item) => ({
    title: t(`nav.${item.titleKey}`),
    href: `/${locale}${item.href}`,
  }));

  return (
    <>
      {/* Mobile Nav - sticky wrapper outside Container */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm dark:bg-neutral-900/95 md:hidden">
        <Container as="nav">
          <MobileNav items={items} locale={locale} isLoggedIn={isLoggedIn} />
        </Container>
      </div>
      {/* Desktop Nav */}
      <Container as="nav" className="hidden md:block">
        <FloatingNav items={items} locale={locale} isLoggedIn={isLoggedIn} />
        <DesktopNav items={items} locale={locale} isLoggedIn={isLoggedIn} />
      </Container>
    </>
  );
};

const MobileNav = ({
  items,
  locale,
  isLoggedIn,
}: {
  items: { title: string; href: string }[];
  locale: string;
  isLoggedIn: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Marketing");

  return (
    <div className="flex items-center justify-between p-2">
      <Logo />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 flex-col items-center justify-center rounded-md bg-gray-100 dark:bg-neutral-800"
        aria-label="Toggle menu"
      >
        <HamburgerIcon className="size-4 shrink-0 text-gray-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] h-full w-full bg-white shadow-lg dark:bg-neutral-900"
          >
            <div className="absolute right-4 bottom-4">
              <ModeToggle />
            </div>

            <div className="flex items-center justify-between p-2">
              <Logo />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="shadow-aceternity flex size-6 flex-col items-center justify-center rounded-md"
                aria-label="Toggle menu"
              >
                <CloseIcon className="size-4 shrink-0 text-gray-600" />
              </button>
            </div>
            <div className="divide-divide border-divide mt-6 flex flex-col divide-y border-t">
              {items.map((item, index) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="px-4 py-2 font-medium text-gray-600 transition duration-200 hover:text-neutral-900 dark:text-gray-300 dark:hover:text-neutral-300"
                  onClick={() => setIsOpen(false)}
                >
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    {item.title}
                  </motion.div>
                </Link>
              ))}
              <div className="mt-4 p-4">
                <NodusButton
                  onClick={() => setIsOpen(false)}
                  as={Link}
                  href={isLoggedIn ? `/${locale}/dashboard` : `/${locale}/login`}
                  className="w-full"
                >
                  {isLoggedIn ? t("nav.dashboard") : t("nav.login")}
                </NodusButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DesktopNav = ({
  items,
  locale,
  isLoggedIn,
}: {
  items: { title: string; href: string }[];
  locale: string;
  isLoggedIn: boolean;
}) => {
  const t = useTranslations("Marketing");

  return (
    <div className="hidden items-center justify-between px-4 py-4 md:flex md:px-8">
      <Logo />
      <div className="flex items-center gap-10">
        {items.map((item) => (
          <Link
            className="font-medium text-gray-600 transition duration-200 hover:text-neutral-900 dark:text-gray-300 dark:hover:text-neutral-300"
            href={item.href}
            key={item.title}
          >
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <GlowingButton as={Link} href={isLoggedIn ? `/${locale}/dashboard` : `/${locale}/login`}>
          {isLoggedIn ? t("nav.dashboard") : t("nav.login")}
        </GlowingButton>
      </div>
    </div>
  );
};

const FloatingNav = ({
  items,
  locale,
  isLoggedIn,
}: {
  items: { title: string; href: string }[];
  locale: string;
  isLoggedIn: boolean;
}) => {
  const t = useTranslations("Marketing");
  const { scrollY } = useScroll();
  const springConfig = {
    stiffness: 300,
    damping: 30,
  };
  const y = useSpring(
    useTransform(scrollY, [100, 120], [-100, 10]),
    springConfig
  );

  return (
    <motion.div
      style={{ y }}
      className="shadow-aceternity fixed left-1/2 -translate-x-1/2 top-0 z-50 hidden w-[calc(100%-2rem)] max-w-[calc(80rem-4rem)] items-center justify-between bg-white/80 px-4 py-2 backdrop-blur-sm md:flex md:px-8 xl:rounded-2xl dark:bg-neutral-900/80 dark:shadow-[0px_2px_0px_0px_var(--color-neutral-800),0px_-2px_0px_0px_var(--color-neutral-800)]"
    >
      <Logo />
      <div className="flex items-center gap-10">
        {items.map((item) => (
          <Link
            className="font-medium text-gray-600 transition duration-200 hover:text-neutral-900 dark:text-gray-300 dark:hover:text-neutral-300"
            href={item.href}
            key={item.title}
          >
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <GlowingButton as={Link} href={isLoggedIn ? `/${locale}/dashboard` : `/${locale}/login`}>
          {isLoggedIn ? t("nav.dashboard") : t("nav.login")}
        </GlowingButton>
      </div>
    </motion.div>
  );
};
