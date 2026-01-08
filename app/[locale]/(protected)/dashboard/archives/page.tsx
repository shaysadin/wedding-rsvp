import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getMyArchives } from "@/actions/archives";
import { DashboardHeader } from "@/components/dashboard/header";
import { ArchivesPageClient } from "@/components/archives/archives-page-client";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function ArchivesPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("archives");

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getMyArchives();
  const archives = result.success ? result.archives : [];
  const r2Configured = result.success ? result.r2Configured : false;

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={t("title")}
        text={t("description")}
      />
      <ArchivesPageClient
        archives={archives ?? []}
        locale={locale}
        r2Configured={r2Configured ?? false}
      />
    </PageFadeIn>
  );
}
