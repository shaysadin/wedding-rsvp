import { UserRole } from "@prisma/client";

import { SidebarNavItem } from "@/types";

// Admin panel links (shown only to platform owners)
export const adminLinks: SidebarNavItem[] = [
  {
    titleKey: "navigation.adminPanel",
    title: "ADMIN PANEL",
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
        href: "/admin/messaging",
        icon: "messageSquare",
        titleKey: "navigation.messaging",
        title: "Messaging",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/admin/vapi",
        icon: "phone",
        titleKey: "navigation.vapi",
        title: "Voice Agent",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/admin/cron-logs",
        icon: "clock",
        titleKey: "navigation.cronLogs",
        title: "Cron Logs",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/admin/invitation-templates",
        icon: "fileText",
        titleKey: "navigation.invitationTemplates",
        title: "Invitation Templates",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/admin/payments",
        icon: "dollarSign",
        titleKey: "navigation.payments",
        title: "Payments",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
      {
        href: "/admin/settings",
        icon: "settings",
        titleKey: "navigation.adminSettings",
        title: "System Settings",
        authorizeOnly: UserRole.ROLE_PLATFORM_OWNER,
      },
    ],
  },
];

// Translation keys for sidebar - will be translated in the component
// Global navigation (non-event-scoped pages)
export const sidebarLinks: SidebarNavItem[] = [
  {
    titleKey: "navigation.main",
    title: "MAIN",
    items: [
      {
        href: "/dashboard",
        icon: "home",
        titleKey: "navigation.myEvents",
        title: "My Events",
      },
    ],
  },
  {
    titleKey: "navigation.accountSettings",
    title: "ACCOUNT & SETTINGS",
    items: [
      {
        href: "/dashboard/archives",
        icon: "archive",
        titleKey: "navigation.archives",
        title: "Archives",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/billing",
        icon: "creditCard",
        titleKey: "navigation.billing",
        title: "Billing",
      },
      {
        href: "/dashboard/settings",
        icon: "settings",
        titleKey: "navigation.settings",
        title: "Settings",
      },
    ],
  },
];
