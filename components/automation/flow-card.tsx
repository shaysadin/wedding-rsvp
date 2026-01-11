"use client";

import { useLocale } from "next-intl";
import { Play, Pause, Trash2, Edit, MoreHorizontal, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutomationFlowStatus, AutomationTrigger, AutomationAction } from "@prisma/client";

interface FlowStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  skipped: number;
}

interface FlowCardProps {
  flow: {
    id: string;
    name: string;
    trigger: AutomationTrigger;
    action: AutomationAction;
    status: AutomationFlowStatus;
    customMessage?: string | null;
    stats: FlowStats;
  };
  onActivate: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

const TRIGGER_LABELS: Record<AutomationTrigger, { en: string; he: string; icon: string }> = {
  // Core Triggers (visible in UI)
  RSVP_CONFIRMED: { en: "Guest Confirmed", he: "אורח אישר הגעה", icon: "✅" },
  RSVP_DECLINED: { en: "Guest Declined", he: "אורח סירב", icon: "❌" },
  RSVP_MAYBE: { en: "Guest Maybe", he: "אורח אולי", icon: "🤔" },
  NO_RESPONSE_WHATSAPP: { en: "No Response (WhatsApp)", he: "ללא תגובה (וואטסאפ)", icon: "💬" },
  NO_RESPONSE_SMS: { en: "No Response (SMS)", he: "ללא תגובה (SMS)", icon: "📱" },
  BEFORE_EVENT: { en: "Before Event", he: "לפני האירוע", icon: "⏱️" },
  AFTER_EVENT: { en: "After Event", he: "אחרי האירוע", icon: "🌙" },
  // Legacy triggers (hidden from UI)
  RSVP_SENT: { en: "RSVP Sent", he: "הזמנה נשלחה", icon: "📤" },
  NO_RESPONSE: { en: "No Response", he: "ללא תגובה", icon: "⏰" },
  NO_RESPONSE_24H: { en: "No Response (24h)", he: "ללא תגובה (24 שעות)", icon: "⏰" },
  NO_RESPONSE_48H: { en: "No Response (48h)", he: "ללא תגובה (48 שעות)", icon: "⏰" },
  NO_RESPONSE_72H: { en: "No Response (72h)", he: "ללא תגובה (72 שעות)", icon: "⏰" },
  EVENT_DAY_MORNING: { en: "Event Morning", he: "בוקר האירוע", icon: "🌅" },
  DAY_AFTER_MORNING: { en: "Day After", he: "יום אחרי", icon: "☀️" },
  EVENT_MORNING: { en: "Event Morning", he: "בוקר האירוע", icon: "🌅" },
  HOURS_BEFORE_EVENT_2: { en: "2 Hours Before", he: "שעתיים לפני", icon: "⏱️" },
  DAY_AFTER_EVENT: { en: "Day After Event", he: "יום לאחר האירוע", icon: "☀️" },
};

const ACTION_LABELS: Record<AutomationAction, { en: string; he: string; icon: string }> = {
  // Core Actions (visible in UI)
  SEND_WHATSAPP_INVITE: { en: "WhatsApp Invite", he: "הזמנה בוואטסאפ", icon: "💬" },
  SEND_WHATSAPP_REMINDER: { en: "WhatsApp Reminder", he: "תזכורת בוואטסאפ", icon: "💬" },
  SEND_WHATSAPP_CONFIRMATION: { en: "Confirmation", he: "אישור בוואטסאפ", icon: "💬" },
  SEND_WHATSAPP_IMAGE_INVITE: { en: "Image Invite", he: "הזמנה עם תמונה", icon: "🖼️" },
  SEND_WHATSAPP_INTERACTIVE_REMINDER: { en: "Interactive Reminder", he: "תזכורת אינטראקטיבית", icon: "🔘" },
  SEND_WHATSAPP_GUEST_COUNT: { en: "Guest Count", he: "מספר אורחים", icon: "👥" },
  SEND_TABLE_ASSIGNMENT: { en: "Table Assignment", he: "שיבוץ לשולחן", icon: "🪑" },
  SEND_CUSTOM_WHATSAPP: { en: "Custom WhatsApp", he: "וואטסאפ מותאם", icon: "✏️" },
  SEND_CUSTOM_SMS: { en: "Custom SMS", he: "SMS מותאם", icon: "📱" },
  // Event Day & Thank You Actions
  SEND_WHATSAPP_EVENT_DAY: { en: "Event Day", he: "יום האירוע", icon: "🎉" },
  SEND_WHATSAPP_THANK_YOU: { en: "Thank You", he: "תודה", icon: "💝" },
  // Legacy Actions (hidden from UI)
  SEND_WHATSAPP_INTERACTIVE_INVITE: { en: "Interactive Invite", he: "הזמנה אינטראקטיבית", icon: "🔘" },
  SEND_WHATSAPP_TEMPLATE: { en: "WhatsApp Template", he: "תבנית וואטסאפ", icon: "💬" },
  SEND_SMS_REMINDER: { en: "SMS Reminder", he: "תזכורת SMS", icon: "📱" },
};

const STATUS_VARIANTS: Record<AutomationFlowStatus, { variant: "default" | "secondary" | "outline" | "destructive"; label: { en: string; he: string } }> = {
  DRAFT: { variant: "secondary", label: { en: "Draft", he: "טיוטה" } },
  ACTIVE: { variant: "default", label: { en: "Active", he: "פעיל" } },
  PAUSED: { variant: "outline", label: { en: "Paused", he: "מושהה" } },
  ARCHIVED: { variant: "destructive", label: { en: "Archived", he: "בארכיון" } },
};

export function FlowCard({ flow, onActivate, onPause, onDelete, onEdit }: FlowCardProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const triggerLabel = TRIGGER_LABELS[flow.trigger];
  const actionLabel = ACTION_LABELS[flow.action];
  const statusConfig = STATUS_VARIANTS[flow.status];

  return (
    <Card className="relative overflow-hidden">
      {/* Status indicator line */}
      <div
        className={cn(
          "absolute top-0 h-1 w-full",
          flow.status === "ACTIVE" && "bg-green-500",
          flow.status === "PAUSED" && "bg-yellow-500",
          flow.status === "DRAFT" && "bg-gray-400",
          flow.status === "ARCHIVED" && "bg-red-500"
        )}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 text-start">
            <h3 className="text-lg font-semibold">{flow.name}</h3>
            <Badge variant={statusConfig.variant} className="text-xs">
              {isRTL ? statusConfig.label.he : statusConfig.label.en}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              {flow.status === "ACTIVE" ? (
                <DropdownMenuItem onClick={() => onPause(flow.id)}>
                  <Pause className="h-4 w-4 me-2" />
                  {isRTL ? "השהה" : "Pause"}
                </DropdownMenuItem>
              ) : flow.status !== "ARCHIVED" ? (
                <DropdownMenuItem onClick={() => onActivate(flow.id)}>
                  <Play className="h-4 w-4 me-2" />
                  {isRTL ? "הפעל" : "Activate"}
                </DropdownMenuItem>
              ) : null}
              {onEdit && flow.status !== "ARCHIVED" && (
                <DropdownMenuItem onClick={() => onEdit(flow.id)}>
                  <Edit className="h-4 w-4 me-2" />
                  {isRTL ? "ערוך" : "Edit"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(flow.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 me-2" />
                {isRTL ? "מחק" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trigger & Action */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">{triggerLabel.icon}</span>
          <span className="text-muted-foreground">
            {isRTL ? triggerLabel.he : triggerLabel.en}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-lg">{actionLabel.icon}</span>
          <span className="text-muted-foreground">
            {isRTL ? actionLabel.he : actionLabel.en}
          </span>
        </div>

        {/* Stats */}
        {flow.stats.total > 0 && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span>{flow.stats.pending}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>{flow.stats.completed}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span>{flow.stats.failed}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-gray-400" />
              <span>{flow.stats.skipped}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
