import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { Icons } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Register",
  description: "Create an account",
};

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  const locale = await getLocale();

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link
        href={`/${locale}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "absolute start-4 top-4 md:start-8 md:top-8",
        )}
      >
        <>
          <Icons.chevronRight className="me-2 size-4 rtl:rotate-180" />
          {locale === "he" ? "חזרה" : "Back"}
        </>
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto size-6" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("createAccount")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {locale === "he"
              ? "הזינו את האימייל שלכם כדי להירשם"
              : "Enter your email to create an account"}
          </p>
        </div>
        <Suspense>
          <UserAuthForm type="register" />
        </Suspense>
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href={`/${locale}/login`}
            className="hover:text-brand underline underline-offset-4"
          >
            {t("haveAccount")} {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
