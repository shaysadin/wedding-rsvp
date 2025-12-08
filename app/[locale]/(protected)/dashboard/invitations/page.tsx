import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForInvitationsSelector } from "@/actions/event-selector";
import { InvitationsEventSelector } from "@/components/events/invitations-event-selector";

export default async function InvitationsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("invitations");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForInvitationsSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <InvitationsEventSelector
      events={result.events}
      title={t("title")}
      description={t("selectEventDescription")}
      locale={locale}
    />
  );
}
