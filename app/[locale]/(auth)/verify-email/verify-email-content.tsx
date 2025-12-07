"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { verifyEmail } from "@/actions/auth";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const token = searchParams?.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const locale = pathname?.split("/")[1] || "he";
  const isHebrew = locale === "he";

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    async function verify() {
      const result = await verifyEmail(token as string);

      if (result.success) {
        setStatus("success");
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push(`/${locale}/login?verified=true`);
        }, 3000);
      } else {
        setStatus("error");
        if (result.error === "tokenExpired") {
          setErrorMessage(isHebrew ? "הקישור פג תוקף. אנא בקשו קישור חדש." : "This link has expired. Please request a new one.");
        } else if (result.error === "invalidToken") {
          setErrorMessage(isHebrew ? "הקישור אינו תקין." : "This link is invalid.");
        } else {
          setErrorMessage(isHebrew ? "אירעה שגיאה באימות האימייל." : "An error occurred while verifying your email.");
        }
      }
    }

    verify();
  }, [token, locale, isHebrew, router]);

  if (status === "no-token") {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-yellow-100 p-3">
          <Icons.warning className="size-6 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-semibold">
          {isHebrew ? "קישור חסר" : "Missing Link"}
        </h1>
        <p className="text-muted-foreground">
          {isHebrew
            ? "לא נמצא קישור אימות. אנא השתמשו בקישור שנשלח לאימייל שלכם."
            : "No verification link found. Please use the link sent to your email."}
        </p>
        <Link
          href={`/${locale}/login`}
          className={cn(buttonVariants())}
        >
          {isHebrew ? "חזרה להתחברות" : "Back to Login"}
        </Link>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <Icons.spinner className="size-8 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold">
          {isHebrew ? "מאמת את האימייל שלך..." : "Verifying your email..."}
        </h1>
        <p className="text-muted-foreground">
          {isHebrew ? "אנא המתן..." : "Please wait..."}
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <Icons.check className="size-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold">
          {isHebrew ? "האימייל אומת בהצלחה!" : "Email Verified!"}
        </h1>
        <p className="text-muted-foreground">
          {isHebrew
            ? "האימייל שלך אומת בהצלחה. מועברים לדף ההתחברות..."
            : "Your email has been verified. Redirecting to login..."}
        </p>
        <Link
          href={`/${locale}/login`}
          className={cn(buttonVariants())}
        >
          {isHebrew ? "התחברות עכשיו" : "Login Now"}
        </Link>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex flex-col items-center space-y-4 text-center">
      <div className="rounded-full bg-red-100 p-3">
        <Icons.close className="size-6 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold">
        {isHebrew ? "אימות נכשל" : "Verification Failed"}
      </h1>
      <p className="text-muted-foreground">
        {errorMessage}
      </p>
      <Link
        href={`/${locale}/login`}
        className={cn(buttonVariants())}
      >
        {isHebrew ? "חזרה להתחברות" : "Back to Login"}
      </Link>
    </div>
  );
}
