"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AppLogo } from "@/components/shared/app-logo";
import { Icons } from "@/components/shared/icons";

// Admin navigation items
const adminNavItems = [
  { href: "/admin", icon: "laptop", titleKey: "navigation.admin", title: "Dashboard" },
  { href: "/admin/users", icon: "users", titleKey: "navigation.users", title: "Users" },
  { href: "/admin/messaging", icon: "messageSquare", titleKey: "navigation.messaging", title: "Messaging" },
  { href: "/admin/vapi", icon: "phone", titleKey: "navigation.vapi", title: "Voice Agent" },
  { href: "/admin/cron-logs", icon: "clock", titleKey: "navigation.cronLogs", title: "Cron Logs" },
  { href: "/admin/invitation-templates", icon: "fileText", titleKey: "navigation.invitationTemplates", title: "Invitation Templates" },
  { href: "/admin/payments", icon: "dollarSign", titleKey: "navigation.payments", title: "Payments" },
  { href: "/admin/settings", icon: "settings", titleKey: "navigation.adminSettings", title: "System Settings" },
];

// Quick access to dashboard
const quickAccessItems = [
  { href: "/dashboard", icon: "home", titleKey: "navigation.myEvents", title: "My Events" },
];

interface AdminSidebarProps {
  locale: string;
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const path = usePathname();
  const t = useTranslations();
  const isRTL = locale === "he";

  // Helper function for translations
  const getTitle = (titleKey?: string, fallback?: string) => {
    if (!titleKey) return fallback || "";
    try {
      const parts = titleKey.split(".");
      if (parts.length === 2) {
        return t(`${parts[0]}.${parts[1]}` as any) || fallback;
      }
      return fallback || "";
    } catch {
      return fallback || "";
    }
  };

  // Check if current path matches
  const isActive = (href: string) => {
    if (!path) return false;
    const fullPath = `/${locale}${href}`;

    // Exact match for admin dashboard
    if (href === "/admin") {
      return path === fullPath || path === `${fullPath}/`;
    }

    return path.startsWith(fullPath);
  };

  return (
    <aside
      className={cn(
        "w-[220px] xl:w-[260px]",
        "sticky top-0 hidden h-screen flex-col bg-sidebar border-e border-sidebar-border md:flex",
      )}
    >
      {/* Fixed Header - Logo */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 lg:h-[61px]">
        <Link href={`/${locale}/admin`} className="flex items-center">
          <AppLogo size="md" />
        </Link>
      </div>

      {/* Admin Badge */}
      <div className="shrink-0 px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
          <Icons.shield className="size-4" />
          <span className="text-sm font-medium">
            {isRTL ? "פאנל ניהול" : "Admin Panel"}
          </span>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <nav className="flex flex-col gap-6 px-4 py-4">
          {/* Admin Navigation */}
          <section className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground rtl:text-end mb-1">
              {isRTL ? "ניהול מערכת" : "SYSTEM MANAGEMENT"}
            </p>
            {adminNavItems.map((item) => {
              const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
              const itemTitle = getTitle(item.titleKey, item.title);
              const fullHref = `/${locale}${item.href}`;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                    active
                      ? "bg-background/80 text-foreground"
                      : "text-muted-foreground hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {itemTitle}
                </Link>
              );
            })}
          </section>

          {/* Separator */}
          <Separator />

          {/* Quick Access */}
          <section className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground rtl:text-end mb-1">
              {isRTL ? "גישה מהירה" : "QUICK ACCESS"}
            </p>
            {quickAccessItems.map((item) => {
              const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
              const itemTitle = getTitle(item.titleKey, item.title);
              const fullHref = `/${locale}${item.href}`;

              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                    "text-muted-foreground hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {itemTitle}
                </Link>
              );
            })}
          </section>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          {isRTL ? "גרסת מנהל" : "Admin Version"}
        </p>
      </div>
    </aside>
  );
}

// Mobile Admin Sidebar Sheet
export function MobileAdminSidebar({ locale }: AdminSidebarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();
  const t = useTranslations();
  const isRTL = locale === "he";

  // Helper function for translations
  const getTitle = (titleKey?: string, fallback?: string) => {
    if (!titleKey) return fallback || "";
    try {
      const parts = titleKey.split(".");
      if (parts.length === 2) {
        return t(`${parts[0]}.${parts[1]}` as any) || fallback;
      }
      return fallback || "";
    } catch {
      return fallback || "";
    }
  };

  // Check if current path matches
  const isActive = (href: string) => {
    if (!path) return false;
    const fullPath = `/${locale}${href}`;

    if (href === "/admin") {
      return path === fullPath || path === `${fullPath}/`;
    }

    return path.startsWith(fullPath);
  };

  if (isSm || isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 md:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">{t("common.menu")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side={isRTL ? "right" : "left"} className="flex h-full flex-col p-0">
          <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>

          {/* Header */}
          <div className="shrink-0 p-6 pb-0">
            <Link
              href={`/${locale}/admin`}
              className="flex items-center"
              onClick={() => setOpen(false)}
            >
              <AppLogo size="lg" />
            </Link>

            {/* Admin Badge */}
            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                <Icons.shield className="size-4" />
                <span className="text-sm font-medium">
                  {isRTL ? "פאנל ניהול" : "Admin Panel"}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Navigation */}
          <ScrollArea className="flex-1 min-h-0">
            <nav className="flex flex-col gap-6 p-6 text-lg font-medium">
              {/* Admin Navigation */}
              <section className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground rtl:text-end mb-1">
                  {isRTL ? "ניהול מערכת" : "SYSTEM MANAGEMENT"}
                </p>
                {adminNavItems.map((item) => {
                  const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                  const itemTitle = getTitle(item.titleKey, item.title);
                  const fullHref = `/${locale}${item.href}`;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={fullHref}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                        active
                          ? "bg-background/80 text-foreground"
                          : "text-muted-foreground hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {itemTitle}
                    </Link>
                  );
                })}
              </section>

              {/* Separator */}
              <Separator />

              {/* Quick Access */}
              <section className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground rtl:text-end mb-1">
                  {isRTL ? "גישה מהירה" : "QUICK ACCESS"}
                </p>
                {quickAccessItems.map((item) => {
                  const Icon = Icons[item.icon as keyof typeof Icons] || Icons.arrowRight;
                  const itemTitle = getTitle(item.titleKey, item.title);
                  const fullHref = `/${locale}${item.href}`;

                  return (
                    <Link
                      key={item.href}
                      href={fullHref}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted rtl:flex-row-reverse",
                        "text-muted-foreground hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {itemTitle}
                    </Link>
                  );
                })}
              </section>
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex size-9 animate-pulse rounded-lg bg-muted md:hidden" />
  );
}
