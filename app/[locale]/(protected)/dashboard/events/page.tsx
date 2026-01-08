import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getUserEvents } from "@/actions/events";
import { EventsPageClient } from "@/components/events/events-page-client";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function EventsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getUserEvents();
  const events = result.success ? result.events : [];

  return (
    <PageFadeIn>
      <EventsPageClient events={events ?? []} locale={locale} />
    </PageFadeIn>
  );
}
