import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getCronJobLogs, getCronJobStats, getPendingPlanChanges } from "@/actions/cron-logs";
import { DashboardHeader } from "@/components/dashboard/header";
import { CronLogsTable } from "@/components/admin/cron-logs-table";

export default async function AdminCronLogsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("admin");

  // Role check is handled by the admin layout
  if (!user) {
    redirect(`/${locale}/dashboard`);
  }

  const [logsResult, statsResult, pendingResult] = await Promise.all([
    getCronJobLogs({ limit: 100 }),
    getCronJobStats(),
    getPendingPlanChanges(),
  ]);

  const logs = logsResult.logs || [];
  const stats = statsResult.stats;
  const pendingChanges = pendingResult.pendingChanges || [];

  return (
    <>
      <DashboardHeader heading={t("cronLogs")} text={t("cronLogsDesc")} />
      <CronLogsTable logs={logs} pendingChanges={pendingChanges} stats={stats} />
    </>
  );
}
