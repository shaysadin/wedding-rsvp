"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  locale: string;
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const isHebrew = locale === "he";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    const result = await requestPasswordReset(data.email, locale);

    setIsLoading(false);

    // Always show success to not reveal if user exists
    if (result.success || result.error === "failed") {
      setIsSuccess(true);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <Alert className="border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>
            {isHebrew ? "קישור נשלח" : "Reset link sent"}
          </AlertTitle>
          <AlertDescription>
            {isHebrew
              ? "אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס הסיסמה. בדוק גם בתיקיית הספאם."
              : "If an account exists with this email, we've sent a password reset link. Check your spam folder too."}
          </AlertDescription>
        </Alert>
        <Link
          href={`/${locale}/login`}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          <Icons.chevronRight className="me-2 size-4 rtl:rotate-180" />
          {isHebrew ? "חזרה להתחברות" : "Back to Login"}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">
            {isHebrew ? "כתובת אימייל" : "Email Address"}
          </Label>
          <Input
            id="email"
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={isLoading}
            {...register("email")}
          />
          {errors?.email && (
            <p className="px-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>
        <Button disabled={isLoading}>
          {isLoading && (
            <Icons.spinner className="me-2 size-4 animate-spin" />
          )}
          {isHebrew ? "שלח קישור לאיפוס" : "Send Reset Link"}
        </Button>
      </div>
    </form>
  );
}
