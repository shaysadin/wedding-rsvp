import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForSuppliersSelector } from "@/actions/event-selector";
import { SuppliersEventSelector } from "@/components/events/suppliers-event-selector";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("suppliers");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForSuppliersSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <PageFadeIn>
      <SuppliersEventSelector
        events={result.events}
        title={t("title")}
        description={t("selectEventDescription")}
        locale={locale}
      />
    </PageFadeIn>
  );
}
