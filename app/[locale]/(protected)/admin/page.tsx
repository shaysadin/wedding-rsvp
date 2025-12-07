import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole, PlanTier, UserStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getAdminStats, getRecentUsers, getUsageStats } from "@/actions/admin";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/shared/icons";

const statusColors: Record<UserStatus, string> = {
  PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-500",
  ACTIVE: "bg-green-500/10 text-green-500",
  SUSPENDED: "bg-red-500/10 text-red-500",
};

const planColors: Record<PlanTier, string> = {
  FREE: "bg-gray-500/10 text-gray-500",
  BASIC: "bg-blue-500/10 text-blue-500",
  ADVANCED: "bg-indigo-500/10 text-indigo-500",
  PREMIUM: "bg-purple-500/10 text-purple-500",
  BUSINESS: "bg-amber-500/10 text-amber-500",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const tPlans = await getTranslations("plans");
  const tStatus = await getTranslations("status");

  if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const [statsResult, recentUsersResult, usageStatsResult] = await Promise.all([
    getAdminStats(),
    getRecentUsers(5),
    getUsageStats(),
  ]);

  const stats = statsResult.success ? statsResult.stats : null;
  const recentUsers = recentUsersResult.success ? recentUsersResult.users : [];
  const usageStats = usageStatsResult.success ? usageStatsResult.stats : null;

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
            <CardTitle className="text-sm font-medium">{t("suspendedUsers")}</CardTitle>
            <Icons.userX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.suspendedUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("accountsSuspended")}
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

      {/* Second row: Message Stats + Quick Actions */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("messagesSent")}</CardTitle>
            <Icons.messageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Icons.messageSquare className="h-4 w-4 text-green-500" />
                  WhatsApp
                </span>
                <span className="font-bold">{usageStats?.totalWhatsappSent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Icons.phone className="h-4 w-4 text-blue-500" />
                  SMS
                </span>
                <span className="font-bold">{usageStats?.totalSmsSent || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("recentActivity")}</CardTitle>
            <Icons.activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("newEventsThisWeek")}</span>
                <span className="font-bold">{usageStats?.recentEvents || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("rsvpsThisWeek")}</span>
                <span className="font-bold">{usageStats?.recentRsvps || 0}</span>
              </div>
              {usageStats?.pendingApprovals && usageStats.pendingApprovals > 0 && (
                <div className="flex items-center justify-between text-yellow-600">
                  <span className="text-sm">{t("pendingApproval")}</span>
                  <span className="font-bold">{usageStats.pendingApprovals}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("quickActions")}</CardTitle>
            <Icons.zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href={`/${locale}/admin/users`}>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Icons.users className="me-2 h-4 w-4" />
                  {t("manageUsers")}
                </Button>
              </Link>
              <Link href={`/${locale}/admin/messaging`}>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Icons.settings className="me-2 h-4 w-4" />
                  {t("messagingSettings")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("recentUsers")}</CardTitle>
            <CardDescription>{t("recentUsersDesc")}</CardDescription>
          </div>
          <Link href={`/${locale}/admin/users`}>
            <Button variant="outline" size="sm">
              {t("viewAll")}
              <Icons.arrowRight className="ms-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentUsers && recentUsers.length > 0 ? (
            <div className="space-y-4">
              {recentUsers.map((u) => {
                const usage = u.usageTracking;
                const whatsappSent = usage?.whatsappSent || 0;
                const whatsappBonus = usage?.whatsappBonus || 0;
                const whatsappTotal = u.planLimits.maxWhatsappMessages + whatsappBonus;
                const whatsappPercent = whatsappTotal > 0 ? Math.round((whatsappSent / whatsappTotal) * 100) : 0;

                return (
                  <div key={u.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.image || ""} alt={u.name || ""} />
                        <AvatarFallback>
                          {u.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={planColors[u.plan]} variant="secondary">
                        {tPlans(u.plan.toLowerCase() as "free" | "basic" | "advanced" | "premium")}
                      </Badge>
                      <Badge className={statusColors[u.status]} variant="secondary">
                        {tStatus(u.status.toLowerCase() as "active" | "suspended" | "pending_approval")}
                      </Badge>
                    </div>
                    <div className="hidden min-w-[120px] md:block">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>WhatsApp</span>
                        <span>{whatsappSent}/{whatsappTotal}</span>
                      </div>
                      <Progress value={whatsappPercent} className="h-1.5" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {u._count.weddingEvents} {tc("events").toLowerCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">{tc("noResults")}</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
