"use client";

import { usePathname } from "next/navigation";

import { sidebarLinks } from "@/config/dashboard";
import { SearchCommand } from "@/components/dashboard/search-command";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { HomeButton } from "@/components/layout/home-button";

export function ProtectedHeader() {
  const pathname = usePathname();

  // Don't render header for event routes - they have their own header
  const isEventRoute = pathname?.includes("/events/");
  if (isEventRoute) {
    return null;
  }

  return (
    <header className="shrink-0 flex h-14 items-center border-b lg:h-[60px] px-4">
      {/* Mobile */}
      <div className="flex md:hidden w-full items-center gap-3">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <SearchCommand links={sidebarLinks} fullWidth />
        </div>
        <div className="shrink-0">
          <UserAccountNav />
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden md:flex w-full items-center gap-4">
        <HomeButton />
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
