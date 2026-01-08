"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Home, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Icons } from "@/components/shared/icons";
import { EventOption } from "@/contexts/event-context";
import { EventSwitcherInline } from "./event-switcher-inline";
import { UserAccountNav } from "./user-account-nav";

interface EventMobileHeaderProps {
  currentEvent: EventOption;
  events: EventOption[];
  locale: string;
}

export function EventMobileHeader({ currentEvent, events, locale }: EventMobileHeaderProps) {
  const router = useRouter();
  const t = useTranslations();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const isRTL = locale === "he";

  // Event-specific navigation items for search
  const eventNavItems = React.useMemo(() => [
    { href: "", icon: Icons.dashboard, label: isRTL ? "לוח בקרה" : "Dashboard" },
    { href: "/guests", icon: Icons.users, label: isRTL ? "אורחים" : "Guests" },
    { href: "/invitations", icon: Icons.mail, label: isRTL ? "הזמנות" : "Invitations" },
    { href: "/messages", icon: Icons.messageSquare, label: isRTL ? "הודעות" : "Messages" },
    { href: "/tasks", icon: Icons.checkSquare, label: isRTL ? "משימות" : "Tasks" },
    { href: "/seating", icon: Icons.layoutGrid, label: isRTL ? "סידורי ישיבה" : "Seating" },
    { href: "/suppliers", icon: Icons.suppliers, label: isRTL ? "ספקים" : "Suppliers" },
    { href: "/gifts", icon: Icons.gift, label: isRTL ? "מתנות" : "Gifts" },
    { href: "/automations", icon: Icons.sparkles, label: isRTL ? "אוטומציות" : "Automations" },
    { href: "/customize", icon: Icons.palette, label: isRTL ? "עיצוב" : "Customize" },
    { href: "/voice-agent", icon: Icons.phone, label: isRTL ? "סוכן קולי" : "Voice Agent" },
    { href: "/rsvp", icon: Icons.mailCheck, label: isRTL ? "אישורי הגעה" : "RSVP" },
  ], [isRTL]);

  const globalNavItems = React.useMemo(() => [
    { href: "/dashboard", icon: Icons.home, label: isRTL ? "האירועים שלי" : "My Events" },
    { href: "/dashboard/settings", icon: Icons.settings, label: isRTL ? "הגדרות" : "Settings" },
    { href: "/dashboard/billing", icon: Icons.creditCard, label: isRTL ? "חיוב" : "Billing" },
  ], [isRTL]);

  return (
    <>
      <header className="grid shrink-0 md:hidden h-14 grid-cols-[1fr_auto_1fr] items-center border-b px-3 bg-background">
        {/* Left - Home & Search Buttons */}
        <div className="flex items-center gap-1 justify-start">
          <Button variant="ghost" size="icon" asChild className="size-9">
            <Link href={`/${locale}/dashboard`}>
              <Home className="size-5" />
              <span className="sr-only">{t("navigation.lobby")}</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" />
            <span className="sr-only">{isRTL ? "חיפוש" : "Search"}</span>
          </Button>
        </div>

        {/* Center - Event Selector */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-1.5 px-3 h-9 max-w-[180px] border-border/60 bg-muted/30"
            >
              <span className="font-medium truncate text-sm">
                {currentEvent.title}
              </span>
              <ChevronDown className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                drawerOpen && "rotate-180"
              )} />
            </Button>
          </DrawerTrigger>
          <DrawerContent dir={isRTL ? "rtl" : "ltr"}>
            <DrawerHeader>
              <DrawerTitle>
                {isRTL ? "בחר אירוע" : "Select Event"}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {isRTL ? "בחר אירוע מהרשימה" : "Select an event from the list"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <EventSwitcherInline
                currentEvent={currentEvent}
                events={events}
                locale={locale}
                onEventChange={() => setDrawerOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Right - User Avatar */}
        <div className="flex justify-end">
          <UserAccountNav />
        </div>
      </header>

      {/* Search Command Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} isRTL={isRTL}>
        <CommandInput
          placeholder={isRTL ? "חפש עמודים..." : "Search pages..."}
        />
        <CommandList>
          <CommandEmpty>
            {isRTL ? "לא נמצאו תוצאות." : "No results found."}
          </CommandEmpty>

          {/* Event Pages */}
          <CommandGroup heading={currentEvent.title}>
            {eventNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => {
                    setSearchOpen(false);
                    router.push(`/${locale}/events/${currentEvent.id}${item.href}`);
                  }}
                >
                  <Icon className="size-4 me-2" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {/* Global Navigation */}
          <CommandGroup heading={isRTL ? "כללי" : "General"}>
            {globalNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => {
                    setSearchOpen(false);
                    router.push(`/${locale}${item.href}`);
                  }}
                >
                  <Icon className="size-4 me-2" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
