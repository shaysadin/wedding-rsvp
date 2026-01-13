"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { UserAuthForm } from "@/components/forms/user-auth-form";
import { AppLogo } from "@/components/shared/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { AuthIllustration } from "@/components/nodus/auth-illustration";
import { Container } from "@/components/nodus/container";

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
    <Container className="min-h-[calc(100vh-4rem)] py-10 md:py-20">
      <div className="grid grid-cols-1 gap-10 px-4 md:grid-cols-2 md:px-8 lg:gap-20">
        {/* Left Side - Auth Form */}
        <div className="flex flex-col">
          {/* Top bar with controls */}
          <div className="mb-8 flex items-center justify-between">
            <Link href={`/${locale}`}>
              <AppLogo size="lg" />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
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
              <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                {mode === "login" ? translations.welcomeBack : translations.createAccount}
              </h1>
              <p className="mt-4 max-w-xl text-muted-foreground">
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
                className="text-brand font-medium hover:underline"
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

        {/* Right Side - Auth Illustration */}
        <AuthIllustration />
      </div>
    </Container>
  );
}
