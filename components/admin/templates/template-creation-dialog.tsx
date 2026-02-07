"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";
import { createWhatsAppTemplateContent } from "@/actions/whatsapp-templates";
import { TemplatePreview } from "./template-preview";
import { ButtonConfigEditor } from "./button-config-editor";
import { VariableHelper } from "./variable-helper";

const TEMPLATE_TYPES: { value: WhatsAppTemplateType; label: string }[] = [
  { value: "INVITE", label: "Standard Invite" },
  { value: "REMINDER", label: "Standard Reminder" },
  { value: "INTERACTIVE_INVITE", label: "Interactive Invite" },
  { value: "INTERACTIVE_REMINDER", label: "Interactive Reminder" },
  { value: "IMAGE_INVITE", label: "Image Invite" },
  { value: "TRANSPORTATION_INVITE", label: "Transportation Invite" },
  { value: "CONFIRMATION", label: "Confirmation" },
  { value: "EVENT_DAY", label: "Event Day" },
  { value: "THANK_YOU", label: "Thank You" },
  { value: "TABLE_ASSIGNMENT", label: "Table Assignment" },
];

interface TemplateCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateCreationDialog({
  open,
  onOpenChange,
  onSuccess,
}: TemplateCreationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [type, setType] = useState<WhatsAppTemplateType>("INVITE");
  const [style, setStyle] = useState<"style1" | "style2" | "style3">("style1");
  const [nameHe, setNameHe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [twilioTemplateName, setTwilioTemplateName] = useState("");
  const [templateBodyHe, setTemplateBodyHe] = useState("");
  const [templateBodyEn, setTemplateBodyEn] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewTextHe, setPreviewTextHe] = useState("");

  // Button configuration (for interactive templates)
  const [buttons, setButtons] = useState<
    Array<{ id: string; titleHe: string; titleEn?: string }>
  >([
    { id: "yes", titleHe: "כן, מגיע", titleEn: "Yes, Coming" },
    { id: "no", titleHe: "לא מגיע", titleEn: "Not Coming" },
    { id: "maybe", titleHe: "אולי", titleEn: "Maybe" },
  ]);

  const isInteractive =
    type === "INTERACTIVE_INVITE" ||
    type === "INTERACTIVE_REMINDER" ||
    type === "IMAGE_INVITE";

  // Auto-generate Twilio template name
  const generateTwilioName = () => {
    const typeLower = type.toLowerCase();
    const styleSuffix = style.replace("style", "");
    return `wedinex_${typeLower}_${styleSuffix}`;
  };

  // Auto-fill suggestion
  const handleAutoGenerate = () => {
    if (!nameHe || !nameEn) {
      setNameHe(`סגנון ${style.replace("style", "")}`);
      setNameEn(`Style ${style.replace("style", "")}`);
    }
    if (!twilioTemplateName) {
      setTwilioTemplateName(generateTwilioName());
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!nameHe || !nameEn) {
      toast.error("Please enter template names in both languages");
      return;
    }

    if (!twilioTemplateName) {
      toast.error("Please enter Twilio template name");
      return;
    }

    if (!templateBodyHe || !templateBodyEn) {
      toast.error("Please enter template body in both languages");
      return;
    }

    // Validate character limits
    if (templateBodyHe.length > 1024) {
      toast.error("Hebrew template body exceeds 1024 characters");
      return;
    }

    if (templateBodyEn.length > 1024) {
      toast.error("English template body exceeds 1024 characters");
      return;
    }

    // Validate buttons for interactive templates
    if (isInteractive) {
      for (const btn of buttons) {
        if (btn.titleHe.length > 20) {
          toast.error(`Hebrew button "${btn.titleHe}" exceeds 20 characters`);
          return;
        }
        if (btn.titleEn?.length && btn.titleEn.length > 20) {
          toast.error(`English button "${btn.titleEn}" exceeds 20 characters`);
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      const result = await createWhatsAppTemplateContent({
        type,
        style,
        nameHe,
        nameEn,
        twilioTemplateName,
        templateBodyHe,
        templateBodyEn,
        variables: getDefaultVariables(),
        buttonsConfig: isInteractive ? buttons : undefined,
        previewText,
        previewTextHe,
      });

      if (result.success) {
        toast.success("Template created successfully!");
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create template");
      }
    } catch (error) {
      toast.error("An error occurred while creating the template");
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultVariables = () => {
    const vars: Record<string, string> = {
      "1": "Guest Name",
      "2": "Event Title",
    };

    if (type === "INVITE" || type === "REMINDER") {
      vars["3"] = "RSVP Link";
    } else if (type === "TRANSPORTATION_INVITE") {
      vars["3"] = "RSVP Link";
      vars["4"] = "Transportation Link";
    } else if (type === "INTERACTIVE_INVITE" || type === "INTERACTIVE_REMINDER") {
      vars["4"] = "Transportation Link (optional)";
    } else if (type === "EVENT_DAY") {
      vars["3"] = "Table Name";
      vars["4"] = "Venue Address";
      vars["5"] = "Navigation URL";
      vars["6"] = "Gift Link";
    } else if (type === "TABLE_ASSIGNMENT" || type === "CONFIRMATION") {
      vars["3"] = "Table Name / RSVP Status";
    }

    return vars;
  };

  const resetForm = () => {
    setNameHe("");
    setNameEn("");
    setTwilioTemplateName("");
    setTemplateBodyHe("");
    setTemplateBodyEn("");
    setPreviewText("");
    setPreviewTextHe("");
    setButtons([
      { id: "yes", titleHe: "כן, מגיע", titleEn: "Yes, Coming" },
      { id: "no", titleHe: "לא מגיע", titleEn: "Not Coming" },
      { id: "maybe", titleHe: "אולי", titleEn: "Maybe" },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="!w-[90vw] !max-w-[1400px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create WhatsApp Template
          </DialogTitle>
          <DialogDescription>
            Create a new WhatsApp message template. After creation, you can submit it to
            Twilio for WhatsApp approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Type and Style */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as WhatsAppTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style1">Style 1</SelectItem>
                  <SelectItem value="style2">Style 2</SelectItem>
                  <SelectItem value="style3">Style 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAutoGenerate}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-Fill
              </Button>
            </div>
          </div>

          {/* Template Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name (Hebrew)</Label>
              <Input
                value={nameHe}
                onChange={(e) => setNameHe(e.target.value)}
                placeholder="סגנון 1"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>Template Name (English)</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Style 1"
              />
            </div>
          </div>

          {/* Twilio Template Name */}
          <div className="space-y-2">
            <Label>Twilio Template Name</Label>
            <Input
              value={twilioTemplateName}
              onChange={(e) => setTwilioTemplateName(e.target.value.toLowerCase())}
              placeholder="wedinex_invite_1"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Must be lowercase alphanumeric with underscores only
            </p>
          </div>

          {/* Variable Helper */}
          <VariableHelper templateType={type} />

          {/* Template Body - Hebrew */}
          <div className="space-y-2">
            <Label>
              Template Body (Hebrew)
              <span className="text-xs text-muted-foreground ml-2">
                {templateBodyHe.length}/1024 characters
              </span>
            </Label>
            <Textarea
              value={templateBodyHe}
              onChange={(e) => setTemplateBodyHe(e.target.value)}
              placeholder="שלום {{1}}, אתם מוזמנים ל{{2}}..."
              dir="rtl"
              className="min-h-[120px] font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{1}}"} for guest name, {"{{2}}"} for event title, etc.
            </p>
          </div>

          {/* Template Body - English */}
          <div className="space-y-2">
            <Label>
              Template Body (English)
              <span className="text-xs text-muted-foreground ml-2">
                {templateBodyEn.length}/1024 characters
              </span>
            </Label>
            <Textarea
              value={templateBodyEn}
              onChange={(e) => setTemplateBodyEn(e.target.value)}
              placeholder="Dear {{1}}, you are invited to {{2}}..."
              className="min-h-[120px] font-mono"
            />
          </div>

          {/* Button Configuration (for interactive templates) */}
          {isInteractive && (
            <ButtonConfigEditor buttons={buttons} onChange={setButtons} />
          )}

          {/* Preview Text (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preview Text (Hebrew) - Optional</Label>
              <Textarea
                value={previewTextHe}
                onChange={(e) => setPreviewTextHe(e.target.value)}
                placeholder="תצוגה מקדימה של ההודעה..."
                dir="rtl"
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Preview Text (English) - Optional</Label>
              <Textarea
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Message preview..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          {/* Live Preview */}
          {(templateBodyHe || templateBodyEn) && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold mb-3">Live Preview</h4>
              <TemplatePreview
                bodyHe={templateBodyHe}
                bodyEn={templateBodyEn}
                buttons={isInteractive ? buttons : undefined}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
