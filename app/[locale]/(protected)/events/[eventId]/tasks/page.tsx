import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getTasks } from "@/actions/tasks";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface TasksPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TasksPage({ params }: TasksPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("tasks");
  const isRTL = locale === "he";

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
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
      {/* Header */}
      <div className={cn("space-y-1 mb-6", isRTL && "text-right")}>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{`${t("manageTasks")} - ${event.title}`}</p>
      </div>

      {/* Tasks Content */}
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
