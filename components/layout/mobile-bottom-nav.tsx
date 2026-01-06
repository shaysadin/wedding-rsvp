"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

interface MobileBottomNavProps {
  currentRole?: UserRole;
}

export function MobileBottomNav({ currentRole }: MobileBottomNavProps) {
  const path = usePathname();
  const t = useTranslations();

  // Extract locale from path
  const locale = path?.split("/")[1] || "he";
  const isRTL = locale === "he";

  // Define navigation items based on role
  const isAdmin = currentRole === UserRole.ROLE_PLATFORM_OWNER;

  const navItems = isAdmin
    ? [
        { href: "/admin", icon: Icons.laptop, labelKey: "navigation.admin" },
        { href: "/admin/users", icon: Icons.users, labelKey: "navigation.users" },
        { href: "/admin/messaging", icon: Icons.messageSquare, labelKey: "navigation.messaging" },
        { href: "/dashboard/settings", icon: Icons.settings, labelKey: "navigation.settings" },
      ]
    : [
        { href: "/dashboard", icon: Icons.dashboard, labelKey: "navigation.dashboard" },
        { href: "/dashboard/events", icon: Icons.calendar, labelKey: "navigation.events" },
        { href: "/dashboard/invitations", icon: Icons.mail, labelKey: "navigation.invitations" },
        { href: "/dashboard/automations", icon: Icons.sparkles, labelKey: "navigation.automations" },
      ];

  // Check if current path matches the item href
  const isPathActive = (href: string) => {
    if (!path) return false;
    const pathWithoutLocale = path.replace(`/${locale}`, "") || "/";
    // Check for exact match or if it starts with the href (for nested routes)
    if (href === "/dashboard" || href === "/admin") {
      return pathWithoutLocale === href;
    }
    return pathWithoutLocale.startsWith(href);
  };

  // Get translated label
  const getLabel = (labelKey: string) => {
    try {
      const parts = labelKey.split(".");
      if (parts.length === 2) {
        return t(`${parts[0]}.${parts[1]}` as any);
      }
      return labelKey;
    } catch {
      return labelKey;
    }
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 md:hidden",
        "bg-background/95 backdrop-blur-lg border-t border-border",
        "safe-area-bottom"
      )}
    >
      {/* Bottom nav items stay in same visual order regardless of RTL - common mobile UX pattern */}
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isPathActive(item.href);

          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 max-w-[80px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "size-5 transition-transform",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none truncate max-w-full",
                isActive && "font-semibold"
              )}>
                {getLabel(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
