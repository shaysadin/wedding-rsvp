import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForMessagesSelector } from "@/actions/event-selector";
import { MessagesEventSelector } from "@/components/events/messages-event-selector";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("events");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForMessagesSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <PageFadeIn>
      <MessagesEventSelector
        events={result.events}
        title={t("messageTemplates")}
        description={t("selectEventForMessages")}
        locale={locale}
      />
    </PageFadeIn>
  );
}
