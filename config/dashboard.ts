import { UserRole } from "@prisma/client";

import { SidebarNavItem } from "types";

// Translation keys for sidebar - will be translated in the component
export const sidebarLinks: SidebarNavItem[] = [
  {
    titleKey: "common.menu",
    title: "MENU", // Fallback
    items: [
      {
        href: "/admin",
        icon: "laptop",
        titleKey: "navigation.admin",
        title: "Admin Panel",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/admin/users",
        icon: "users",
        titleKey: "navigation.users",
        title: "Users",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/dashboard",
        icon: "dashboard",
        titleKey: "navigation.dashboard",
        title: "Dashboard"
      },
      {
        href: "/dashboard/events",
        icon: "calendar",
        titleKey: "navigation.events",
        title: "Events",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/charts",
        icon: "lineChart",
        titleKey: "common.analytics",
        title: "Analytics",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
    ],
  },
  {
    titleKey: "common.options",
    title: "OPTIONS",
    items: [
      { href: "/dashboard/settings", icon: "settings", titleKey: "navigation.settings", title: "Settings" },
      { href: "/", icon: "home", titleKey: "common.homepage", title: "Homepage" },
    ],
  },
];
