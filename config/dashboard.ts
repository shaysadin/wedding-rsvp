import { UserRole } from "@prisma/client";

import { SidebarNavItem } from "types";

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
export const sidebarLinks: SidebarNavItem[] = [
  {
    titleKey: "navigation.eventOrganization",
    title: "EVENT ORGANIZATION",
    items: [
      {
        href: "/dashboard/events",
        icon: "calendar",
        titleKey: "navigation.events",
        title: "Events",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard",
        icon: "dashboard",
        titleKey: "navigation.dashboard",
        title: "Dashboard"
      },
      {
        href: "/dashboard/tasks",
        icon: "checkSquare",
        titleKey: "navigation.tasks",
        title: "Tasks",
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
        href: "/dashboard/suppliers",
        icon: "suppliers",
        titleKey: "navigation.suppliers",
        title: "Suppliers",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/gifts",
        icon: "gift",
        titleKey: "navigation.gifts",
        title: "Gifts",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
    ],
  },
  {
    titleKey: "navigation.designInvitations",
    title: "DESIGN & INVITATIONS",
    items: [
      {
        href: "/dashboard/customize",
        icon: "palette",
        titleKey: "navigation.customize",
        title: "Customize RSVP",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
      {
        href: "/dashboard/invitations",
        icon: "mail",
        titleKey: "navigation.invitations",
        title: "Invitations",
        authorizeOnly: UserRole.ROLE_WEDDING_OWNER,
      },
    ],
  },
  {
    titleKey: "navigation.rsvpCommunication",
    title: "RSVP & COMMUNICATION",
    items: [
      {
        href: "/dashboard/rsvp",
        icon: "mailCheck",
        titleKey: "navigation.rsvp",
        title: "RSVP Approvals",
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
        href: "/dashboard/automations",
        icon: "sparkles",
        titleKey: "navigation.automations",
        title: "Automations",
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
        title: "Settings"
      },
    ],
  },
];
