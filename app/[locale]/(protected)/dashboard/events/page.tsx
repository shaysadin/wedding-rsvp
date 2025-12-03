import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getUserEvents } from "@/actions/events";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { EventCard } from "@/components/events/event-card";

export default async function EventsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("events");
  const td = await getTranslations("dashboard");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getUserEvents();
  const events = result.success ? result.events : [];

  return (
    <>
      <DashboardHeader heading={t("title")} text={td("manageEvents")}>
        <Button asChild>
          <Link href={`/${locale}/dashboard/events/new`}>
            <Icons.add className="me-2 h-4 w-4" />
            {t("create")}
          </Link>
        </Button>
      </DashboardHeader>

      {!events || events.length === 0 ? (
        <EmptyPlaceholder className="min-h-[400px]">
          <EmptyPlaceholder.Icon name="calendar" />
          <EmptyPlaceholder.Title>{t("noEvents")}</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            {t("createFirst")}
          </EmptyPlaceholder.Description>
          <Button asChild>
            <Link href={`/${locale}/dashboard/events/new`}>
              <Icons.add className="me-2 h-4 w-4" />
              {t("create")}
            </Link>
          </Button>
        </EmptyPlaceholder>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}
