import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForSeatingSelector } from "@/actions/event-selector";
import { SeatingEventSelector } from "@/components/events/seating-event-selector";

export default async function SeatingPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("seating");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForSeatingSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <SeatingEventSelector
      events={result.events}
      title={t("title")}
      description={t("selectEventDescription")}
      locale={locale}
    />
  );
}
