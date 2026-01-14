import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEventTemplates, initializeEventTemplates } from "@/actions/message-templates";
import { MessageTemplateList } from "@/components/dashboard/message-template-list";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { cn } from "@/lib/utils";

interface MessagesPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("messageTemplates");
  const tn = await getTranslations("navigation");
  const isRTL = locale === "he";

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Verify event exists and belongs to user
  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
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
    <PageFadeIn className="space-y-6">
      {/* Page Breadcrumb */}
      <PageBreadcrumb
        pageTitle={tn("messages")}
        items={[
          { label: tn("home"), href: `/${locale}/dashboard` },
          { label: event.title, href: `/${locale}/events/${event.id}` },
        ]}
      />

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
