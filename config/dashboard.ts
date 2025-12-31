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
        href: "/dashboard/suppliers",
        icon: "suppliers",
        titleKey: "navigation.suppliers",
        title: "Suppliers",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/seating",
        icon: "layoutGrid",
        titleKey: "navigation.seating",
        title: "Table Seating",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/invitations",
        icon: "mail",
        titleKey: "navigation.invitations",
        title: "Send Invitations",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/messages",
        icon: "messageSquare",
        titleKey: "navigation.messages",
        title: "Message Templates",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/customize",
        icon: "palette",
        titleKey: "navigation.customize",
        title: "Customize RSVP",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/voice-agent",
        icon: "phone",
        titleKey: "navigation.voiceAgent",
        title: "Voice Agent",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
    ],
  },
  {
    titleKey: "common.options",
    title: "OPTIONS",
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
      { href: "/dashboard/settings", icon: "settings", titleKey: "navigation.settings", title: "Settings" },
      // { href: "/", icon: "home", titleKey: "common.homepage", title: "Homepage" },
    ],
  },
];
