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
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

// Force dynamic rendering to avoid caching issues with role switching
export const dynamic = "force-dynamic";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) redirect(`/${locale}/login`);

  // Get user data including email verification status and roles
  // Also fetch current role from DB to ensure role switches are reflected immediately
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true, role: true, roles: true, accounts: true },
  });

  // If user has no OAuth accounts and email is not verified, block access
  const hasOAuthAccount = dbUser?.accounts && dbUser.accounts.length > 0;
  if (!hasOAuthAccount && !dbUser?.emailVerified) {
    redirect(`/${locale}/login?error=EmailNotVerified`);
  }

  const currentRole = dbUser?.role || user.role;
  const userRoles = dbUser?.roles || [currentRole];

  // Fetch user's events for sidebar (only for wedding owners)
  let userEvents: { id: string; title: string }[] = [];
  if (currentRole === UserRole.ROLE_WEDDING_OWNER) {
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
      ({ authorizeOnly }) => !authorizeOnly || authorizeOnly === currentRole,
    ),
  }));

  // Check if user can switch roles (has multiple roles)
  const canSwitchRoles = userRoles.length > 1;

  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-sidebar">
      <DashboardSidebar
        links={filteredLinks}
        userEvents={userEvents}
        currentRole={currentRole}
        availableRoles={userRoles}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-md m-3">
        <header className="shrink-0 flex h-14 items-center border-b px-4 lg:h-[60px] xl:px-8">
          <MaxWidthWrapper className="flex max-w-7xl items-center gap-x-3 px-0">
            <MobileSheetSidebar
              links={filteredLinks}
              userEvents={userEvents}
              currentRole={currentRole}
              availableRoles={userRoles}
            />

            <div className="w-full flex-1">
              <SearchCommand links={filteredLinks} />
            </div>

            <LanguageSwitcher />
            <ModeToggle />
            <UserAccountNav />
          </MaxWidthWrapper>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:overflow-hidden xl:px-8">
          <MaxWidthWrapper className="flex min-h-0 max-w-7xl flex-1 flex-col gap-4 px-0 lg:gap-6">
            {children}
          </MaxWidthWrapper>
        </main>
      </div>
    </div>
  );
}
