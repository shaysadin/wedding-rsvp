"use client";

import { PlanTier } from "@prisma/client";

import { sidebarLinks } from "@/config/dashboard";
import { SearchCommand } from "@/components/dashboard/search-command";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { MobileSheetLobbySidebar } from "@/components/layout/lobby-sidebar";

interface EventOption {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
}

interface LobbyHeaderProps {
  events: EventOption[];
  locale: string;
  userPlan: PlanTier;
}

export function LobbyHeader({ events, locale, userPlan }: LobbyHeaderProps) {
  return (
    <header className="shrink-0 flex h-14 items-center border-b lg:h-[60px] px-4">
      {/* Mobile */}
      <div className="flex md:hidden w-full items-center gap-3">
        <MobileSheetLobbySidebar
          events={events}
          locale={locale}
          userPlan={userPlan}
        />
        <div className="flex-1 min-w-0">
          <SearchCommand links={sidebarLinks} fullWidth />
        </div>
        <div className="shrink-0">
          <UserAccountNav />
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden md:flex w-full items-center gap-4">
        <div className="flex-1" />
        <div className="w-72 lg:w-96">
          <SearchCommand links={sidebarLinks} fullWidth />
        </div>
        <div className="flex-1 flex justify-end">
          <UserAccountNav />
        </div>
      </div>
    </header>
  );
}
