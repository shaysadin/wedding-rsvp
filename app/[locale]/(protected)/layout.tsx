import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { sidebarLinks } from "@/config/dashboard";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SearchCommand } from "@/components/dashboard/search-command";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) redirect(`/${locale}/login`);

  // Fetch user's events for sidebar (only for wedding owners)
  let userEvents: { id: string; title: string }[] = [];
  if (user.role === UserRole.ROLE_WEDDING_OWNER) {
    const events = await prisma.weddingEvent.findMany({
      where: { ownerId: user.id },
      select: { id: true, title: true },
      orderBy: { dateTime: "asc" },
    });
    userEvents = events;
  }

  const filteredLinks = sidebarLinks.map((section) => ({
    ...section,
    items: section.items.filter(
      ({ authorizeOnly }) => !authorizeOnly || authorizeOnly === user.role,
    ),
  }));

  return (
    <div className="relative flex min-h-screen w-full">
      <DashboardSidebar links={filteredLinks} userEvents={userEvents} />

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-14 bg-background border-b px-4 lg:h-[60px] xl:px-8">
          <MaxWidthWrapper className="flex max-w-7xl items-center gap-x-3 px-0">
            <MobileSheetSidebar links={filteredLinks} userEvents={userEvents} />

            <div className="w-full flex-1">
              <SearchCommand links={filteredLinks} />
            </div>

            <LanguageSwitcher />
            <ModeToggle />
            <UserAccountNav />
          </MaxWidthWrapper>
        </header>

        <main className="flex-1 p-4 xl:px-8">
          <MaxWidthWrapper className="flex h-full max-w-7xl flex-col gap-4 px-0 lg:gap-6">
            {children}
          </MaxWidthWrapper>
        </main>
      </div>
    </div>
  );
}
