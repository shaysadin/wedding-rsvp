"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Check, Eye, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getWhatsAppTemplateDefinitions,
  type WhatsAppTemplateType,
  type WhatsAppTemplateDefinition,
} from "@/config/whatsapp-templates";
import { getActiveWhatsAppTemplates } from "@/actions/whatsapp-templates";

interface WhatsAppTemplateSelectorProps {
  templateType: WhatsAppTemplateType;
  onTemplateSelect: (contentSid: string | null, style: string) => void;
  previewContext?: {
    guestName: string;
    eventTitle: string;
  };
  disabled?: boolean;
}

interface ActiveTemplate {
  id: string;
  style: string;
  contentSid: string;
  nameHe: string;
  nameEn: string;
  templateText: string | null;
}

export function WhatsAppTemplateSelector({
  templateType,
  onTemplateSelect,
  previewContext,
  disabled = false,
}: WhatsAppTemplateSelectorProps) {
  const locale = useLocale();
  const isHebrew = locale === "he";

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [activeTemplates, setActiveTemplates] = useState<ActiveTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  // Template definitions from config (for display text)
  const templateDefinitions = getWhatsAppTemplateDefinitions(templateType);

  // Default preview context for placeholder display
  const defaultContext = {
    guestName: isHebrew ? "שם האורח" : "Guest Name",
    eventTitle: isHebrew ? "שם האירוע" : "Event Title",
  };

  const context = previewContext || defaultContext;

  // Fetch active templates from database on mount
  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      try {
        const result = await getActiveWhatsAppTemplates(templateType);
        if (result.success && result.templates) {
          setActiveTemplates(result.templates);

          // Auto-select first template if none selected
          if (result.templates.length > 0 && !selectedStyle) {
            const firstTemplate = result.templates[0];
            setSelectedStyle(firstTemplate.style);
            onTemplateSelect(firstTemplate.contentSid, firstTemplate.style);
          }
        }
      } catch (error) {
        console.error("Failed to fetch WhatsApp templates:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [templateType]);

  // Handle template selection
  const handleTemplateSelect = (template: ActiveTemplate) => {
    setSelectedStyle(template.style);
    onTemplateSelect(template.contentSid, template.style);
  };

  // Get preview text for the selected template
  const getPreviewContent = (): string => {
    if (!selectedStyle) return "";

    // First try to get from active template (database)
    const activeTemplate = activeTemplates.find((t) => t.style === selectedStyle);
    if (activeTemplate?.templateText) {
      return activeTemplate.templateText
        .replace(/\{\{1\}\}/g, context.guestName)
        .replace(/\{\{2\}\}/g, context.eventTitle)
        .replace(/\{\{3\}\}/g, "https://...");
    }

    // Fallback to definition
    const definition = templateDefinitions.find((t) => t.style === selectedStyle);
    if (definition) {
      const text = isHebrew ? definition.templateTextHe : definition.templateTextEn;
      return text
        .replace(/\{\{1\}\}/g, context.guestName)
        .replace(/\{\{2\}\}/g, context.eventTitle)
        .replace(/\{\{3\}\}/g, "https://...");
    }

    return "";
  };

  // Check if a style has an active (approved) template in the database
  const isStyleActive = (style: string): boolean => {
    return activeTemplates.some((t) => t.style === style);
  };

  // Get the name for a style (from active template or definition)
  const getStyleName = (style: string): string => {
    const activeTemplate = activeTemplates.find((t) => t.style === style);
    if (activeTemplate) {
      return isHebrew ? activeTemplate.nameHe : activeTemplate.nameEn;
    }
    const definition = templateDefinitions.find((t) => t.style === style);
    if (definition) {
      return isHebrew ? definition.nameHe : definition.nameEn;
    }
    return style;
  };

  const previewContent = getPreviewContent();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-green-600" />
            {isHebrew ? "בחר תבנית WhatsApp" : "Select WhatsApp Template"}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // If no active templates, show a message
  if (activeTemplates.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {isHebrew
            ? "אין תבניות WhatsApp מאושרות עדיין. יש להוסיף תבניות דרך לוח הבקרה של Twilio."
            : "No approved WhatsApp templates yet. Templates must be added via the Twilio dashboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
          {isHebrew ? "בחר תבנית WhatsApp" : "Select WhatsApp Template"}
        </Label>

        <div className="grid grid-cols-3 gap-2">
          {templateDefinitions.map((definition) => {
            const isActive = isStyleActive(definition.style);
            const isSelected = selectedStyle === definition.style;
            const name = getStyleName(definition.style);

            return (
              <button
                key={definition.style}
                type="button"
                onClick={() => {
                  const activeTemplate = activeTemplates.find(
                    (t) => t.style === definition.style
                  );
                  if (activeTemplate) {
                    handleTemplateSelect(activeTemplate);
                  }
                }}
                disabled={disabled || !isActive}
                className={cn(
                  "relative rounded-lg border p-3 text-start transition-all",
                  isSelected && isActive
                    ? "border-green-500 bg-green-50 ring-1 ring-green-500 dark:bg-green-900/20"
                    : isActive
                    ? "border-border hover:border-green-500/50 hover:bg-muted/50"
                    : "border-border bg-muted/30 opacity-50 cursor-not-allowed",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{name}</span>
                  {isSelected && isActive && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                {!isActive && (
                  <Badge
                    variant="outline"
                    className="mt-1 text-[10px] text-muted-foreground"
                  >
                    {isHebrew ? "לא מאושר" : "Not approved"}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview Section */}
      {previewContent && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" />
            {isHebrew ? "תצוגה מקדימה" : "Preview"}
          </Label>
          <div
            className="rounded-lg border border-green-200 bg-green-50/50 p-4 text-sm dark:border-green-800 dark:bg-green-900/20"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <pre className="whitespace-pre-wrap font-sans">{previewContent}</pre>
          </div>
          <p className="text-xs text-muted-foreground">
            {isHebrew
              ? "* התבנית הסופית תשלח מ-WhatsApp Business עם עיצוב מאושר"
              : "* Final template will be sent from WhatsApp Business with approved formatting"}
          </p>
        </div>
      )}
    </div>
  );
}
