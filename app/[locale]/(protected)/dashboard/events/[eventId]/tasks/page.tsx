import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getTasks } from "@/actions/tasks";
import { DashboardHeader } from "@/components/dashboard/header";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";
import { PageFadeIn } from "@/components/shared/page-fade-in";

interface TasksEventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TasksEventPage({ params }: TasksEventPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("tasks");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  // Verify event exists and belongs to user
  const event = await prisma.weddingEvent.findFirst({
    where: {
      id: eventId,
      ownerId: user.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!event) {
    notFound();
  }

  const result = await getTasks(eventId);

  return (
    <PageFadeIn className="flex flex-1 flex-col">
      <DashboardHeader
        heading={t("title")}
        text={`${t("manageTasks")} - ${event.title}`}
      />
      <div className="flex flex-1 flex-col pb-4">
        <TasksPageClient
          eventId={eventId}
          initialTasks={result.tasks || []}
          locale={locale}
        />
      </div>
    </PageFadeIn>
  );
}
