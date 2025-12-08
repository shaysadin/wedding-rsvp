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

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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
