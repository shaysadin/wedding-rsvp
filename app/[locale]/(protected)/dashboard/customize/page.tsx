import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForCustomizeSelector } from "@/actions/event-selector";
import { CustomizeEventSelector } from "@/components/events/customize-event-selector";

export default async function CustomizePage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("events");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForCustomizeSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <CustomizeEventSelector
      events={result.events}
      title={t("customizeRsvp")}
      description={t("selectEventForCustomize")}
      locale={locale}
    />
  );
}
