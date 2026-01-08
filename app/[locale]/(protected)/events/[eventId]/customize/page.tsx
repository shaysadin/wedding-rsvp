import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getRsvpPageSettings, getTemplates } from "@/actions/rsvp-settings";
import { RsvpCustomizerSkeleton } from "@/components/skeletons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
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
  const isRTL = locale === "he";

  // Allow both wedding owners and platform owners (admins)
  if (!user || (user.role !== UserRole.ROLE_WEDDING_OWNER && user.role !== UserRole.ROLE_PLATFORM_OWNER)) {
    redirect(`/${locale}/dashboard`);
  }

  // Verify event exists and belongs to user
  const eventCheck = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    select: { id: true },
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
    <PageFadeIn className="min-h-0 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 shrink-0">
        <div className={cn("space-y-1", isRTL && "text-right")}>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

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
