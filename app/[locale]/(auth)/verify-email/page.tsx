import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { VerifyEmailContent } from "./verify-email-content";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address",
};

export default async function VerifyEmailPage() {
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
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <Suspense fallback={
          <div className="flex flex-col items-center space-y-4">
            <Icons.spinner className="size-8 animate-spin" />
            <p className="text-muted-foreground">
              {locale === "he" ? "מאמת..." : "Verifying..."}
            </p>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
