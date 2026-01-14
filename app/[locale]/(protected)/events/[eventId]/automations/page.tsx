import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AutomationsPageContent } from "@/components/automation/automations-page-content";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";

interface AutomationsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function AutomationsPage({ params }: AutomationsPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("navigation");

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    select: { id: true, title: true, dateTime: true, location: true },
  });

  if (!event) {
    notFound();
  }

  const events = [{
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
  }];

  return (
    <PageFadeIn className="space-y-6">
      <PageBreadcrumb
        pageTitle={t("automations")}
        items={[
          { label: t("home"), href: `/${locale}/dashboard` },
          { label: event.title, href: `/${locale}/events/${event.id}` },
        ]}
      />
      <AutomationsPageContent
        eventId={eventId}
        events={events}
        locale={locale}
      />
    </PageFadeIn>
  );
}
