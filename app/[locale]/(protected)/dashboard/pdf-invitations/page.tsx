import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForPdfInvitationsSelector } from "@/actions/event-selector";
import { PdfInvitationsEventSelector } from "@/components/events/pdf-invitations-event-selector";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function PdfInvitationsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("pdfInvitations");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForPdfInvitationsSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <PageFadeIn>
      <PdfInvitationsEventSelector
        events={result.events}
        title={t("title")}
        description={t("selectEventDescription")}
        locale={locale}
      />
    </PageFadeIn>
  );
}
