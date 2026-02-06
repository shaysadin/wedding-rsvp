import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { MessagesPageContent } from "@/components/messages/messages-page-content";

export const metadata: Metadata = {
  title: "Message Templates",
  description: "Manage SMS and WhatsApp message templates",
};

interface MessagesPageProps {
  params: {
    eventId: string;
    locale: string;
  };
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  // Await params for Next.js 16 compatibility
  const resolvedParams = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  // Check if user can access this event
  const hasAccess = await canAccessEvent(resolvedParams.eventId, user.id);
  if (!hasAccess) {
    notFound();
  }

  // Get event details
  const event = await prisma.weddingEvent.findUnique({
    where: { id: resolvedParams.eventId },
    select: {
      id: true,
      title: true,
      dateTime: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Get translations
  const t = await getTranslations();
  const isRTL = resolvedParams.locale === "he";

  return (
    <div className="flex flex-col gap-6">
      <div className={isRTL ? "text-right" : "text-left"}>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("messages.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("messages.description")}
        </p>
      </div>

      <MessagesPageContent eventId={resolvedParams.eventId} locale={resolvedParams.locale} />
    </div>
  );
}
