import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getRsvpPageSettings, getTemplates } from "@/actions/rsvp-settings";
import { getCurrentUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { RsvpCustomizer } from "@/components/rsvp/rsvp-customizer";

interface CustomizePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function CustomizePage({ params }: CustomizePageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("rsvpSettings");

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const settingsResult = await getRsvpPageSettings(eventId);
  const templatesResult = await getTemplates();

  if (settingsResult.error || !settingsResult.event) {
    notFound();
  }

  const { settings, event } = settingsResult;
  const templates = templatesResult.templates || [];

  return (
    <>
      {/* <DashboardHeader
        heading={t("title")}
        text={event.title}
      /> */}
      <RsvpCustomizer
        eventId={eventId}
        event={event}
        initialSettings={settings}
        templates={templates}
        locale={locale}
      />
    </>
  );
}
