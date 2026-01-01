"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckSquare, ListTodo, Clock, CheckCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TasksEventData } from "@/actions/event-selector";

interface TasksEventCardProps {
  event: TasksEventData;
  locale: string;
}

export function TasksEventCard({ event, locale }: TasksEventCardProps) {
  const t = useTranslations("tasks");
  const isRTL = locale === "he";

  const eventDate = new Date(event.dateTime);
  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const { taskStats } = event;

  return (
    <Link href={`/${locale}/dashboard/events/${event.id}/tasks`}>
      <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200">
        {/* Decorative top gradient */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />

        <CardContent className="p-5">
          {/* Header */}
          <div className={cn(
            "flex items-start justify-between gap-3",
            isRTL && "flex-row-reverse"
          )}>
            <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {formattedDate}
              </p>
            </div>
            <div className="shrink-0">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-violet-100 p-2 dark:from-purple-900/30 dark:to-violet-900/30">
                <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={cn(
            "mt-4 grid grid-cols-4 gap-2 text-center",
            isRTL && "direction-rtl"
          )}>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {taskStats.backlogCount}
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                {t("backlog")}
              </p>
            </div>
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                {taskStats.todoCount}
              </p>
              <p className="text-[9px] text-yellow-600/70 dark:text-yellow-400/70 truncate">
                {t("todo")}
              </p>
            </div>
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-2">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {taskStats.doingCount}
              </p>
              <p className="text-[9px] text-blue-600/70 dark:text-blue-400/70 truncate">
                {t("inProgress")}
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 p-2">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {taskStats.doneCount}
              </p>
              <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 truncate">
                {t("complete")}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className={cn(
              "mb-1 flex items-center justify-between text-xs",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {t("completionRate")}
              </span>
              <span className="font-medium">{taskStats.completionRate}%</span>
            </div>
            <Progress value={taskStats.completionRate} className="h-1.5" />
          </div>

          {/* Total tasks */}
          <div className={cn(
            "mt-3 flex items-center gap-1.5 text-xs text-muted-foreground",
            isRTL && "flex-row-reverse justify-end"
          )}>
            <ListTodo className="h-3.5 w-3.5" />
            <span>{taskStats.totalTasks} {t("totalTasks")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
