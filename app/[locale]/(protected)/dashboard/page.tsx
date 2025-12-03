import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getUserEvents } from "@/actions/events";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";

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

  // For Wedding Owners
  const result = await getUserEvents();
  const events = result.success ? result.events : [];

  // Calculate overall stats
  const totalGuests = events?.reduce((sum, e) => sum + e.stats.total, 0) || 0;
  const totalPending = events?.reduce((sum, e) => sum + e.stats.pending, 0) || 0;
  const totalAccepted = events?.reduce((sum, e) => sum + e.stats.accepted, 0) || 0;
  const totalAttending = events?.reduce((sum, e) => sum + e.stats.totalGuestCount, 0) || 0;

  return (
    <>
      <DashboardHeader heading={t("title")} text={`${t("welcome")}, ${user?.name}`} />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalEvents")}</CardTitle>
            <Icons.calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalGuests")}</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGuests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingRsvps")}</CardTitle>
            <Icons.bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("confirmedGuests")}</CardTitle>
            <Icons.check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccepted}</div>
            <p className="text-xs text-muted-foreground">
              {t("totalAttending", { count: totalAttending })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href={`/${locale}/dashboard/events/new`}>
              <Icons.add className="me-2 h-4 w-4" />
              {t("createEvent")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>{t("upcomingEvents")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <EmptyPlaceholder>
              <EmptyPlaceholder.Icon name="calendar" />
              <EmptyPlaceholder.Title>{t("noEventsYet")}</EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                {t("createFirstEvent")}
              </EmptyPlaceholder.Description>
              <Button asChild>
                <Link href={`/${locale}/dashboard/events/new`}>
                  <Icons.add className="me-2 h-4 w-4" />
                  {t("createEvent")}
                </Link>
              </Button>
            </EmptyPlaceholder>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  href={`/${locale}/dashboard/events/${event.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.dateTime).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-medium">
                        {event.stats.accepted}/{event.stats.total} confirmed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.stats.totalGuestCount} attending
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
