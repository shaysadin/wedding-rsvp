"use client";

import { useLocale } from "next-intl";
import { Plus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AutomationTrigger, AutomationAction } from "@prisma/client";

interface FlowTemplate {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  trigger: AutomationTrigger;
  action: AutomationAction;
}

interface TemplateGalleryProps {
  templates: FlowTemplate[];
  existingTriggers: AutomationTrigger[];
  onSelectTemplate: (templateId: string) => void;
  isLoading?: boolean;
}

const TRIGGER_ICONS: Record<AutomationTrigger, string> = {
  // Core triggers
  RSVP_CONFIRMED: "✅",
  RSVP_DECLINED: "❌",
  NO_RESPONSE_WHATSAPP: "💬",
  NO_RESPONSE_SMS: "📱",
  BEFORE_EVENT: "⏱️",
  AFTER_EVENT: "🌙",
  // Legacy triggers
  RSVP_SENT: "📤",
  NO_RESPONSE: "⏰",
  NO_RESPONSE_24H: "⏰",
  NO_RESPONSE_48H: "⏰",
  NO_RESPONSE_72H: "⏰",
  EVENT_DAY_MORNING: "🌅",
  DAY_AFTER_MORNING: "☀️",
  EVENT_MORNING: "🌅",
  HOURS_BEFORE_EVENT_2: "⏱️",
  DAY_AFTER_EVENT: "☀️",
};

const ACTION_ICONS: Record<AutomationAction, string> = {
  // Core actions
  SEND_WHATSAPP_INVITE: "💬",
  SEND_WHATSAPP_REMINDER: "💬",
  SEND_WHATSAPP_CONFIRMATION: "💬",
  SEND_WHATSAPP_IMAGE_INVITE: "🖼️",
  SEND_WHATSAPP_INTERACTIVE_REMINDER: "🔘",
  SEND_WHATSAPP_GUEST_COUNT: "👥",
  SEND_TABLE_ASSIGNMENT: "🪑",
  SEND_CUSTOM_WHATSAPP: "✏️",
  SEND_CUSTOM_SMS: "📱",
  // Event Day & Thank You
  SEND_WHATSAPP_EVENT_DAY: "🎉",
  SEND_WHATSAPP_THANK_YOU: "💝",
  // Legacy actions
  SEND_WHATSAPP_INTERACTIVE_INVITE: "🔘",
  SEND_WHATSAPP_TEMPLATE: "💬",
  SEND_SMS_REMINDER: "📱",
};

export function TemplateGallery({
  templates,
  existingTriggers,
  onSelectTemplate,
  isLoading,
}: TemplateGalleryProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "אין תבניות זמינות. פנה למנהל המערכת."
              : "No templates available. Contact your administrator."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const isDisabled = existingTriggers.includes(template.trigger);
        const triggerIcon = TRIGGER_ICONS[template.trigger];
        const actionIcon = ACTION_ICONS[template.action];

        return (
          <Card
            key={template.id}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-md",
              isDisabled && "opacity-50"
            )}
          >
            <CardHeader className="pb-2">
              <div className={cn("flex items-start gap-3", isRTL && "flex-row-reverse")}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                  {triggerIcon}
                </div>
                <div className={cn("flex-1 space-y-1", isRTL && "text-right")}>
                  <CardTitle className="text-base">
                    {isRTL ? template.nameHe : template.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isRTL ? template.descriptionHe : template.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Flow visualization */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="text-base">{triggerIcon}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-base">{actionIcon}</span>
              </div>

              <Button
                onClick={() => onSelectTemplate(template.id)}
                disabled={isDisabled || isLoading}
                className="w-full"
                variant={isDisabled ? "secondary" : "default"}
              >
                {isDisabled ? (
                  isRTL ? "כבר קיים" : "Already exists"
                ) : (
                  <>
                    <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "me-2")} />
                    {isRTL ? "הוסף" : "Add"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
