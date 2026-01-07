"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { SidebarNavItem } from "@/types";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Icons } from "@/components/shared/icons";

interface UserEvent {
  id: string;
  title: string;
}

interface SearchCommandProps {
  links: SidebarNavItem[];
  userEvents?: UserEvent[];
}

export function SearchCommand({ links, userEvents = [] }: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === "he";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  // Quick actions
  const quickActions = useMemo(() => [
    {
      title: isRTL ? "צור אירוע חדש" : "Create New Event",
      icon: "add" as const,
      href: `/${locale}/dashboard/events`,
      keywords: ["create", "new", "event", "add", "צור", "חדש", "אירוע"],
    },
    {
      title: isRTL ? "הגדרות" : "Settings",
      icon: "settings" as const,
      href: `/${locale}/dashboard/settings`,
      keywords: ["settings", "preferences", "account", "הגדרות", "חשבון"],
    },
    {
      title: isRTL ? "חיוב ותשלומים" : "Billing",
      icon: "creditCard" as const,
      href: `/${locale}/dashboard/billing`,
      keywords: ["billing", "payment", "subscription", "חיוב", "תשלום"],
    },
  ], [isRTL, locale]);

  // Event-specific actions (when events exist)
  const eventActions = useMemo(() => {
    if (userEvents.length === 0) return [];

    return userEvents.flatMap((event) => [
      {
        title: isRTL ? `אורחים - ${event.title}` : `Guests - ${event.title}`,
        icon: "users" as const,
        href: `/${locale}/dashboard/events/${event.id}`,
        keywords: ["guests", "אורחים", event.title.toLowerCase()],
      },
      {
        title: isRTL ? `ספקים - ${event.title}` : `Suppliers - ${event.title}`,
        icon: "suppliers" as const,
        href: `/${locale}/dashboard/events/${event.id}/suppliers`,
        keywords: ["suppliers", "vendors", "ספקים", event.title.toLowerCase()],
      },
      {
        title: isRTL ? `סידור ישיבה - ${event.title}` : `Seating - ${event.title}`,
        icon: "layoutGrid" as const,
        href: `/${locale}/dashboard/events/${event.id}/seating`,
        keywords: ["seating", "tables", "ישיבה", "שולחנות", event.title.toLowerCase()],
      },
      {
        title: isRTL ? `הזמנות - ${event.title}` : `Invitations - ${event.title}`,
        icon: "mail" as const,
        href: `/${locale}/dashboard/events/${event.id}/invitations`,
        keywords: ["invitations", "send", "הזמנות", "שלח", event.title.toLowerCase()],
      },
      {
        title: isRTL ? `עיצוב - ${event.title}` : `Design - ${event.title}`,
        icon: "palette" as const,
        href: `/${locale}/dashboard/events/${event.id}/customize`,
        keywords: ["design", "customize", "theme", "עיצוב", "התאמה", event.title.toLowerCase()],
      },
    ]);
  }, [userEvents, isRTL, locale]);

  return (
    <>
      {/* Mobile: Icon button only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden size-9 shrink-0"
        onClick={() => setOpen(true)}
      >
        <Icons.search className="h-5 w-5" />
        <span className="sr-only">{isRTL ? "חיפוש" : "Search"}</span>
      </Button>

      {/* Desktop: Full search bar */}
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pe-12 md:w-72 lg:w-96 hidden md:flex"
        onClick={() => setOpen(true)}
      >
        <Icons.search className="h-4 w-4 shrink-0 me-2" />
        <span className="truncate text-start">
          {isRTL ? "חיפוש..." : "Search..."}
        </span>
        <kbd className="pointer-events-none absolute top-[0.45rem] end-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} isRTL={isRTL}>
        <CommandInput
          placeholder={isRTL ? "חפש דפים, אירועים, פעולות..." : "Search pages, events, actions..."}
        />
        <CommandList>
          <CommandEmpty>
            {isRTL ? "לא נמצאו תוצאות." : "No results found."}
          </CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading={isRTL ? "פעולות מהירות" : "Quick Actions"}>
            {quickActions.map((action) => {
              const Icon = Icons[action.icon];
              return (
                <CommandItem
                  key={action.href}
                  value={`${action.title} ${action.keywords.join(" ")}`}
                  onSelect={() => {
                    runCommand(() => router.push(action.href));
                  }}
                >
                  <Icon className="size-4 me-2" />
                  <span>{action.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {/* User Events */}
          {userEvents.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={isRTL ? "האירועים שלי" : "My Events"}>
                {userEvents.map((event) => (
                  <CommandItem
                    key={event.id}
                    value={`event ${event.title}`}
                    onSelect={() => {
                      runCommand(() => router.push(`/${locale}/dashboard/events/${event.id}`));
                    }}
                  >
                    <Icons.calendar className="size-4 me-2" />
                    <span>{event.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Event-specific actions */}
          {eventActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={isRTL ? "ניהול אירועים" : "Event Management"}>
                {eventActions.map((action) => {
                  const Icon = Icons[action.icon];
                  return (
                    <CommandItem
                      key={action.href}
                      value={`${action.title} ${action.keywords.join(" ")}`}
                      onSelect={() => {
                        runCommand(() => router.push(action.href));
                      }}
                    >
                      <Icon className="size-4 me-2" />
                      <span>{action.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Navigation Links */}
          <CommandSeparator />
          {links.map((section) => (
            <CommandGroup key={section.title} heading={isRTL ? (section.titleKey === "common.menu" ? "תפריט" : "אפשרויות") : section.title}>
              {section.items.map((item) => {
                const Icon = Icons[item.icon || "arrowRight"];
                const title = isRTL ? (item.titleKey ? getHebrewTitle(item.titleKey) : item.title) : item.title;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.title} ${title}`}
                    onSelect={() => {
                      runCommand(() => router.push(`/${locale}${item.href}`));
                    }}
                  >
                    <Icon className="size-4 me-2" />
                    <span>{title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Helper function to get Hebrew titles for navigation items
function getHebrewTitle(titleKey: string): string {
  const hebrewTitles: Record<string, string> = {
    "navigation.admin": "פאנל ניהול",
    "navigation.users": "משתמשים",
    "navigation.messaging": "הודעות",
    "navigation.vapi": "סוכן קולי",
    "navigation.cronLogs": "לוגים",
    "navigation.dashboard": "לוח בקרה",
    "navigation.events": "אירועים",
    "navigation.suppliers": "ספקים",
    "navigation.seating": "סידור ישיבה",
    "navigation.invitations": "שליחת הזמנות",
    "navigation.messages": "תבניות הודעות",
    "navigation.customize": "עיצוב RSVP",
    "navigation.voiceAgent": "סוכן קולי",
    "navigation.billing": "חיוב",
    "navigation.settings": "הגדרות",
    "navigation.rsvp": "אישורי הגעה",
    "navigation.automations": "אוטומציות",
    "navigation.tasks": "משימות",
    "navigation.gifts": "מתנות",
    "navigation.archives": "ארכיון",
    "navigation.invitationTemplates": "תבניות הזמנה",
    "navigation.payments": "תשלומים",
    "navigation.adminSettings": "הגדרות מערכת",
  };
  return hebrewTitles[titleKey] || titleKey;
}
