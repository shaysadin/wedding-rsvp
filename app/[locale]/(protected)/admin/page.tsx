import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getAdminStats, getPendingUsers } from "@/actions/admin";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { AdminPendingUsers } from "@/components/admin/pending-users";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");

  if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const [statsResult, pendingResult] = await Promise.all([
    getAdminStats(),
    getPendingUsers(),
  ]);

  const stats = statsResult.success ? statsResult.stats : null;
  const pendingUsers = pendingResult.success ? pendingResult.users : [];

  return (
    <>
      <DashboardHeader heading={t("title")} text={t("stats")} />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers || 0} {tc("active").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingApproval")}</CardTitle>
            <Icons.user className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {tc("awaitingReview")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalEvents")}</CardTitle>
            <Icons.calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {tc("weddingEvents")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalGuests")}</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGuests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalRsvps || 0} {tc("responses")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Users */}
      {pendingUsers && pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("pendingApproval")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminPendingUsers users={pendingUsers} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
