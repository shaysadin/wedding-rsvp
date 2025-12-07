import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";

import { UnifiedAuthPage } from "@/components/auth/unified-auth-page";
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
    <UnifiedAuthPage
      locale={locale}
      isHebrew={isHebrew}
      siteName={siteConfig.name}
      initialMode="register"
      translations={{
        welcomeBack: t("welcomeBack"),
        createAccount: t("createAccount"),
        noAccount: t("noAccount"),
        haveAccount: t("haveAccount"),
        signUp: t("signUp"),
        signIn: t("signIn"),
      }}
    />
  );
}
