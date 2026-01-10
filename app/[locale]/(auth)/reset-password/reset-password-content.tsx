"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/actions/auth";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordContentProps {
  locale: string;
}

export function ResetPasswordContent({ locale }: ResetPasswordContentProps) {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [isLoading, setIsLoading] = React.useState(false);
  const [status, setStatus] = React.useState<"form" | "success" | "error" | "no-token">(
    token ? "form" : "no-token"
  );
  const [errorMessage, setErrorMessage] = React.useState<string>("");

  const isHebrew = locale === "he";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: FormData) {
    if (!token) return;

    setIsLoading(true);

    const result = await resetPassword(token, data.password);

    setIsLoading(false);

    if (result.success) {
      setStatus("success");
    } else {
      setStatus("error");
      if (result.error === "tokenExpired") {
        setErrorMessage(
          isHebrew
            ? "קישור האיפוס פג תוקף. אנא בקש קישור חדש."
            : "This reset link has expired. Please request a new one."
        );
      } else if (result.error === "invalidToken") {
        setErrorMessage(
          isHebrew
            ? "קישור האיפוס אינו תקין או שפג תוקפו. אנא בקש קישור חדש."
            : "This reset link is invalid or has expired. Please request a new one."
        );
      } else if (result.error === "passwordTooShort") {
        setErrorMessage(
          isHebrew
            ? "הסיסמה חייבת להכיל לפחות 6 תווים."
            : "Password must be at least 6 characters long."
        );
      } else {
        setErrorMessage(
          isHebrew
            ? "אירעה שגיאה באיפוס הסיסמה. אנא נסה שוב."
            : "An error occurred while resetting your password. Please try again."
        );
      }
    }
  }

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
            ? "לא נמצא קישור איפוס. אנא השתמש בקישור שנשלח לאימייל שלך."
            : "No reset link found. Please use the link sent to your email."}
        </p>
        <Link
          href={`/${locale}/forgot-password`}
          className={cn(buttonVariants())}
        >
          {isHebrew ? "בקש קישור חדש" : "Request New Link"}
        </Link>
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
          {isHebrew ? "הסיסמה אופסה בהצלחה!" : "Password Reset Successful!"}
        </h1>
        <p className="text-muted-foreground">
          {isHebrew
            ? "הסיסמה שלך עודכנה. כעת תוכל להתחבר עם הסיסמה החדשה."
            : "Your password has been updated. You can now log in with your new password."}
        </p>
        <Link
          href={`/${locale}/login`}
          className={cn(buttonVariants())}
        >
          {isHebrew ? "התחבר עכשיו" : "Login Now"}
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <Icons.close className="size-6 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold">
          {isHebrew ? "איפוס נכשל" : "Reset Failed"}
        </h1>
        <p className="text-muted-foreground">
          {errorMessage}
        </p>
        <Link
          href={`/${locale}/forgot-password`}
          className={cn(buttonVariants())}
        >
          {isHebrew ? "בקש קישור חדש" : "Request New Link"}
        </Link>
      </div>
    );
  }

  // Form state
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <Icons.lock className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isHebrew ? "איפוס סיסמה" : "Reset Password"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isHebrew ? "הזן את הסיסמה החדשה שלך." : "Enter your new password below."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">
              {isHebrew ? "סיסמה חדשה" : "New Password"}
            </Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">
              {isHebrew ? "אשר סיסמה" : "Confirm Password"}
            </Label>
            <Input
              id="confirmPassword"
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {errors?.confirmPassword && (
              <p className="px-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="me-2 size-4 animate-spin" />
            )}
            {isHebrew ? "אפס סיסמה" : "Reset Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
