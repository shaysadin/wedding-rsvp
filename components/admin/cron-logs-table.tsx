"use client";

import { useState } from "react";
import { CronJobLog, CronJobStatus, CronJobType, PlanTier } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { cancelPendingPlanChange } from "@/actions/cron-logs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/shared/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Type for pending plan change from user
export type PendingPlanChange = {
  id: string;
  email: string;
  name: string | null;
  plan: PlanTier;
  pendingPlanChange: PlanTier | null;
  pendingPlanChangeDate: Date | null;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
};

interface CronLogsTableProps {
  logs: CronJobLog[];
  pendingChanges?: PendingPlanChange[];
  stats?: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    last24h: number;
  };
}

const statusColors: Record<CronJobStatus, string> = {
  SUCCESS: "bg-green-500/10 text-green-500",
  FAILED: "bg-red-500/10 text-red-500",
  SKIPPED: "bg-yellow-500/10 text-yellow-500",
};

const statusIcons: Record<CronJobStatus, keyof typeof Icons> = {
  SUCCESS: "check",
  FAILED: "close",
  SKIPPED: "info",
};

const planColors: Record<PlanTier, string> = {
  FREE: "bg-gray-500/10 text-gray-500",
  BASIC: "bg-blue-500/10 text-blue-500",
  ADVANCED: "bg-indigo-500/10 text-indigo-500",
  PREMIUM: "bg-purple-500/10 text-purple-500",
  BUSINESS: "bg-amber-500/10 text-amber-500",
};

export function CronLogsTable({ logs, pendingChanges, stats }: CronLogsTableProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const ts = useTranslations("success");
  const tPlans = useTranslations("plans");
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const handleCancelPendingChange = async (userId: string) => {
    setCancellingId(userId);
    try {
      const result = await cancelPendingPlanChange(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("pendingChangeCancelled"));
        router.refresh();
      }
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setCancellingId(null);
    }
  };

  const hasPendingChanges = pendingChanges && pendingChanges.length > 0;

  if (logs.length === 0 && !stats && !hasPendingChanges) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <Icons.calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">{t("noCronLogs")}</p>
        <p className="text-sm text-muted-foreground">{t("noCronLogsDesc")}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tc("total")}</CardTitle>
                <Icons.calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("successful")}</CardTitle>
                <Icons.check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.success}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("failed")}</CardTitle>
                <Icons.close className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("skipped")}</CardTitle>
                <Icons.info className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{stats.skipped}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("last24h")}</CardTitle>
                <Icons.clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.last24h}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Plan Changes Section */}
        {hasPendingChanges && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.clock className="h-5 w-5 text-orange-500" />
                {t("pendingChanges")}
              </CardTitle>
              <CardDescription>{t("pendingChangesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("user")}</TableHead>
                      <TableHead>{t("planChange")}</TableHead>
                      <TableHead>{t("scheduledFor")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead className="text-end">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingChanges.map((change) => {
                      const now = new Date();
                      const scheduledDate = change.pendingPlanChangeDate
                        ? new Date(change.pendingPlanChangeDate)
                        : null;
                      const isOverdue = scheduledDate && scheduledDate < now;
                      const isDueSoon = scheduledDate && !isOverdue &&
                        (scheduledDate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000;
                      const isCancelling = cancellingId === change.id;

                      return (
                        <TableRow key={change.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{change.name || change.email}</p>
                              <p className="text-xs text-muted-foreground">{change.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {change.pendingPlanChange && (
                              <div className="flex items-center gap-1">
                                <Badge className={planColors[change.plan]} variant="secondary">
                                  {tPlans(change.plan.toLowerCase() as any)}
                                </Badge>
                                <Icons.arrowRight className="h-3 w-3 text-muted-foreground" />
                                <Badge className={planColors[change.pendingPlanChange]} variant="secondary">
                                  {tPlans(change.pendingPlanChange.toLowerCase() as any)}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {scheduledDate ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-sm ${isOverdue ? "text-red-500 font-medium" : isDueSoon ? "text-orange-500" : ""}`}>
                                    {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {formatDate(scheduledDate)}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">{t("noPendingDate")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge className="bg-red-500/10 text-red-500" variant="secondary">
                                <Icons.alertTriangle className="me-1 h-3 w-3" />
                                {t("overdue")}
                              </Badge>
                            ) : isDueSoon ? (
                              <Badge className="bg-orange-500/10 text-orange-500" variant="secondary">
                                <Icons.clock className="me-1 h-3 w-3" />
                                {t("dueSoon")}
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/10 text-blue-500" variant="secondary">
                                <Icons.calendar className="me-1 h-3 w-3" />
                                {t("scheduled")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isCancelling}
                                >
                                  {isCancelling ? (
                                    <Icons.spinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Icons.close className="h-4 w-4" />
                                  )}
                                  <span className="ms-1">{tc("cancel")}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("cancelPendingChangeTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("cancelPendingChangeDesc", {
                                      email: change.email,
                                      fromPlan: change.plan,
                                      toPlan: change.pendingPlanChange || ""
                                    })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancelPendingChange(change.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t("confirmCancel")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Section */}
        {logs.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <Icons.calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">{t("noCronLogs")}</p>
            <p className="text-sm text-muted-foreground">{t("noCronLogsDesc")}</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{t("jobType")}</TableHead>
                  <TableHead>{tc("user")}</TableHead>
                  <TableHead>{t("planChange")}</TableHead>
                  <TableHead>{t("scheduledFor")}</TableHead>
                  <TableHead>{t("executedAt")}</TableHead>
                  <TableHead>{t("details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const StatusIcon = Icons[statusIcons[log.status]];

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={statusColors[log.status]} variant="secondary">
                          <StatusIcon className="me-1 h-3 w-3" />
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.jobType === CronJobType.PLAN_CHANGE
                            ? t("planChange")
                            : t("bulkMessage")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.userEmail ? (
                          <div>
                            <p className="text-sm font-medium">{log.userEmail}</p>
                            <p className="text-xs text-muted-foreground">{log.userId}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.fromPlan && log.toPlan ? (
                          <div className="flex items-center gap-1">
                            <Badge className={planColors[log.fromPlan]} variant="secondary">
                              {tPlans(log.fromPlan.toLowerCase() as any)}
                            </Badge>
                            <Icons.arrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge className={planColors[log.toPlan]} variant="secondary">
                              {tPlans(log.toPlan.toLowerCase() as any)}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.scheduledFor ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(log.scheduledFor), {
                                  addSuffix: true,
                                })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDate(log.scheduledFor)}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(log.executedAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatDate(log.executedAt)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {(log.message || log.errorDetails) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[200px] truncate text-sm">
                                {log.errorDetails ? (
                                  <span className="text-red-500">{log.errorDetails}</span>
                                ) : (
                                  <span>{log.message}</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[400px]">
                              <p className="whitespace-pre-wrap">
                                {log.errorDetails || log.message}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
