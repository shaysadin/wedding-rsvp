import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { EventForm } from "@/components/events/event-form";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("events");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <>
      <DashboardHeader heading={t("create")} text={t("createDescription")} />
      <EventForm />
    </>
  );
}
