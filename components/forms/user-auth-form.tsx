"use client";

import * as React from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { userRegisterSchema, userLoginSchema, userAuthSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { registerUser } from "@/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "login" | "register";
  onModeChange?: (mode: "login" | "register") => void;
}

type RegisterFormData = z.infer<typeof userRegisterSchema>;
type LoginFormData = z.infer<typeof userLoginSchema>;
type MagicLinkFormData = z.infer<typeof userAuthSchema>;

type AlertState = {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
} | null;

const formVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function UserAuthForm({ className, type = "login", onModeChange, ...props }: UserAuthFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = React.useState<boolean>(false);
  const [showMagicLink, setShowMagicLink] = React.useState<boolean>(false);
  const [alert, setAlert] = React.useState<AlertState>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const locale = pathname?.split("/")[1] || "he";
  const defaultCallbackUrl = `/${locale}/dashboard`;
  const isHebrew = locale === "he";

  // Check for registered query param on login page
  React.useEffect(() => {
    if (type === "login" && searchParams?.get("registered") === "true") {
      setAlert({
        type: "success",
        title: t("auth.verificationEmailSent"),
        description: t("auth.verificationEmailDescription"),
      });
    }
  }, [type, searchParams, t]);

  // Clear alert when switching modes
  React.useEffect(() => {
    setAlert(null);
  }, [type]);

  // Registration form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Magic link form
  const magicLinkForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(userAuthSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onRegisterSubmit(data: RegisterFormData) {
    setIsLoading(true);
    setAlert(null);

    const result = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      locale,
    });

    setIsLoading(false);

    if (result.error) {
      if (result.error === "emailExists") {
        setAlert({
          type: "error",
          title: t("auth.emailExistsTitle"),
          description: t("auth.emailExistsDescription"),
        });
        return;
      }
      setAlert({
        type: "error",
        title: t("auth.errorTitle"),
        description: t("auth.errorDescription"),
      });
      return;
    }

    // Show success message and switch to login
    setAlert({
      type: "success",
      title: t("auth.verificationEmailSent"),
      description: t("auth.verificationEmailDescription"),
    });

    // Switch to login mode after successful registration
    if (onModeChange) {
      onModeChange("login");
    }
  }

  async function onLoginSubmit(data: LoginFormData) {
    setIsLoading(true);
    setAlert(null);

    const callbackUrl = searchParams?.get("from") || defaultCallbackUrl;

    const result = await signIn("credentials", {
      email: data.email.toLowerCase(),
      password: data.password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === "EmailNotVerified") {
        setAlert({
          type: "error",
          title: t("auth.emailNotVerifiedTitle"),
          description: t("auth.emailNotVerifiedDescription"),
        });
        return;
      }
      setAlert({
        type: "error",
        title: t("auth.invalidCredentialsTitle"),
        description: t("auth.invalidCredentialsDescription"),
      });
      return;
    }

    if (result?.ok) {
      router.push(callbackUrl);
    }
  }

  async function onMagicLinkSubmit(data: MagicLinkFormData) {
    setIsMagicLinkLoading(true);
    setAlert(null);

    const callbackUrl = searchParams?.get("from") || defaultCallbackUrl;

    const signInResult = await signIn("nodemailer", {
      email: data.email.toLowerCase(),
      redirect: false,
      callbackUrl,
    });

    setIsMagicLinkLoading(false);

    if (!signInResult?.ok) {
      setAlert({
        type: "error",
        title: t("auth.errorTitle"),
        description: t("auth.errorDescription"),
      });
      return;
    }

    setAlert({
      type: "success",
      title: t("auth.checkEmail"),
      description: t("auth.checkEmailDescription"),
    });
  }

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    const callbackUrl = searchParams?.get("from") || defaultCallbackUrl;
    signIn("google", { callbackUrl });
  };

  const isAnyLoading = isLoading || isGoogleLoading || isMagicLinkLoading;

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* Persistent Alert */}
      <AnimatePresence mode="wait">
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Alert
              variant={alert.type === "error" ? "destructive" : "default"}
              className={cn(
                alert.type === "success" && "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
                alert.type === "info" && "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
              )}
            >
              {alert.type === "error" && <AlertCircle className="h-4 w-4" />}
              {alert.type === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {alert.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
              <AlertTitle>{alert.title}</AlertTitle>
              {alert.description && <AlertDescription>{alert.description}</AlertDescription>}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {type === "register" ? (
          // Registration Form
          <motion.form
            key="register"
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {isHebrew ? "שם מלא" : "Full Name"}
                </Label>
                <Input
                  id="name"
                  placeholder={isHebrew ? "הזינו את שמכם" : "Enter your name"}
                  type="text"
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect="off"
                  disabled={isAnyLoading}
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors?.name && (
                  <p className="px-1 text-xs text-red-600">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">
                  {isHebrew ? "אימייל" : "Email"}
                </Label>
                <Input
                  id="email"
                  placeholder="example@gmail.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isAnyLoading}
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors?.email && (
                  <p className="px-1 text-xs text-red-600">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">
                  {isHebrew ? "סיסמה" : "Password"}
                </Label>
                <Input
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  autoComplete="new-password"
                  disabled={isAnyLoading}
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors?.password && (
                  <p className="px-1 text-xs text-red-600">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                disabled={isLoading}
              >
                {isLoading && (
                  <Icons.spinner className="me-2 size-4 animate-spin" />
                )}
                {isHebrew ? "הרשמה" : "Sign up"}
              </Button>
            </div>
          </motion.form>
        ) : showMagicLink ? (
          // Magic Link Form
          <motion.form
            key="magic-link"
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="magic-email">
                  {isHebrew ? "אימייל" : "Email"}
                </Label>
                <Input
                  id="magic-email"
                  placeholder="example@gmail.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isAnyLoading}
                  {...magicLinkForm.register("email")}
                />
                {magicLinkForm.formState.errors?.email && (
                  <p className="px-1 text-xs text-red-600">
                    {magicLinkForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                disabled={isMagicLinkLoading}
              >
                {isMagicLinkLoading && (
                  <Icons.spinner className="me-2 size-4 animate-spin" />
                )}
                {isHebrew ? "שלח לי קישור" : "Send Magic Link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm"
                onClick={() => setShowMagicLink(false)}
              >
                {isHebrew ? "חזרה להתחברות עם סיסמה" : "Back to password login"}
              </Button>
            </div>
          </motion.form>
        ) : (
          // Login Form
          <motion.form
            key="login"
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="login-email">
                  {isHebrew ? "אימייל" : "Email"}
                </Label>
                <Input
                  id="login-email"
                  placeholder="example@gmail.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isAnyLoading}
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors?.email && (
                  <p className="px-1 text-xs text-red-600">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">
                    {isHebrew ? "סיסמה" : "Password"}
                  </Label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {isHebrew ? "שכחת סיסמה?" : "Forgot your password?"}
                  </Link>
                </div>
                <Input
                  id="login-password"
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  disabled={isAnyLoading}
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors?.password && (
                  <p className="px-1 text-xs text-red-600">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                disabled={isLoading}
              >
                {isLoading && (
                  <Icons.spinner className="me-2 size-4 animate-spin" />
                )}
                {isHebrew ? "התחברות" : "Sign in"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("common.orContinueWith")}
          </span>
        </div>
      </div>

      {/* Social login buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isAnyLoading}
          className="w-full"
        >
          {isGoogleLoading ? (
            <Icons.spinner className="size-4 animate-spin" />
          ) : (
            <>
              <Icons.google className="size-4 me-2" />
              <span className="text-sm">Google</span>
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isAnyLoading}
          className="w-full"
          onClick={() => setShowMagicLink(true)}
        >
          <Icons.mail className="size-4 me-2" />
          <span className="text-sm">{isHebrew ? "קישור קסם" : "Magic Link"}</span>
        </Button>
      </div>
    </div>
  );
}
