import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForAutomationsSelector } from "@/actions/event-selector";
import { AutomationsEventSelector } from "@/components/events/automations-event-selector";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function AutomationsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("automation");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForAutomationsSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <PageFadeIn>
      <AutomationsEventSelector
        events={result.events}
        title={t("title")}
        description={t("selectEventDescription")}
        locale={locale}
      />
    </PageFadeIn>
  );
}
