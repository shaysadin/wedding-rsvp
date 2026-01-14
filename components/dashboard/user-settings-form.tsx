"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { PlanTier, UserRole, UserStatus } from "@prisma/client";

import { updateUserSettings } from "@/actions/user-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { Separator } from "@/components/ui/separator";

interface UserSettingsFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    locale: string;
    role: UserRole;
    plan: PlanTier;
    status: UserStatus;
    createdAt: Date;
  };
}

export function UserSettingsForm({ user }: UserSettingsFormProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState(user.name || "");
  const [locale, setLocale] = useState(user.locale);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateUserSettings({ name, locale });

      if (result.success) {
        toast.success(t("saved"));
        // If locale changed, redirect to new locale
        if (locale !== user.locale) {
          router.push(`/${locale}/dashboard/settings`);
          router.refresh();
        }
      } else {
        toast.error(result.error || tc("errors.generic"));
      }
    });
  };

  const getPlanLabel = (plan: PlanTier) => {
    switch (plan) {
      case "FREE": return t("plans.free");
      case "BASIC": return t("plans.basic");
      case "PREMIUM": return t("plans.premium");
      default: return plan;
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE": return t("status.active");
      case "PENDING_APPROVAL": return t("status.pending");
      case "SUSPENDED": return t("status.suspended");
      default: return status;
    }
  };

  const getStatusVariant = (status: UserStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "ACTIVE": return "default";
      case "PENDING_APPROVAL": return "secondary";
      case "SUSPENDED": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 md:px-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{t("profile.title")}</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("profile.description")}</p>
        </div>
        <div className="p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
                className="h-11 rounded-lg border-gray-300 dark:border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.email")}</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="h-11 rounded-lg bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profile.emailNote")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="locale" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("preferences.language")}</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="locale" className="h-11 rounded-lg border-gray-300 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="he">
                      <span className="flex items-center gap-2">
                        עברית <span>🇮🇱</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="en">
                      <span className="flex items-center gap-2">
                        English <span>🇺🇸</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("preferences.languageNote")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("preferences.theme")}</Label>
                <Select value={theme ?? "system"} onValueChange={setTheme} disabled={!mounted}>
                  <SelectTrigger id="theme" className="h-11 rounded-lg border-gray-300 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <span className="flex items-center gap-2">
                        {t("preferences.themeLight")} <Icons.sun className="size-4" />
                      </span>
                    </SelectItem>
                    <SelectItem value="dark">
                      <span className="flex items-center gap-2">
                        {t("preferences.themeDark")} <Icons.moon className="size-4" />
                      </span>
                    </SelectItem>
                    <SelectItem value="system">
                      <span className="flex items-center gap-2">
                        {t("preferences.themeSystem")} <Icons.laptop className="size-4" />
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("preferences.themeNote")}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2.5">
                {isPending ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Icons.check className="me-2 h-4 w-4" />
                    {tc("saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 md:px-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{t("account.title")}</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("account.description")}</p>
        </div>
        <div className="p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("account.plan")}</p>
              <Badge variant="outline" className="text-sm border-gray-200 dark:border-gray-700">
                {getPlanLabel(user.plan)}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("account.status")}</p>
              <Badge variant={getStatusVariant(user.status)}>
                {getStatusLabel(user.status)}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("account.memberSince")}</p>
              <p className="text-sm text-gray-800 dark:text-white/90">
                {new Date(user.createdAt).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("account.role")}</p>
              <p className="text-sm text-gray-800 dark:text-white/90">
                {user.role === "ROLE_PLATFORM_OWNER" ? t("account.admin") : t("account.user")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
