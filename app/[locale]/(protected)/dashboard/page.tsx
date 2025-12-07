import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getUserEvents } from "@/actions/events";
import { getCurrentUserUsage } from "@/actions/notifications";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("dashboard");

  // For Platform Owners, show admin redirect
  if (user?.role === UserRole.ROLE_PLATFORM_OWNER) {
    return (
      <>
        <DashboardHeader heading={t("title")} text={`${t("welcome")}, ${user?.name}`} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.laptop className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("platformOwnerTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("platformOwnerDesc")}
            </p>
            <Button asChild className="mt-4">
              <Link href={`/${locale}/admin`}>
                {t("goToAdmin")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  // For Wedding Owners - fetch events and usage in parallel
  const [eventsResult, usageResult] = await Promise.all([
    getUserEvents(),
    getCurrentUserUsage(),
  ]);

  const events = eventsResult.success ? eventsResult.events : [];
  const usageData = usageResult.success ? usageResult : null;

  // Calculate overall stats
  const totalGuests = events?.reduce((sum, e) => sum + e.stats.total, 0) || 0;
  const totalPending = events?.reduce((sum, e) => sum + e.stats.pending, 0) || 0;
  const totalAccepted = events?.reduce((sum, e) => sum + e.stats.accepted, 0) || 0;
  const totalDeclined = events?.reduce((sum, e) => sum + e.stats.declined, 0) || 0;
  const totalAttending = events?.reduce((sum, e) => sum + e.stats.totalGuestCount, 0) || 0;

  const stats = {
    totalEvents: events?.length || 0,
    totalGuests,
    totalPending,
    totalAccepted,
    totalDeclined,
    totalAttending,
  };

  return (
    <DashboardContent
      userName={user?.name || ""}
      events={events || []}
      stats={stats}
      locale={locale}
      usageData={usageData ? {
        plan: usageData.plan,
        whatsapp: usageData.usage.whatsapp,
        sms: usageData.usage.sms,
        canSendMessages: usageData.canSendMessages,
      } : undefined}
    />
  );
}
