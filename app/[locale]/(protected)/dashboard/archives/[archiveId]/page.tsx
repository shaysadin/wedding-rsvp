import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getArchiveDetails } from "@/actions/archives";
import { DashboardHeader } from "@/components/dashboard/header";
import { ArchiveDetailClient } from "@/components/archives/archive-detail-client";
import { PageFadeIn } from "@/components/shared/page-fade-in";

interface ArchiveDetailPageProps {
  params: Promise<{ archiveId: string }>;
}

export default async function ArchiveDetailPage({
  params,
}: ArchiveDetailPageProps) {
  const { archiveId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("archives");

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getArchiveDetails(archiveId);

  if (result.error || !result.snapshot) {
    notFound();
  }

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={result.snapshot.event.title}
        text={t("archivedEventDetails")}
      />
      <ArchiveDetailClient snapshot={result.snapshot} locale={locale} />
    </PageFadeIn>
  );
}
