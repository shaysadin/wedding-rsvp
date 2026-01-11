"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { CheckCircle2, Info, Zap, Edit2, Save, X, Clock } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateSystemAutomationMessage, updateSystemAutomationDelay } from "@/actions/automation";
import { Icons } from "@/components/shared/icons";

interface SystemAutomation {
  id: "RSVP_CONFIRMED" | "RSVP_DECLINED" | "RSVP_MAYBE";
  trigger: {
    icon: string;
    label: { en: string; he: string };
  };
  action: {
    icon: string;
    label: { en: string; he: string };
  };
  description: { en: string; he: string };
  defaultMessage: { en: string; he: string };
  messageField: "rsvpConfirmedMessage" | "rsvpDeclinedMessage" | "rsvpMaybeMessage";
  hasDelay?: boolean;
  delayDescription?: { en: string; he: string };
}

const DELAY_OPTIONS = [
  { value: 24, label: { en: "24 hours", he: "24 שעות" } },
  { value: 48, label: { en: "48 hours", he: "48 שעות" } },
  { value: 72, label: { en: "72 hours", he: "72 שעות" } },
  { value: 96, label: { en: "4 days", he: "4 ימים" } },
  { value: 168, label: { en: "1 week", he: "שבוע" } },
];

const SYSTEM_AUTOMATIONS: SystemAutomation[] = [
  {
    id: "RSVP_CONFIRMED",
    trigger: {
      icon: "✅",
      label: { en: "Guest Confirmed", he: "אורח אישר הגעה" },
    },
    action: {
      icon: "💬",
      label: { en: "Confirmation WhatsApp", he: "אישור בוואטסאפ" },
    },
    description: {
      en: "Automatically sends confirmation when guest confirms attendance via WhatsApp",
      he: "שולח אישור אוטומטי כשאורח מאשר הגעה דרך וואטסאפ",
    },
    defaultMessage: {
      en: "Thank you {guestName}! 🎉\n\nYour RSVP has been confirmed.\n\n📅 Date: {eventDate}\n📍 Location: {venue}, {address}\n👥 Number of guests: {guestCount}\n\nWe look forward to seeing you! 💕",
      he: "תודה {guestName}! 🎉\n\nאישור ההגעה שלך התקבל בהצלחה.\n\n📅 תאריך: {eventDate}\n📍 מיקום: {venue}, {address}\n👥 מספר אורחים: {guestCount}\n\nמחכים לראותכם! 💕",
    },
    messageField: "rsvpConfirmedMessage",
  },
  {
    id: "RSVP_DECLINED",
    trigger: {
      icon: "❌",
      label: { en: "Guest Declined", he: "אורח סירב" },
    },
    action: {
      icon: "💬",
      label: { en: "Acknowledgment WhatsApp", he: "הודעת קבלה בוואטסאפ" },
    },
    description: {
      en: "Automatically acknowledges when guest declines via WhatsApp",
      he: "שולח הודעת קבלה אוטומטית כשאורח מסרב דרך וואטסאפ",
    },
    defaultMessage: {
      en: "Thank you {guestName} for letting us know. We're sorry you won't be able to make it, but we appreciate you responding. 💙",
      he: "תודה {guestName} שעדכנת אותנו. חבל שלא תוכלו להגיע, אבל מעריכים שהגבתם. 💙",
    },
    messageField: "rsvpDeclinedMessage",
  },
  {
    id: "RSVP_MAYBE",
    trigger: {
      icon: "🤔",
      label: { en: "Guest Maybe", he: "אורח אולי" },
    },
    action: {
      icon: "💬",
      label: { en: "Maybe + Follow-up Reminder", he: "הודעת אולי + תזכורת" },
    },
    description: {
      en: "Sends acknowledgment when guest says maybe, then sends a follow-up reminder after the configured delay",
      he: "שולח הודעה כשאורח אומר אולי, ולאחר מכן שולח תזכורת לפי הזמן שנבחר",
    },
    defaultMessage: {
      en: "Thank you {guestName}! 🤔\n\nWe understand you're not sure yet.\n\n📅 Date: {eventDate}\n📍 Location: {venue}, {address}\n\nWe'll check back with you soon. 💕",
      he: "תודה {guestName}! 🤔\n\nהבנו שעדיין לא בטוח/ה לגבי ההגעה.\n\n📅 תאריך: {eventDate}\n📍 מיקום: {venue}, {address}\n\nניצור איתך קשר שוב בקרוב. 💕",
    },
    messageField: "rsvpMaybeMessage",
    hasDelay: true,
    delayDescription: {
      en: "Follow-up reminder will be sent after:",
      he: "תזכורת תישלח לאחר:",
    },
  },
];

const MESSAGE_VARIABLES = [
  { key: "{guestName}", label: { en: "Guest Name", he: "שם האורח" } },
  { key: "{eventDate}", label: { en: "Event Date", he: "תאריך האירוע" } },
  { key: "{eventTime}", label: { en: "Event Time", he: "שעת האירוע" } },
  { key: "{venue}", label: { en: "Venue", he: "שם האולם" } },
  { key: "{address}", label: { en: "Address", he: "כתובת" } },
  { key: "{guestCount}", label: { en: "Guest Count", he: "מספר אורחים" } },
];

interface SystemAutomationCardsProps {
  eventId: string;
  customMessages?: {
    rsvpConfirmedMessage?: string | null;
    rsvpDeclinedMessage?: string | null;
    rsvpMaybeMessage?: string | null;
  };
  rsvpMaybeReminderDelay?: number;
  onUpdate?: () => void;
}

export function SystemAutomationCards({
  eventId,
  customMessages,
  rsvpMaybeReminderDelay = 24,
  onUpdate,
}: SystemAutomationCardsProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editDelay, setEditDelay] = useState<number>(24);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = (automation: SystemAutomation) => {
    const currentMessage = customMessages?.[automation.messageField];
    setEditMessage(currentMessage || (isRTL ? automation.defaultMessage.he : automation.defaultMessage.en));
    if (automation.hasDelay) {
      setEditDelay(rsvpMaybeReminderDelay);
    }
    setEditingId(automation.id);
  };

  const handleSave = async (automation: SystemAutomation) => {
    setIsLoading(true);
    try {
      // Save the message
      const messageResult = await updateSystemAutomationMessage(
        eventId,
        automation.messageField,
        editMessage.trim() || null
      );

      if (messageResult.error) {
        toast.error(messageResult.error);
        return;
      }

      // Save the delay if this automation has one
      if (automation.hasDelay) {
        const delayResult = await updateSystemAutomationDelay(eventId, editDelay);
        if (delayResult.error) {
          toast.error(delayResult.error);
          return;
        }
      }

      toast.success(isRTL ? "ההגדרות עודכנו בהצלחה" : "Settings updated successfully");
      setEditingId(null);
      onUpdate?.();
    } catch (error) {
      toast.error(isRTL ? "שגיאה בעדכון ההגדרות" : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditMessage("");
    setEditDelay(rsvpMaybeReminderDelay);
  };

  const insertVariable = (variable: string) => {
    setEditMessage((prev) => prev + variable);
  };

  const currentAutomation = SYSTEM_AUTOMATIONS.find((a) => a.id === editingId);

  // Get the delay label for display
  const getDelayLabel = (hours: number) => {
    const option = DELAY_OPTIONS.find((o) => o.value === hours);
    return option ? (isRTL ? option.label.he : option.label.en) : `${hours}h`;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {isRTL ? "אוטומציות מערכת" : "System Automations"}
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} className="max-w-xs">
                <p className="text-xs text-start">
                  {isRTL
                    ? "אוטומציות אלו פועלות אוטומטית דרך זרימת הוואטסאפ האינטראקטיבי. לחצו על עריכה כדי להתאים את ההודעה."
                    : "These automations run automatically through the interactive WhatsApp flow. Click edit to customize the message."}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SYSTEM_AUTOMATIONS.map((automation) => {
            const hasCustomMessage = !!customMessages?.[automation.messageField];

            return (
              <Card
                key={automation.id}
                className="relative overflow-hidden border-blue-200/50 bg-blue-50/30 dark:border-blue-800/50 dark:bg-blue-950/20"
              >
                {/* Active indicator line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    {/* Flow visualization */}
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{automation.trigger.icon}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-xl">{automation.action.icon}</span>
                    </div>

                    {/* Badges and edit button */}
                    <div className="flex items-center gap-2">
                      {hasCustomMessage && (
                        <Badge
                          variant="outline"
                          className="border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs"
                        >
                          {isRTL ? "מותאם" : "Custom"}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {isRTL ? "פעיל" : "Active"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(automation)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-start">
                    <p className="text-sm font-medium">
                      {isRTL ? automation.trigger.label.he : automation.trigger.label.en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? automation.description.he : automation.description.en}
                    </p>
                    {/* Show delay info for RSVP_MAYBE */}
                    {automation.hasDelay && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          {isRTL ? "תזכורת אחרי:" : "Reminder after:"}{" "}
                          <span className="font-medium">{getDelayLabel(rsvpMaybeReminderDelay)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-500" />
              {isRTL ? "עריכת הודעת מערכת" : "Edit System Message"}
            </DialogTitle>
            <DialogDescription className="text-start">
              {currentAutomation && (isRTL
                ? `התאם את ההודעה שתישלח כאשר ${currentAutomation.trigger.label.he}`
                : `Customize the message sent when ${currentAutomation?.trigger.label.en}`)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Delay selector for RSVP_MAYBE */}
            {currentAutomation?.hasDelay && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <Label className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {currentAutomation.delayDescription
                      ? (isRTL ? currentAutomation.delayDescription.he : currentAutomation.delayDescription.en)
                      : (isRTL ? "תזכורת לאחר:" : "Follow-up reminder after:")}
                  </Label>
                </div>
                <Select
                  value={editDelay.toString()}
                  onValueChange={(value) => setEditDelay(parseInt(value))}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {isRTL ? option.label.he : option.label.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-700 dark:text-amber-400 text-start">
                  {isRTL
                    ? "לאחר זמן זה, תישלח הודעת תזכורת אינטראקטיבית לאורח"
                    : "After this time, an interactive reminder will be sent to the guest"}
                </p>
              </div>
            )}

            {/* Variable buttons */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-start">
                {isRTL ? "משתנים זמינים להודעת האישור:" : "Available variables for acknowledgment message:"}
              </p>
              <div className="flex flex-wrap gap-1">
                {MESSAGE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => insertVariable(variable.key)}
                  >
                    {isRTL ? variable.label.he : variable.label.en}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div className="space-y-2">
              <Label className="text-sm text-start">
                {currentAutomation?.hasDelay
                  ? (isRTL ? "הודעת אישור מיידית:" : "Immediate acknowledgment message:")
                  : (isRTL ? "הודעה:" : "Message:")}
              </Label>
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder={currentAutomation
                  ? (isRTL ? currentAutomation.defaultMessage.he : currentAutomation.defaultMessage.en)
                  : ""}
                className="min-h-[120px] resize-none text-start"
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            <p className="text-xs text-muted-foreground text-start">
              {isRTL
                ? "השאר ריק כדי להשתמש בהודעת ברירת המחדל"
                : "Leave empty to use the default message"}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              <X className="h-4 w-4 me-2" />
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button
              onClick={() => currentAutomation && handleSave(currentAutomation)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4 me-2" />
              )}
              {isRTL ? "שמור" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
