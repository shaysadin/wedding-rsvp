import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForTasksSelector } from "@/actions/event-selector";
import { TasksEventSelector } from "@/components/events/tasks-event-selector";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("tasks");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForTasksSelector();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <PageFadeIn>
      <TasksEventSelector
        events={result.events}
        title={t("title")}
        description={t("selectEventDescription")}
        locale={locale}
      />
    </PageFadeIn>
  );
}
