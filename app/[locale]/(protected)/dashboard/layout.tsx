import { getLocale } from "next-intl/server";
import { PlanTier, UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LobbySidebar, MobileSheetLobbySidebar } from "@/components/layout/lobby-sidebar";
import { LobbyHeader } from "@/components/layout/lobby-header";

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
    <div className="app-shell flex w-full bg-sidebar" dir={isRTL ? "rtl" : "ltr"}>
      {/* Desktop Sidebar */}
      <LobbySidebar
        events={eventOptions}
        locale={locale}
        userPlan={userPlan}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-xl md:border bg-background md:shadow-md md:p-2 md:m-3 md:ms-0">
        {/* Header */}
        <LobbyHeader
          events={eventOptions}
          locale={locale}
          userPlan={userPlan}
        />

        <main
          className="app-shell-content flex min-h-0 flex-1 flex-col"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex w-full min-h-0 flex-1 flex-col gap-4 lg:gap-6 p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
