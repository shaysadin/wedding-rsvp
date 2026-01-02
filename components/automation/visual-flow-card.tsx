"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  Play,
  Pause,
  Trash2,
  Edit,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { FlowNode, FlowConnector } from "./flow-node";
import { AutomationFlowStatus, AutomationTrigger, AutomationAction } from "@prisma/client";

interface FlowStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  skipped: number;
}

interface VisualFlowCardProps {
  flow: {
    id: string;
    name: string;
    trigger: AutomationTrigger;
    action: AutomationAction;
    status: AutomationFlowStatus;
    customMessage?: string | null;
    delayHours?: number | null;
    stats: FlowStats;
  };
  onActivate: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

const STATUS_CONFIG: Record<AutomationFlowStatus, {
  label: { en: string; he: string };
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  DRAFT: {
    label: { en: "Draft", he: "טיוטה" },
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    borderColor: "border-gray-300 dark:border-gray-600",
    dotColor: "bg-gray-400",
  },
  ACTIVE: {
    label: { en: "Active", he: "פעיל" },
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    dotColor: "bg-green-500",
  },
  PAUSED: {
    label: { en: "Paused", he: "מושהה" },
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-700",
    dotColor: "bg-amber-500",
  },
  ARCHIVED: {
    label: { en: "Archived", he: "בארכיון" },
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
    dotColor: "bg-red-500",
  },
};

export function VisualFlowCard({
  flow,
  onActivate,
  onPause,
  onDelete,
  onEdit,
  onViewDetails,
}: VisualFlowCardProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = STATUS_CONFIG[flow.status];
  const isActive = flow.status === "ACTIVE";

  const successRate = flow.stats.total > 0
    ? Math.round((flow.stats.completed / flow.stats.total) * 100)
    : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown or buttons
    if ((e.target as HTMLElement).closest('[data-no-click]')) {
      return;
    }
    if (onViewDetails) {
      onViewDetails(flow.id);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        isActive && "ring-2 ring-green-500/20",
        onViewDetails && "cursor-pointer hover:-translate-y-1"
      )}
      onClick={handleCardClick}
    >
      {/* Animated status indicator for active flows */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 bg-[length:200%_100%] animate-gradient" />
      )}

      {/* Status bar for non-active flows */}
      {!isActive && (
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          flow.status === "PAUSED" && "bg-amber-500",
          flow.status === "DRAFT" && "bg-gray-400",
          flow.status === "ARCHIVED" && "bg-red-500"
        )} />
      )}

      <CardContent className="p-4 pt-6">
        {/* Header */}
        <div className={cn("flex items-start justify-between mb-4", isRTL && "flex-row-reverse")}>
          <div className={cn("flex-1", isRTL && "text-right")}>
            <div className={cn("flex items-center gap-2 mb-1", isRTL && "flex-row-reverse")}>
              <h3 className="text-lg font-semibold">{flow.name}</h3>
              {isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                statusConfig.color,
                statusConfig.bgColor,
                statusConfig.borderColor
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dotColor)} />
              {isRTL ? statusConfig.label.he : statusConfig.label.en}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-no-click>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} data-no-click>
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(flow.id)}>
                  <Settings className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {isRTL ? "הגדרות ופרטים" : "Settings & Details"}
                </DropdownMenuItem>
              )}
              {flow.status === "ACTIVE" ? (
                <DropdownMenuItem onClick={() => onPause(flow.id)}>
                  <Pause className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {isRTL ? "השהה" : "Pause"}
                </DropdownMenuItem>
              ) : flow.status !== "ARCHIVED" ? (
                <DropdownMenuItem onClick={() => onActivate(flow.id)}>
                  <Play className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {isRTL ? "הפעל" : "Activate"}
                </DropdownMenuItem>
              ) : null}
              {onEdit && flow.status !== "ARCHIVED" && (
                <DropdownMenuItem onClick={() => onEdit(flow.id)}>
                  <Edit className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {isRTL ? "ערוך הודעה" : "Edit Message"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(flow.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {isRTL ? "מחק" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Visual Flow */}
        <div className="mb-4 py-3 px-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col items-center space-y-1 scale-[0.85] origin-center">
            <FlowNode type="trigger" value={flow.trigger} delayHours={flow.delayHours ?? undefined} isActive={isActive} />
            <FlowConnector isActive={isActive} />
            <FlowNode type="action" value={flow.action} isActive={isActive} />
          </div>
        </div>

        {/* Stats */}
        {flow.stats.total > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded} data-no-click>
            <div className="space-y-3">
              {/* Quick Stats */}
              <div className={cn(
                "grid grid-cols-4 gap-2 text-center",
                isRTL && "direction-rtl"
              )}>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {flow.stats.pending}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                    {isRTL ? "ממתין" : "Pending"}
                  </span>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {flow.stats.completed}
                    </span>
                  </div>
                  <span className="text-[10px] text-green-600/70 dark:text-green-400/70">
                    {isRTL ? "הושלם" : "Sent"}
                  </span>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {flow.stats.failed}
                    </span>
                  </div>
                  <span className="text-[10px] text-red-600/70 dark:text-red-400/70">
                    {isRTL ? "נכשל" : "Failed"}
                  </span>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {flow.stats.skipped}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500/70 dark:text-gray-400/70">
                    {isRTL ? "דילג" : "Skipped"}
                  </span>
                </div>
              </div>

              {/* Expandable Details */}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      {isRTL ? "הסתר פרטים" : "Hide details"}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {isRTL ? "הצג פרטים" : "Show details"}
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3">
                {/* Success Rate */}
                <div className="space-y-1">
                  <div className={cn(
                    "flex items-center justify-between text-xs",
                    isRTL && "flex-row-reverse"
                  )}>
                    <span className="text-muted-foreground">
                      {isRTL ? "אחוז הצלחה" : "Success Rate"}
                    </span>
                    <span className="font-medium">{successRate}%</span>
                  </div>
                  <Progress value={successRate} className="h-1.5" />
                </div>

                {/* Custom Message Preview */}
                {flow.customMessage && (
                  <div className={cn(
                    "text-xs p-2 rounded-lg bg-muted/50",
                    isRTL && "text-right"
                  )}>
                    <span className="text-muted-foreground block mb-1">
                      {isRTL ? "הודעה מותאמת:" : "Custom message:"}
                    </span>
                    <span className="text-foreground line-clamp-2">
                      {flow.customMessage}
                    </span>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Quick Action for Draft/Paused */}
        {(flow.status === "DRAFT" || flow.status === "PAUSED") && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onActivate(flow.id);
            }}
            className="w-full mt-3 gap-2"
            size="sm"
            data-no-click
          >
            <Play className="h-4 w-4" />
            {isRTL ? "הפעל אוטומציה" : "Activate Automation"}
          </Button>
        )}
      </CardContent>

      {/* CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </Card>
  );
}
