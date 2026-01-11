"use client";

import { useLocale } from "next-intl";
import {
  LucideIcon,
  Zap,
  Clock,
  Send,
  MessageSquare,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Image,
  MousePointer,
  Users,
  Heart,
  Sunrise,
  Edit3,
  MessageCircle,
  Timer,
  CalendarClock,
  PartyPopper,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AutomationTrigger, AutomationAction } from "@prisma/client";

interface FlowNodeProps {
  type: "trigger" | "action";
  value: AutomationTrigger | AutomationAction;
  delayHours?: number | null;
  isActive?: boolean;
  className?: string;
}

interface NodeConfig {
  icon: LucideIcon;
  label: { en: string; he: string };
  description: { en: string; he: string };
  color: string;
  bgColor: string;
  borderColor: string;
  category?: "immediate" | "time-based" | "preset" | "legacy";
  requiresDelay?: boolean;
}

// Trigger categories for UI grouping
export type TriggerCategory = "immediate" | "no-response" | "before-event" | "after-event" | "preset";

export interface TriggerOption {
  value: AutomationTrigger;
  label: string;
  description: string;
  icon: LucideIcon;
  category: TriggerCategory;
  requiresDelay?: boolean;
  defaultDelay?: number;
  isLegacy?: boolean;
}

export interface ActionOption {
  value: AutomationAction;
  label: string;
  description: string;
  icon: LucideIcon;
  isCustom?: boolean;
  isLegacy?: boolean;
}

// Time options for delay selection (1-24 hours for before/after event)
export const DELAY_OPTIONS = {
  noResponse: [
    { hours: 6, label: { en: "6 hours", he: "6 שעות" } },
    { hours: 12, label: { en: "12 hours", he: "12 שעות" } },
    { hours: 18, label: { en: "18 hours", he: "18 שעות" } },
    { hours: 24, label: { en: "1 day", he: "יום אחד" } },
    { hours: 36, label: { en: "1.5 days", he: "יום וחצי" } },
    { hours: 48, label: { en: "2 days", he: "יומיים" } },
    { hours: 72, label: { en: "3 days", he: "3 ימים" } },
  ],
  beforeEvent: [
    { hours: 1, label: { en: "1 hour", he: "שעה" } },
    { hours: 2, label: { en: "2 hours", he: "שעתיים" } },
    { hours: 3, label: { en: "3 hours", he: "3 שעות" } },
    { hours: 4, label: { en: "4 hours", he: "4 שעות" } },
    { hours: 6, label: { en: "6 hours", he: "6 שעות" } },
    { hours: 8, label: { en: "8 hours", he: "8 שעות" } },
    { hours: 12, label: { en: "12 hours", he: "12 שעות" } },
    { hours: 24, label: { en: "24 hours", he: "24 שעות" } },
  ],
  afterEvent: [
    { hours: 1, label: { en: "1 hour", he: "שעה" } },
    { hours: 2, label: { en: "2 hours", he: "שעתיים" } },
    { hours: 3, label: { en: "3 hours", he: "3 שעות" } },
    { hours: 6, label: { en: "6 hours", he: "6 שעות" } },
    { hours: 12, label: { en: "12 hours", he: "12 שעות" } },
    { hours: 24, label: { en: "24 hours", he: "24 שעות" } },
  ],
};

const TRIGGER_CONFIG: Record<AutomationTrigger, NodeConfig> = {
  // System Automations - these are built-in and shown as active by default
  RSVP_CONFIRMED: {
    icon: CheckCircle,
    label: { en: "Guest Confirmed", he: "אורח אישר הגעה" },
    description: { en: "Automatic - runs when guest confirms RSVP", he: "אוטומטי - פועל כשאורח מאשר הגעה" },
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    borderColor: "border-green-200 dark:border-green-800",
    category: "immediate",
  },
  RSVP_DECLINED: {
    icon: XCircle,
    label: { en: "Guest Declined", he: "אורח סירב" },
    description: { en: "Automatic - runs when guest declines RSVP", he: "אוטומטי - פועל כשאורח מסרב" },
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/50",
    borderColor: "border-rose-200 dark:border-rose-800",
    category: "immediate",
  },
  RSVP_MAYBE: {
    icon: Timer,
    label: { en: "Guest Maybe", he: "אורח אולי" },
    description: { en: "Follow-up reminder for guests who said maybe", he: "תזכורת לאורחים שאמרו אולי" },
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800",
    category: "time-based",
    requiresDelay: true,
  },
  // Legacy - hidden from UI
  RSVP_SENT: {
    icon: Send,
    label: { en: "RSVP Sent", he: "הזמנה נשלחה" },
    description: { en: "Legacy trigger", he: "טריגר ישן" },
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    category: "legacy",
  },

  // Time-Based: No Response (by channel)
  NO_RESPONSE_WHATSAPP: {
    icon: Timer,
    label: { en: "No Response (WhatsApp)", he: "ללא תגובה (וואטסאפ)" },
    description: { en: "Guest hasn't responded to WhatsApp invite/reminder", he: "האורח לא הגיב להזמנה/תזכורת בוואטסאפ" },
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    category: "time-based",
    requiresDelay: true,
  },
  NO_RESPONSE_SMS: {
    icon: Timer,
    label: { en: "No Response (SMS)", he: "ללא תגובה (SMS)" },
    description: { en: "Guest hasn't responded to SMS invite/reminder", he: "האורח לא הגיב להזמנה/תזכורת ב-SMS" },
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    category: "time-based",
    requiresDelay: true,
  },

  // Time-Based: Before Event
  BEFORE_EVENT: {
    icon: CalendarClock,
    label: { en: "Before Event", he: "לפני האירוע" },
    description: { en: "X hours before the event starts", he: "X שעות לפני תחילת האירוע" },
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-purple-200 dark:border-purple-800",
    category: "time-based",
    requiresDelay: true,
  },

  // Time-Based: After Event
  AFTER_EVENT: {
    icon: PartyPopper,
    label: { en: "After Event", he: "אחרי האירוע" },
    description: { en: "X hours after the event ends", he: "X שעות אחרי סיום האירוע" },
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    borderColor: "border-pink-200 dark:border-pink-800",
    category: "time-based",
    requiresDelay: true,
  },

  // Legacy triggers (hidden from new UI but supported for existing flows)
  NO_RESPONSE: {
    icon: Timer,
    label: { en: "No Response", he: "ללא תגובה" },
    description: { en: "Legacy: Use NO_RESPONSE_WHATSAPP or NO_RESPONSE_SMS", he: "ישן: השתמש בללא תגובה וואטסאפ/SMS" },
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800",
    category: "legacy",
    requiresDelay: true,
  },
  EVENT_DAY_MORNING: {
    icon: Sunrise,
    label: { en: "Event Morning", he: "בוקר האירוע" },
    description: { en: "Legacy: Morning of the event", he: "ישן: בוקר האירוע" },
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
    category: "legacy",
  },
  DAY_AFTER_MORNING: {
    icon: Heart,
    label: { en: "Day After", he: "יום אחרי" },
    description: { en: "Legacy: Day after event", he: "ישן: יום אחרי האירוע" },
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    borderColor: "border-pink-200 dark:border-pink-800",
    category: "legacy",
  },
  NO_RESPONSE_24H: {
    icon: Clock,
    label: { en: "No Response (24h)", he: "ללא תגובה (24 ש')" },
    description: { en: "Legacy: No response after 24 hours", he: "ישן: ללא תגובה אחרי 24 שעות" },
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800",
    category: "legacy",
  },
  NO_RESPONSE_48H: {
    icon: Clock,
    label: { en: "No Response (48h)", he: "ללא תגובה (48 ש')" },
    description: { en: "Legacy: No response after 48 hours", he: "ישן: ללא תגובה אחרי 48 שעות" },
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
    category: "legacy",
  },
  NO_RESPONSE_72H: {
    icon: Clock,
    label: { en: "No Response (72h)", he: "ללא תגובה (72 ש')" },
    description: { en: "Legacy: No response after 72 hours", he: "ישן: ללא תגובה אחרי 72 שעות" },
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
    borderColor: "border-red-200 dark:border-red-800",
    category: "legacy",
  },
  EVENT_MORNING: {
    icon: Sunrise,
    label: { en: "Event Morning", he: "בוקר האירוע" },
    description: { en: "Legacy: Morning of the event", he: "ישן: בוקר האירוע" },
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-purple-200 dark:border-purple-800",
    category: "legacy",
  },
  HOURS_BEFORE_EVENT_2: {
    icon: Clock,
    label: { en: "2 Hours Before", he: "שעתיים לפני" },
    description: { en: "Legacy: 2 hours before event", he: "ישן: שעתיים לפני האירוע" },
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    borderColor: "border-pink-200 dark:border-pink-800",
    category: "legacy",
  },
  DAY_AFTER_EVENT: {
    icon: Heart,
    label: { en: "Day After Event", he: "יום אחרי האירוע" },
    description: { en: "Legacy: Day after the event", he: "ישן: יום אחרי האירוע" },
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    borderColor: "border-pink-200 dark:border-pink-800",
    category: "legacy",
  },
};

const ACTION_CONFIG: Record<AutomationAction, NodeConfig> = {
  // WhatsApp Template Actions
  SEND_WHATSAPP_INVITE: {
    icon: Send,
    label: { en: "WhatsApp Invite", he: "הזמנה בוואטסאפ" },
    description: { en: "Send invitation with RSVP link via WhatsApp", he: "שלח הזמנה עם קישור לאישור הגעה" },
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  SEND_WHATSAPP_REMINDER: {
    icon: Clock,
    label: { en: "WhatsApp Reminder", he: "תזכורת בוואטסאפ" },
    description: { en: "Send reminder message via WhatsApp", he: "שלח הודעת תזכורת בוואטסאפ" },
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  SEND_WHATSAPP_CONFIRMATION: {
    icon: CheckCircle,
    label: { en: "WhatsApp Confirmation", he: "אישור בוואטסאפ" },
    description: { en: "Send confirmation/thank you message", he: "שלח הודעת אישור או תודה" },
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    borderColor: "border-green-200 dark:border-green-800",
  },
  SEND_WHATSAPP_IMAGE_INVITE: {
    icon: Image,
    label: { en: "Image Invite", he: "הזמנה עם תמונה" },
    description: { en: "Interactive WhatsApp with wedding invitation image", he: "וואטסאפ אינטראקטיבי עם תמונת ההזמנה" },
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/50",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  // Legacy - merged into SEND_WHATSAPP_IMAGE_INVITE
  SEND_WHATSAPP_INTERACTIVE_INVITE: {
    icon: MousePointer,
    label: { en: "Interactive Invite", he: "הזמנה אינטראקטיבית" },
    description: { en: "Legacy: Use Image Invite instead", he: "ישן: השתמש בהזמנה עם תמונה" },
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  SEND_WHATSAPP_INTERACTIVE_REMINDER: {
    icon: MousePointer,
    label: { en: "Interactive Reminder", he: "תזכורת אינטראקטיבית" },
    description: { en: "Send reminder with response buttons", he: "שלח תזכורת עם כפתורי תגובה" },
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  SEND_WHATSAPP_GUEST_COUNT: {
    icon: Users,
    label: { en: "Guest Count Request", he: "בקשת מספר אורחים" },
    description: { en: "Send guest count selection list", he: "שלח רשימת בחירת מספר אורחים" },
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  SEND_TABLE_ASSIGNMENT: {
    icon: MapPin,
    label: { en: "Table & Location", he: "שולחן ומיקום" },
    description: { en: "Send table assignment with venue location", he: "שלח שיבוץ שולחן עם מיקום האולם" },
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/50",
    borderColor: "border-violet-200 dark:border-violet-800",
  },
  // Event Day & Thank You Actions
  SEND_WHATSAPP_EVENT_DAY: {
    icon: Sunrise,
    label: { en: "Event Day Reminder", he: "תזכורת יום האירוע" },
    description: { en: "Send table, address, navigation & gift link", he: "שלח שולחן, כתובת, ניווט וקישור למתנה" },
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  SEND_WHATSAPP_THANK_YOU: {
    icon: Heart,
    label: { en: "Thank You Message", he: "הודעת תודה" },
    description: { en: "Send thank you message from the couple", he: "שלח הודעת תודה מהזוג" },
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/50",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
  // Custom Message Actions
  SEND_CUSTOM_WHATSAPP: {
    icon: Edit3,
    label: { en: "Custom WhatsApp", he: "וואטסאפ מותאם" },
    description: { en: "Send your custom message via WhatsApp", he: "שלח הודעה מותאמת אישית בוואטסאפ" },
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/50",
    borderColor: "border-teal-200 dark:border-teal-800",
  },
  SEND_CUSTOM_SMS: {
    icon: MessageCircle,
    label: { en: "Custom SMS", he: "SMS מותאם" },
    description: { en: "Send your custom message via SMS", he: "שלח הודעה מותאמת אישית ב-SMS" },
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
  // Legacy actions
  SEND_WHATSAPP_TEMPLATE: {
    icon: MessageSquare,
    label: { en: "WhatsApp Template", he: "תבנית וואטסאפ" },
    description: { en: "Send WhatsApp using default template", he: "שלח וואטסאפ באמצעות תבנית ברירת מחדל" },
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  SEND_SMS_REMINDER: {
    icon: Phone,
    label: { en: "SMS Reminder", he: "תזכורת SMS" },
    description: { en: "Send reminder via SMS", he: "שלח תזכורת ב-SMS" },
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
};

// Helper to format delay for display
function formatDelay(trigger: AutomationTrigger, delayHours: number | null | undefined, locale: string): string {
  const isRTL = locale === "he";

  if (!delayHours) return "";

  if (trigger === "NO_RESPONSE_WHATSAPP" || trigger === "NO_RESPONSE_SMS" || trigger === "NO_RESPONSE") {
    if (delayHours <= 24) {
      return isRTL ? `${delayHours} שעות` : `${delayHours} hours`;
    } else {
      const days = Math.floor(delayHours / 24);
      const remainingHours = delayHours % 24;
      if (remainingHours === 0) {
        return isRTL ? `${days} ימים` : `${days} day${days > 1 ? "s" : ""}`;
      }
      return isRTL ? `${days} ימים ו-${remainingHours} שעות` : `${days}d ${remainingHours}h`;
    }
  }

  if (trigger === "BEFORE_EVENT") {
    if (delayHours < 24) {
      return isRTL ? `${delayHours} שעות לפני` : `${delayHours}h before`;
    }
    const days = Math.floor(delayHours / 24);
    return isRTL ? `${days} ימים לפני` : `${days}d before`;
  }

  if (trigger === "AFTER_EVENT") {
    if (delayHours < 24) {
      return isRTL ? `${delayHours} שעות אחרי` : `${delayHours}h after`;
    }
    const days = Math.floor(delayHours / 24);
    return isRTL ? `${days} ימים אחרי` : `${days}d after`;
  }

  return "";
}

export function FlowNode({ type, value, delayHours, isActive = true, className }: FlowNodeProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const config = type === "trigger"
    ? TRIGGER_CONFIG[value as AutomationTrigger]
    : ACTION_CONFIG[value as AutomationAction];

  const Icon = config.icon;

  // Get delay display for time-based triggers
  const delayDisplay = type === "trigger" && config.requiresDelay
    ? formatDelay(value as AutomationTrigger, delayHours, locale)
    : "";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all duration-200",
        config.bgColor,
        config.borderColor,
        isActive ? "shadow-sm" : "opacity-50",
        className
      )}
    >
      {/* Node type indicator */}
      <div className="absolute -top-2 left-3 right-3">
        <span className={cn(
          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
          type === "trigger"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
        )}>
          {type === "trigger"
            ? (isRTL ? "כשקורה" : "When")
            : (isRTL ? "בצע" : "Then")}
        </span>
      </div>

      {/* Icon */}
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        config.bgColor,
        "border",
        config.borderColor
      )}>
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>

      {/* Label and delay */}
      <div className="flex flex-col text-start">
        <span className={cn("text-sm font-medium", config.color)}>
          {isRTL ? config.label.he : config.label.en}
        </span>
        {delayDisplay && (
          <span className="text-xs text-muted-foreground">
            {delayDisplay}
          </span>
        )}
      </div>
    </div>
  );
}

// Connector line between nodes
export function FlowConnector({ isActive = true }: { isActive?: boolean }) {
  return (
    <div className="flex items-center justify-center py-1">
      <div className={cn(
        "flex flex-col items-center",
        !isActive && "opacity-50"
      )}>
        <div className="h-4 w-0.5 bg-gradient-to-b from-blue-300 to-green-300 dark:from-blue-600 dark:to-green-600" />
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/50 dark:to-green-900/50 border border-gray-200 dark:border-gray-700">
          <Zap className="h-3 w-3 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="h-4 w-0.5 bg-gradient-to-b from-green-300 to-green-400 dark:from-green-600 dark:to-green-500" />
      </div>
    </div>
  );
}

// Get trigger options grouped by category (excluding legacy and system automations)
export function getTriggerOptions(locale: string): TriggerOption[] {
  const isRTL = locale === "he";

  const triggers: TriggerOption[] = [];

  // System automation triggers - handled separately, not available in custom flows
  const systemTriggers: AutomationTrigger[] = ["RSVP_CONFIRMED", "RSVP_DECLINED"];

  Object.entries(TRIGGER_CONFIG).forEach(([key, config]) => {
    // Skip legacy triggers
    if (config.category === "legacy") return;
    // Skip system automation triggers (RSVP_CONFIRMED, RSVP_DECLINED)
    if (systemTriggers.includes(key as AutomationTrigger)) return;

    const category: TriggerCategory =
      key === "NO_RESPONSE_WHATSAPP" || key === "NO_RESPONSE_SMS" ? "no-response" :
      key === "BEFORE_EVENT" ? "before-event" :
      key === "AFTER_EVENT" ? "after-event" :
      "preset";

    triggers.push({
      value: key as AutomationTrigger,
      label: isRTL ? config.label.he : config.label.en,
      description: isRTL ? config.description.he : config.description.en,
      icon: config.icon,
      category,
      requiresDelay: config.requiresDelay,
      defaultDelay: key === "NO_RESPONSE_WHATSAPP" || key === "NO_RESPONSE_SMS" ? 24 : key === "BEFORE_EVENT" ? 2 : key === "AFTER_EVENT" ? 24 : undefined,
    });
  });

  return triggers;
}

// Get all action options (excluding legacy for new flows)
export function getActionOptions(locale: string, includeLegacy = false): ActionOption[] {
  const isRTL = locale === "he";
  const legacyActions: AutomationAction[] = [
    "SEND_WHATSAPP_TEMPLATE",
    "SEND_SMS_REMINDER",
    "SEND_WHATSAPP_INTERACTIVE_INVITE", // Merged into SEND_WHATSAPP_IMAGE_INVITE
  ];
  const customActions: AutomationAction[] = ["SEND_CUSTOM_WHATSAPP", "SEND_CUSTOM_SMS"];

  return Object.entries(ACTION_CONFIG)
    .filter(([key]) => includeLegacy || !legacyActions.includes(key as AutomationAction))
    .map(([key, config]) => ({
      value: key as AutomationAction,
      label: isRTL ? config.label.he : config.label.en,
      description: isRTL ? config.description.he : config.description.en,
      icon: config.icon,
      isCustom: customActions.includes(key as AutomationAction),
      isLegacy: legacyActions.includes(key as AutomationAction),
    }));
}

// Check if action requires custom message
export function isCustomMessageAction(action: AutomationAction): boolean {
  return action === "SEND_CUSTOM_WHATSAPP" || action === "SEND_CUSTOM_SMS";
}

// Check if trigger requires delay hours
export function isDelayRequiredTrigger(trigger: AutomationTrigger): boolean {
  return trigger === "NO_RESPONSE_WHATSAPP" || trigger === "NO_RESPONSE_SMS" || trigger === "NO_RESPONSE" || trigger === "BEFORE_EVENT" || trigger === "AFTER_EVENT";
}

// Get delay options for a specific trigger type
export function getDelayOptionsForTrigger(trigger: AutomationTrigger, locale: string) {
  const isRTL = locale === "he";

  let options: { hours: number; label: { en: string; he: string } }[] = [];

  if (trigger === "NO_RESPONSE_WHATSAPP" || trigger === "NO_RESPONSE_SMS" || trigger === "NO_RESPONSE") {
    options = DELAY_OPTIONS.noResponse;
  } else if (trigger === "BEFORE_EVENT") {
    options = DELAY_OPTIONS.beforeEvent;
  } else if (trigger === "AFTER_EVENT") {
    options = DELAY_OPTIONS.afterEvent;
  }

  return options.map(opt => ({
    value: opt.hours,
    label: isRTL ? opt.label.he : opt.label.en,
  }));
}

// Get action config by value
export function getActionConfig(action: AutomationAction) {
  return ACTION_CONFIG[action];
}

// Get trigger config by value
export function getTriggerConfig(trigger: AutomationTrigger) {
  return TRIGGER_CONFIG[trigger];
}
