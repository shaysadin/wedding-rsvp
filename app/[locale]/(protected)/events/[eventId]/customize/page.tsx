import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getRsvpPageSettings, getTemplates } from "@/actions/rsvp-settings";
import { RsvpCustomizerSkeleton } from "@/components/skeletons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { cn } from "@/lib/utils";

// Lazy load the heavy RsvpCustomizer component
const RsvpCustomizer = dynamic(
  () => import("@/components/rsvp/rsvp-customizer").then((mod) => mod.RsvpCustomizer),
  {
    loading: () => <RsvpCustomizerSkeleton />,
  }
);

interface CustomizePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function CustomizePage({ params }: CustomizePageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("rsvpSettings");
  const tn = await getTranslations("navigation");
  const isRTL = locale === "he";

  // Allow both wedding owners and platform owners (admins)
  // Check if user has ROLE_WEDDING_OWNER or ROLE_PLATFORM_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  const hasPlatformOwnerRole = user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER);
  if (!user || (!hasWeddingOwnerRole && !hasPlatformOwnerRole)) {
    redirect(`/${locale}/dashboard`);
  }

  // Verify event exists and belongs to user
  const eventCheck = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    select: { id: true, title: true },
  });

  if (!eventCheck) {
    notFound();
  }

  const settingsResult = await getRsvpPageSettings(eventId);
  const templatesResult = await getTemplates();

  if (settingsResult.error || !settingsResult.event) {
    notFound();
  }

  const { settings, event } = settingsResult;
  const templates = templatesResult.templates || [];

  return (
    <PageFadeIn className="min-h-0 flex-1 flex flex-col space-y-6">
      {/* Page Breadcrumb */}
      <PageBreadcrumb
        pageTitle={tn("customize")}
        items={[
          { label: tn("home"), href: `/${locale}/dashboard` },
          { label: eventCheck.title, href: `/${locale}/events/${eventCheck.id}` },
        ]}
      />

      <div className="min-h-0 flex-1">
        <RsvpCustomizer
          eventId={eventId}
          event={event}
          initialSettings={settings}
          templates={templates}
          locale={locale}
        />
      </div>
    </PageFadeIn>
  );
}
