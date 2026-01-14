import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/actions/events";
import { GuestsTableSkeleton } from "@/components/skeletons";
import { DuplicatePhoneWarning } from "@/components/guests/duplicate-phone-warning";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";

// Lazy load the heavy UnifiedGuestsPage component
const UnifiedGuestsPage = dynamic(
  () => import("@/components/guests/unified-guests-page").then((mod) => mod.UnifiedGuestsPage),
  {
    loading: () => <GuestsTableSkeleton />,
  }
);

interface GuestsPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export default async function GuestsPage({ params, searchParams }: GuestsPageProps) {
  const { eventId } = await params;
  const { filter } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("navigation");

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventById(eventId);

  if (result.error || !result.event) {
    notFound();
  }

  const event = result.event;

  // Validate filter parameter
  const validFilters = ["all", "pending", "accepted", "declined"];
  const activeFilter = filter && validFilters.includes(filter) ? filter : "all";

  return (
    <PageFadeIn className="space-y-6">
      {/* Page Breadcrumb */}
      <PageBreadcrumb
        pageTitle={t("guests")}
        items={[
          { label: t("home"), href: `/${locale}/dashboard` },
          { label: event.title, href: `/${locale}/events/${event.id}` },
        ]}
      />

      {/* Duplicate Phone Warning */}
      <DuplicatePhoneWarning eventId={event.id} />

      {/* Unified Guests Page */}
      <UnifiedGuestsPage
        guests={event.guests}
        eventId={event.id}
        initialFilter={activeFilter}
        invitationImageUrl={event.invitationImageUrl}
      />
    </PageFadeIn>
  );
}
