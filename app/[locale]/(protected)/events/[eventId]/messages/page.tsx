import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEventTemplates, initializeEventTemplates } from "@/actions/message-templates";
import { MessageTemplateList } from "@/components/dashboard/message-template-list";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface MessagesPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("messageTemplates");
  const isRTL = locale === "he";

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Verify event exists and user has access (owner or collaborator)
  const event = await prisma.weddingEvent.findFirst({
    where: {
      id: eventId,
      isArchived: false,
      OR: [
        { ownerId: user.id },
        {
          collaborators: {
            some: {
              userId: user.id,
              acceptedAt: { not: null },
            },
          },
        },
      ],
    },
    select: { id: true, title: true },
  });

  if (!event) {
    notFound();
  }

  // Initialize default templates if needed
  await initializeEventTemplates(eventId, locale);

  const result = await getEventTemplates(eventId);

  if (!result.success || !result.event) {
    notFound();
  }

  return (
    <PageFadeIn>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className={cn("space-y-1", isRTL && "text-right")}>
          <h1 className="font-heading text-2xl font-semibold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription", { eventTitle: result.event.title })}
          </p>
        </div>
      </div>

      <MessageTemplateList
        templates={result.templates || []}
        eventId={eventId}
        eventTitle={result.event.title}
        locale={locale}
        smsSenderId={result.event.smsSenderId}
      />
    </PageFadeIn>
  );
}
