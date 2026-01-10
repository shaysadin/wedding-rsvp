import { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
};

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const isHebrew = locale === "he";

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link
        href={`/${locale}/login`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "absolute start-4 top-4 md:start-8 md:top-8",
        )}
      >
        <>
          <Icons.chevronRight className="me-2 size-4 rtl:rotate-180" />
          {isHebrew ? "חזרה להתחברות" : "Back to Login"}
        </>
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Icons.mail className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isHebrew ? "שכחת סיסמה?" : "Forgot your password?"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isHebrew
              ? "הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה."
              : "Enter your email address and we'll send you a link to reset your password."}
          </p>
        </div>
        <ForgotPasswordForm locale={locale} />
      </div>
    </div>
  );
}
