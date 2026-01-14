import { getLocale } from "next-intl/server";
import { PlanTier, UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LobbySidebar } from "@/components/layout/lobby-sidebar";
import { LobbyHeader } from "@/components/layout/lobby-header";
import { DashboardMainWrapper } from "@/components/layout/dashboard-main-wrapper";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) {
    return <>{children}</>;
  }

  const isRTL = locale === "he";

  // Fetch user's plan and default workspace
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });

  const userPlan = dbUser?.plan || PlanTier.FREE;

  // Get default workspace for BUSINESS users
  let workspaceId: string | undefined;
  if (userPlan === PlanTier.BUSINESS) {
    const defaultWorkspace = await prisma.workspace.findFirst({
      where: {
        ownerId: user.id,
        isDefault: true,
      },
      select: { id: true },
    });
    workspaceId = defaultWorkspace?.id;
  }

  // Fetch events (filtered by workspace for BUSINESS users)
  const whereClause: { ownerId: string; workspaceId?: string } = {
    ownerId: user.id,
  };

  if (userPlan === PlanTier.BUSINESS && workspaceId) {
    whereClause.workspaceId = workspaceId;
  }

  const events = await prisma.weddingEvent.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      dateTime: true,
      location: true,
      venue: true,
    },
    orderBy: { dateTime: "asc" },
  });

  const eventOptions = events.map((event) => ({
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
    venue: event.venue,
  }));

  return (
    <div
      className="app-shell flex w-full min-h-screen bg-gray-50 dark:bg-gray-900"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Desktop Sidebar */}
      <LobbySidebar
        events={eventOptions}
        locale={locale}
        userPlan={userPlan}
      />

      <DashboardMainWrapper isRTL={isRTL}>
        {/* Header */}
        <LobbyHeader
          events={eventOptions}
          locale={locale}
          userPlan={userPlan}
        />

        {/* Page Content */}
        <main className="p-4 mx-auto max-w-[--breakpoint-2xl] md:p-6 w-full">
          {children}
        </main>
      </DashboardMainWrapper>
    </div>
  );
}
