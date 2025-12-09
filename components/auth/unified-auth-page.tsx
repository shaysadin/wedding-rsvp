"use client";

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { UserAuthForm } from "@/components/forms/user-auth-form";
import { AppLogo } from "@/components/shared/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ModeToggle } from "@/components/layout/mode-toggle";

interface UnifiedAuthPageProps {
  locale: string;
  isHebrew: boolean;
  siteName: string;
  initialMode?: "login" | "register";
  translations: {
    welcomeBack: string;
    createAccount: string;
    noAccount: string;
    haveAccount: string;
    signUp: string;
    signIn: string;
  };
}

const contentVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function UnifiedAuthPage({
  locale,
  isHebrew,
  siteName,
  initialMode = "login",
  translations,
}: UnifiedAuthPageProps) {
  const [mode, setMode] = React.useState<"login" | "register">(initialMode);

  const handleModeChange = (newMode: "login" | "register") => {
    setMode(newMode);
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Side - Auth Form */}
      <div className="relative flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Top bar with controls */}
        <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
          {/* Navigation dots - first dot links to home */}
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}`}
              className="group"
              title={isHebrew ? "חזרה לדף הבית" : "Back to Home"}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-gray-300 transition-colors group-hover:bg-gray-500" />
            </Link>
            <motion.div
              animate={{
                backgroundColor: mode === "login" ? "#22c55e" : "#d1d5db",
              }}
              transition={{ duration: 0.15 }}
              className="h-2.5 w-2.5 rounded-full"
            />
            <motion.div
              animate={{
                backgroundColor: mode === "register" ? "#22c55e" : "#d1d5db",
              }}
              transition={{ duration: 0.15 }}
              className="h-2.5 w-2.5 rounded-full"
            />
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          </div>
          {/* Language and Theme toggles */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[400px]">
          {/* Logo */}
          <div className="mb-8">
            <AppLogo size="lg" className="h-10 w-10" />
          </div>

          {/* Welcome text with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-semibold tracking-tight">
                {mode === "login" ? translations.welcomeBack : translations.createAccount}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {mode === "login"
                  ? isHebrew
                    ? "גש ללוח הבקרה שלך ונהל את האירועים שלך."
                    : "Access your dashboard and manage your events."
                  : isHebrew
                    ? "צרו חשבון והתחילו לנהל את האירועים שלכם."
                    : "Create your account and start managing your events."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Auth Form */}
          <Suspense>
            <UserAuthForm type={mode} onModeChange={handleModeChange} />
          </Suspense>

          {/* Toggle link with animation */}
          <AnimatePresence mode="wait">
            <motion.p
              key={mode}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.1 }}
              className="mt-6 text-center text-sm text-muted-foreground"
            >
              {mode === "login" ? translations.noAccount : translations.haveAccount}{" "}
              <button
                type="button"
                onClick={() => handleModeChange(mode === "login" ? "register" : "login")}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {mode === "login" ? translations.signUp : translations.signIn}
              </button>
            </motion.p>
          </AnimatePresence>

          {/* Terms and Privacy */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {isHebrew ? (
              <>
                בהרשמה ל-{siteName}, המשתמש מסכים ל
                <Link href={`/${locale}/terms`} className="underline underline-offset-4 hover:text-primary">
                  תנאי השימוש
                </Link>
                {" "}ו
                <Link href={`/${locale}/privacy`} className="underline underline-offset-4 hover:text-primary">
                  מדיניות הפרטיות
                </Link>
                .
              </>
            ) : (
              <>
                By signing up to {siteName}, you agree to the{" "}
                <Link href={`/${locale}/terms`} className="underline underline-offset-4 hover:text-primary">
                  Services Agreement
                </Link>
                {" "}and{" "}
                <Link href={`/${locale}/privacy`} className="underline underline-offset-4 hover:text-primary">
                  Privacy Policy
                </Link>
                .
              </>
            )}
          </p>

        </div>
      </div>

      {/* Right Side - Image/Content */}
      <div className="relative hidden bg-gradient-to-br from-gray-50 to-gray-100 lg:flex lg:w-1/2 lg:flex-col lg:items-start lg:justify-start lg:p-12">
        {/* Content - Static text */}
        <div className="max-w-lg px-4 pt-8 text-right">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {isHebrew ? "התחילו את המסע שלכם" : "Start your journey"}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {isHebrew
              ? "הצטרפו לאלפי זוגות שכבר מנהלים את האירועים שלהם בצורה חכמה ופשוטה."
              : "Join thousands of couples who are already managing their events smartly and effortlessly."}
          </p>
        </div>

        {/* Dashboard Preview Image */}
        <div className="mt-12 absolute top-[25%] right-[20%] w-full max-w-9xl">
          <div className="relative scale-125 rounded-xl border bg-white p-2 shadow-2xl">
            <Image
              src="/_static/blog/some.png"
              alt="Dashboard Preview"
              width={1100}
              height={700}
              className="rounded-lg"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
