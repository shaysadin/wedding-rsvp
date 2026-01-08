"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { CheckCircle2, Info, Zap, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { updateSystemAutomationMessage } from "@/actions/automation";
import { Icons } from "@/components/shared/icons";

interface SystemAutomation {
  id: "RSVP_CONFIRMED" | "RSVP_DECLINED";
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
  messageField: "rsvpConfirmedMessage" | "rsvpDeclinedMessage";
}

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
  };
  onUpdate?: () => void;
}

export function SystemAutomationCards({
  eventId,
  customMessages,
  onUpdate,
}: SystemAutomationCardsProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = (automation: SystemAutomation) => {
    const currentMessage = customMessages?.[automation.messageField];
    setEditMessage(currentMessage || (isRTL ? automation.defaultMessage.he : automation.defaultMessage.en));
    setEditingId(automation.id);
  };

  const handleSave = async (automation: SystemAutomation) => {
    setIsLoading(true);
    try {
      const result = await updateSystemAutomationMessage(
        eventId,
        automation.messageField,
        editMessage.trim() || null
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההודעה עודכנה בהצלחה" : "Message updated successfully");
        setEditingId(null);
        onUpdate?.();
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה בעדכון ההודעה" : "Failed to update message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditMessage("");
  };

  const insertVariable = (variable: string) => {
    setEditMessage((prev) => prev + variable);
  };

  const currentAutomation = SYSTEM_AUTOMATIONS.find((a) => a.id === editingId);

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
            {/* Variable buttons */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-start">
                {isRTL ? "משתנים זמינים:" : "Available variables:"}
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
            <Textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              placeholder={currentAutomation
                ? (isRTL ? currentAutomation.defaultMessage.he : currentAutomation.defaultMessage.en)
                : ""}
              className="min-h-[120px] resize-none text-start"
              dir={isRTL ? "rtl" : "ltr"}
            />

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
