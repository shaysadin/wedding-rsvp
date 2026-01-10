"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Check, Eye, Edit3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getSmsTemplates,
  renderSmsTemplate,
  SMS_MAX_LENGTH,
  type SmsTemplate,
} from "@/config/sms-templates";

interface SmsTemplateSelectorProps {
  messageType: "INVITE" | "REMINDER";
  onTemplateSelect: (template: string) => void;
  previewContext?: {
    guestName: string;
    eventTitle: string;
    rsvpLink: string;
  };
  disabled?: boolean;
}

export function SmsTemplateSelector({
  messageType,
  onTemplateSelect,
  previewContext,
  disabled = false,
}: SmsTemplateSelectorProps) {
  const locale = useLocale();
  const isHebrew = locale === "he";

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const templates = getSmsTemplates(messageType);

  // Default preview context for placeholder display
  const defaultContext = {
    guestName: isHebrew ? "שם האורח" : "Guest Name",
    eventTitle: isHebrew ? "שם האירוע" : "Event Title",
    rsvpLink: "https://...",
  };

  const context = previewContext || defaultContext;

  // Auto-select first template on mount
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId && !isCustomMode) {
      const firstTemplate = templates[0];
      setSelectedTemplateId(firstTemplate.id);
      const message = isHebrew ? firstTemplate.messageHe : firstTemplate.messageEn;
      onTemplateSelect(message);
    }
  }, [templates, selectedTemplateId, isCustomMode, isHebrew, onTemplateSelect]);

  const handleTemplateSelect = (template: SmsTemplate) => {
    setSelectedTemplateId(template.id);
    setIsCustomMode(false);
    const message = isHebrew ? template.messageHe : template.messageEn;
    onTemplateSelect(message);
  };

  const handleCustomModeToggle = () => {
    setIsCustomMode(!isCustomMode);
    setSelectedTemplateId(null);
    if (!isCustomMode) {
      onTemplateSelect(customMessage);
    }
  };

  const handleCustomMessageChange = (value: string) => {
    // Limit to SMS_MAX_LENGTH
    const trimmed = value.slice(0, SMS_MAX_LENGTH);
    setCustomMessage(trimmed);
    onTemplateSelect(trimmed);
  };

  // Get the currently active template content for preview
  const getActiveTemplateContent = (): string => {
    if (isCustomMode) {
      return customMessage || (isHebrew ? "(הודעה ריקה)" : "(Empty message)");
    }
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        return isHebrew ? template.messageHe : template.messageEn;
      }
    }
    return "";
  };

  // Render preview with placeholders replaced
  const getPreviewContent = (): string => {
    const content = getActiveTemplateContent();
    if (!content) return "";
    return renderSmsTemplate(content, context);
  };

  const previewContent = getPreviewContent();
  const charCount = previewContent.length;

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="space-y-2">
        <Label className="flex items-center justify-between">
          <span>{isHebrew ? "בחר תבנית" : "Select Template"}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCustomModeToggle}
            disabled={disabled}
            className="h-7 text-xs"
          >
            <Edit3 className="h-3 w-3 me-1" />
            {isCustomMode
              ? (isHebrew ? "בחר תבנית" : "Select Template")
              : (isHebrew ? "הודעה מותאמת" : "Custom Message")}
          </Button>
        </Label>

        {!isCustomMode ? (
          <div className="grid grid-cols-3 gap-2">
            {templates.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              const name = isHebrew ? template.nameHe : template.nameEn;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  disabled={disabled}
                  className={cn(
                    "relative rounded-lg border p-3 text-start transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={customMessage}
              onChange={(e) => handleCustomMessageChange(e.target.value)}
              placeholder={
                isHebrew
                  ? "כתוב הודעה מותאמת אישית...\nתומך ב: {{guestName}}, {{eventTitle}}, {{rsvpLink}}"
                  : "Write a custom message...\nSupports: {{guestName}}, {{eventTitle}}, {{rsvpLink}}"
              }
              disabled={disabled}
              className="min-h-[100px] text-sm"
              dir={isHebrew ? "rtl" : "ltr"}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isHebrew ? "משתנים זמינים:" : "Available variables:"}{" "}
                <code className="rounded bg-muted px-1">{"{{guestName}}"}</code>,{" "}
                <code className="rounded bg-muted px-1">{"{{eventTitle}}"}</code>,{" "}
                <code className="rounded bg-muted px-1">{"{{rsvpLink}}"}</code>
              </span>
              <span
                className={cn(
                  charCount > SMS_MAX_LENGTH * 0.9
                    ? "text-amber-600"
                    : "text-muted-foreground"
                )}
              >
                {charCount}/{SMS_MAX_LENGTH}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          {isHebrew ? "תצוגה מקדימה" : "Preview"}
        </Label>
        <div
          className="rounded-lg border bg-muted/30 p-4 text-sm"
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {previewContent ? (
            <pre className="whitespace-pre-wrap font-sans">{previewContent}</pre>
          ) : (
            <span className="text-muted-foreground italic">
              {isHebrew ? "אין תצוגה מקדימה" : "No preview available"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isHebrew
              ? "* התצוגה מציגה כיצד ההודעה תיראה עם פרטי האורח האמיתיים"
              : "* Preview shows how the message will look with actual guest details"}
          </span>
          <Badge variant="outline" className="text-xs">
            {charCount} {isHebrew ? "תווים" : "chars"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
