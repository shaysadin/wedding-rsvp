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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
          <CardDescription>{t("profile.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("profile.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("profile.email")}</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t("profile.emailNote")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="locale">{t("preferences.language")}</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="locale">
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
                <p className="text-xs text-muted-foreground">
                  {t("preferences.languageNote")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">{t("preferences.theme")}</Label>
                <Select value={theme ?? "system"} onValueChange={setTheme} disabled={!mounted}>
                  <SelectTrigger id="theme">
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
                <p className="text-xs text-muted-foreground">
                  {t("preferences.themeNote")}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
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
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("account.title")}</CardTitle>
          <CardDescription>{t("account.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t("account.plan")}</p>
              <Badge variant="outline" className="text-sm">
                {getPlanLabel(user.plan)}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t("account.status")}</p>
              <Badge variant={getStatusVariant(user.status)}>
                {getStatusLabel(user.status)}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t("account.memberSince")}</p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t("account.role")}</p>
              <p className="text-sm">
                {user.role === "ROLE_PLATFORM_OWNER" ? t("account.admin") : t("account.user")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
