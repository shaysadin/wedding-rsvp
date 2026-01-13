import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Suspense } from "react";
import Link from "next/link";

import { Container, Heading, SubHeading, AuthIllustration, DivideX } from "@/components/nodus";
import { Logo } from "@/components/nodus/logo";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Register",
  description: "Create an account",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Redirect to dashboard if user is already logged in
  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("auth");
  const isHebrew = locale === "he";

  return (
    <main>
      <DivideX />
      <Container className="min-h-[calc(100vh-12rem)] py-10 md:py-20">
        <div className="grid grid-cols-1 gap-10 px-4 md:grid-cols-2 md:px-8 lg:gap-40">
          <div>
            <Logo />
            <Heading className="mt-6 text-left lg:text-4xl">
              {t("createAccount")}
            </Heading>
            <SubHeading as="p" className="mt-4 max-w-xl text-left">
              {isHebrew
                ? "צרו חשבון והתחילו לנהל את האירועים שלכם."
                : "Create your account and start managing your events."}
            </SubHeading>
            <div className="mt-8">
              <Suspense>
                <UserAuthForm type="register" />
              </Suspense>
            </div>
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600 dark:text-neutral-400">
                {t("haveAccount")}{" "}
              </span>
              <Link
                href={`/${locale}/login`}
                className="text-brand text-sm font-medium hover:underline"
              >
                {t("signIn")}
              </Link>
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              {isHebrew ? (
                <>
                  בהרשמה ל-{siteConfig.name}, המשתמש מסכים ל
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
                  By signing up to {siteConfig.name}, you agree to the{" "}
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
          <AuthIllustration />
        </div>
      </Container>
      <DivideX />
    </main>
  );
}
