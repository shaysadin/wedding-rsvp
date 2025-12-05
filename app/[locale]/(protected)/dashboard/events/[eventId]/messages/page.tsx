import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { getEventTemplates, initializeEventTemplates } from "@/actions/message-templates";
import { DashboardHeader } from "@/components/dashboard/header";
import { MessageTemplateList } from "@/components/dashboard/message-template-list";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface MessagesPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("messageTemplates");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  // Initialize default templates if needed
  await initializeEventTemplates(eventId, locale);

  const result = await getEventTemplates(eventId);

  if (!result.success || !result.event) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0">
          <Link href={`/${locale}/dashboard/events/${eventId}`}>
            <Icons.chevronLeft className="h-5 w-5" />
            <span className="sr-only">{t("backToEvent")}</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageDescription", { eventTitle: result.event.title })}</p>
        </div>
      </div>

      <MessageTemplateList
        templates={result.templates || []}
        eventId={eventId}
        eventTitle={result.event.title}
        locale={locale}
        smsSenderId={result.event.smsSenderId}
      />
    </>
  );
}
