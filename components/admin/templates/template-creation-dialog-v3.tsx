"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";
import { createWhatsAppTemplateContent, submitTemplateToTwilio } from "@/actions/whatsapp-templates";
import { ButtonConfigEditor } from "./button-config-editor";
import { VariableHelper } from "./variable-helper";
import { TemplateValidator } from "./template-validator";
import { getTemplatePreset } from "@/config/whatsapp-template-presets";

// Twilio Content Types
const CONTENT_TYPES = [
  { value: "twilio/text", label: "Text", labelHe: "טקסט" },
  { value: "twilio/quick-reply", label: "Quick Reply (Buttons)", labelHe: "כפתורי תגובה מהירה" },
  { value: "twilio/media", label: "Media (Image/Video)", labelHe: "מדיה (תמונה/וידאו)" },
  { value: "twilio/list-picker", label: "List Picker", labelHe: "רשימת בחירה" },
  { value: "whatsapp/card", label: "WhatsApp Card", labelHe: "כרטיס WhatsApp" },
];

// WhatsApp Template Categories
const TEMPLATE_CATEGORIES = [
  { value: "UTILITY", label: "Utility", labelHe: "שימושי", description: "General business updates" },
  { value: "MARKETING", label: "Marketing", labelHe: "שיווקי", description: "Promotional content" },
  { value: "AUTHENTICATION", label: "Authentication", labelHe: "אימות", description: "OTP codes" },
];

// Languages
const LANGUAGES = [
  { value: "he", label: "Hebrew (עברית)", labelHe: "עברית" },
  { value: "en", label: "English", labelHe: "אנגלית" },
  { value: "en_US", label: "English (US)", labelHe: "אנגלית (ארה\"ב)" },
  { value: "he_IL", label: "Hebrew (Israel)", labelHe: "עברית (ישראל)" },
];

const TEMPLATE_TYPES: { value: WhatsAppTemplateType; label: string; labelHe: string }[] = [
  { value: "INVITE", label: "Standard Invite", labelHe: "הזמנה רגילה" },
  { value: "REMINDER", label: "Standard Reminder", labelHe: "תזכורת רגילה" },
  { value: "INTERACTIVE_INVITE", label: "Interactive Invite", labelHe: "הזמנה אינטראקטיבית" },
  { value: "INTERACTIVE_REMINDER", label: "Interactive Reminder", labelHe: "תזכורת אינטראקטיבית" },
  { value: "IMAGE_INVITE", label: "Image Invite", labelHe: "הזמנה עם תמונה" },
  { value: "CONFIRMATION", label: "Confirmation", labelHe: "אישור RSVP" },
  { value: "EVENT_DAY", label: "Event Day", labelHe: "יום האירוע" },
  { value: "THANK_YOU", label: "Thank You", labelHe: "תודה" },
  { value: "TABLE_ASSIGNMENT", label: "Table Assignment", labelHe: "שיבוץ שולחן" },
  { value: "GUEST_COUNT_LIST", label: "Guest Count List", labelHe: "ספירת אורחים" },
];

// Template Selection Options (Type + Style combinations)
const TEMPLATE_SELECTION_OPTIONS = TEMPLATE_TYPES.flatMap((template) => [
  {
    value: `${template.value}-style1`,
    label: `${template.labelHe} - סגנון 1 (מינימלי)`,
    labelEn: `${template.label} - Style 1 (Minimal)`,
    type: template.value,
    style: "style1" as const,
  },
  {
    value: `${template.value}-style2`,
    label: `${template.labelHe} - סגנון 2 (מפורט)`,
    labelEn: `${template.label} - Style 2 (Detailed)`,
    type: template.value,
    style: "style2" as const,
  },
  {
    value: `${template.value}-style3`,
    label: `${template.labelHe} - סגנון 3 (מפורט + הסעות)`,
    labelEn: `${template.label} - Style 3 (Detailed + Transportation)`,
    type: template.value,
    style: "style3" as const,
  },
]);

interface TemplateCreationDialogV3Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateCreationDialogV3({
  open,
  onOpenChange,
  onSuccess,
}: TemplateCreationDialogV3Props) {
  // Submission lock to prevent duplicate submissions
  const submissionLockRef = useRef(false);

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "pending" | "approved" | "rejected">("idle");

  // Step 1: Basic Settings
  const [templateSelection, setTemplateSelection] = useState<string>("INVITE-style1");
  const [type, setType] = useState<WhatsAppTemplateType>("INVITE");
  const [style, setStyle] = useState<"style1" | "style2" | "style3">("style1");
  const [contentType, setContentType] = useState<string>("twilio/quick-reply");
  const [category, setCategory] = useState<string>("UTILITY");
  const [language] = useState<string>("he"); // Always Hebrew for now
  const [twilioTemplateName, setTwilioTemplateName] = useState("");

  // Step 2: Content (templates always in Hebrew)
  const [templateBodyHe, setTemplateBodyHe] = useState("");
  const [previewTextHe, setPreviewTextHe] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [includeMedia, setIncludeMedia] = useState(false);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "DOCUMENT">("IMAGE");

  // Button configuration
  const [buttons, setButtons] = useState<Array<{ id: string; titleHe: string }>>([
    { id: "yes", titleHe: "כן, מגיע" },
    { id: "no", titleHe: "לא מגיע" },
    { id: "maybe", titleHe: "אולי" },
  ]);

  const isInteractive = contentType === "twilio/quick-reply" ||
    contentType === "whatsapp/card" ||
    type === "INTERACTIVE_INVITE" ||
    type === "INTERACTIVE_REMINDER" ||
    type === "IMAGE_INVITE";

  const hasMedia = contentType === "twilio/media" || includeMedia;

  // Handle template selection change - auto-fill ALL fields from preset
  const handleTemplateSelectionChange = (selection: string) => {
    setTemplateSelection(selection);
    const option = TEMPLATE_SELECTION_OPTIONS.find((opt) => opt.value === selection);
    if (option) {
      setType(option.type);
      setStyle(option.style);

      // Auto-generate Twilio name
      const typeLower = option.type.toLowerCase();
      const styleSuffix = option.style.replace("style", "");
      const langSuffix = "he"; // Always Hebrew for now
      setTwilioTemplateName(`wedinex_${typeLower}_${styleSuffix}_${langSuffix}`);

      // Load preset and auto-fill ALL fields
      const preset = getTemplatePreset(option.type, option.style);
      if (preset) {
        // Auto-fill content type and category
        setContentType(preset.contentType);
        setCategory(preset.category);

        // Auto-fill message content
        setTemplateBodyHe(preset.templateBodyHe);
        setPreviewTextHe(preset.previewTextHe);

        // Auto-fill optional fields
        if (preset.headerText) setHeaderText(preset.headerText);
        if (preset.footerText) setFooterText(preset.footerText);
        if (preset.mediaType) setMediaType(preset.mediaType);
        if (preset.includeMedia !== undefined) setIncludeMedia(preset.includeMedia);

        // Auto-fill buttons for interactive templates
        if (preset.buttons && preset.buttons.length > 0) {
          setButtons(preset.buttons);
        }

        toast.success("תבנית נטענה בהצלחה! אפשר לערוך ולהתאים לפי הצורך.");
      }
    }
  };

  // Auto-generate Twilio template name
  const generateTwilioName = () => {
    const typeLower = type.toLowerCase();
    const styleSuffix = style.replace("style", "");
    const langSuffix = "he"; // Always Hebrew for now
    return `wedinex_${typeLower}_${styleSuffix}_${langSuffix}`;
  };

  // Auto-generate complete template (only message content, not name)
  const handleAutoGenerateComplete = () => {
    // Use preset to fill all fields
    const preset = getTemplatePreset(type, style);
    if (preset) {
      setTemplateBodyHe(preset.templateBodyHe);
      setPreviewTextHe(preset.previewTextHe);
      setContentType(preset.contentType);
      setCategory(preset.category);

      if (preset.headerText) setHeaderText(preset.headerText);
      if (preset.footerText) setFooterText(preset.footerText);
      if (preset.mediaType) setMediaType(preset.mediaType);
      if (preset.includeMedia !== undefined) setIncludeMedia(preset.includeMedia);
      if (preset.buttons && preset.buttons.length > 0) {
        setButtons(preset.buttons);
      }

      toast.success("תוכן ההודעה נוצר בהצלחה!");
    } else {
      toast.error("לא נמצאה תבנית מוכנה לסוג זה");
    }
  };


  // Validation
  const validateStep1 = (): boolean => {
    if (!templateSelection) {
      toast.error("נא לבחור סוג תבנית");
      return false;
    }
    if (!contentType) {
      toast.error("נא לבחור סוג תוכן");
      return false;
    }
    if (!category) {
      toast.error("נא לבחור קטגוריה");
      return false;
    }
    if (!twilioTemplateName.trim()) {
      toast.error("נא להזין שם Twilio");
      return false;
    }
    if (contentType === "twilio/media" && !mediaType) {
      toast.error("נא לבחור סוג מדיה");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!templateBodyHe.trim()) {
      toast.error("נא להזין את תוכן ההודעה");
      return false;
    }
    if (templateBodyHe.length > 1024) {
      toast.error("תוכן ההודעה חורג מ-1024 תווים");
      return false;
    }
    // Check if template starts or ends with a variable (WhatsApp restriction)
    if (templateBodyHe.trim().startsWith("{{") || templateBodyHe.trim().endsWith("}}")) {
      toast.error("ההודעה לא יכולה להתחיל או להסתיים במשתנה ({{...}})");
      return false;
    }
    if (isInteractive && buttons.length > 0) {
      for (const btn of buttons) {
        if (!btn.titleHe.trim()) {
          toast.error("כל הכפתורים חייבים להכיל טקסט");
          return false;
        }
        if (btn.titleHe.length > 20) {
          toast.error(`כפתור "${btn.titleHe}" חורג מ-20 תווים`);
          return false;
        }
      }
      if (buttons.length > 3) {
        toast.error("מקסימום 3 כפתורים מותרים");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    // Ref-based lock to prevent ALL duplicate submissions (even in React Strict Mode)
    if (submissionLockRef.current) {
      console.log("[Template Creation] Submission already in progress (ref lock), ignoring duplicate");
      return;
    }

    // Additional state-based checks
    if (isLoading || submissionStatus === "submitting" || submissionStatus === "pending") {
      console.log("[Template Creation] Already submitting (state check), ignoring duplicate");
      return;
    }

    if (!validateStep2()) return;

    // Set the lock IMMEDIATELY before any async operations
    submissionLockRef.current = true;
    console.log("[Template Creation] Submission lock acquired, starting submission...");

    setIsLoading(true);
    setSubmissionStatus("submitting");

    try {
      // Generate display name from selection
      const selectedOption = TEMPLATE_SELECTION_OPTIONS.find(opt => opt.value === templateSelection);
      const displayNameHe = selectedOption?.label || twilioTemplateName;
      const displayNameEn = selectedOption?.labelEn || twilioTemplateName;

      // Step 1: Create template in database
      const result = await createWhatsAppTemplateContent({
        type,
        style,
        nameHe: displayNameHe,
        nameEn: displayNameEn,
        twilioTemplateName,
        templateBodyHe,
        templateBodyEn: templateBodyHe, // Same as Hebrew for now
        variables: getDefaultVariables(),
        buttonsConfig: isInteractive ? buttons.map(b => ({
          ...b,
          titleEn: b.titleHe,
        })) : undefined,
        previewText: previewTextHe || templateBodyHe.substring(0, 100),
        previewTextHe: previewTextHe || templateBodyHe.substring(0, 100),
        // New fields
        contentType,
        category,
        language,
        headerText: headerText || undefined,
        footerText: footerText || undefined,
        mediaType: hasMedia ? mediaType : undefined,
      });

      if (!result.success) {
        console.error("[Template Creation] Error:", result.error);
        toast.error(result.error || "שגיאה ביצירת התבנית");
        setSubmissionStatus("idle");
        setIsLoading(false);
        return;
      }

      // Step 2: Submit to Twilio for WhatsApp approval
      toast.info("שולח לאישור WhatsApp...");
      setSubmissionStatus("pending");

      const approvalResult = await submitTemplateToTwilio(result.template!.id);

      if (approvalResult.success) {
        setSubmissionStatus("pending");
        toast.success("התבנית נוצרה ונשלחה לאישור. הסטטוס יתעדכן בקרוב.");
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        }, 2000);
      } else {
        toast.warning("התבנית נוצרה אך לא נשלחה לאישור. תוכל לשלוח מאוחר יותר.");
        setSubmissionStatus("idle");
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        }, 1500);
      }
    } catch (error) {
      toast.error("שגיאה ביצירת התבנית");
      setSubmissionStatus("idle");
    } finally {
      setIsLoading(false);
      // Release the lock after a short delay to ensure everything is complete
      setTimeout(() => {
        submissionLockRef.current = false;
      }, 100);
    }
  };

  const getDefaultVariables = () => {
    const vars: Record<string, string> = {
      "1": "שם האורח/ת",
      "2": "שם האירוע",
      "3": "שם המקום",
      "4": "כתובת מלאה",
      "5": "תאריך",
      "6": "שעה",
      "7": "קישור RSVP",
      "8": "מספר שולחן",
      "9": "קישור הסעות",
    };

    // Add {{10}} for media URL in ALL media templates (IMAGE_INVITE, interactive with media header, etc.)
    if (hasMedia || type === "IMAGE_INVITE") {
      vars["10"] = "demo/image/upload/sample.jpg";
    }

    return vars;
  };

  const resetForm = () => {
    // Reset submission lock
    submissionLockRef.current = false;

    setCurrentStep(1);
    setSubmissionStatus("idle");
    setTemplateSelection("INVITE-style1");
    setType("INVITE");
    setStyle("style1");
    setContentType("twilio/quick-reply");
    setCategory("UTILITY");
    setTwilioTemplateName("");
    setTemplateBodyHe("");
    setPreviewTextHe("");
    setHeaderText("");
    setFooterText("");
    setIncludeMedia(false);
    setButtons([
      { id: "yes", titleHe: "כן, מגיע" },
      { id: "no", titleHe: "לא מגיע" },
      { id: "maybe", titleHe: "אולי" },
    ]);
  };

  const getStatusIcon = () => {
    switch (submissionStatus) {
      case "submitting":
        return <Icons.spinner className="h-4 w-4 animate-spin text-blue-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (submissionStatus) {
      case "submitting":
        return "שולח לאישור...";
      case "pending":
        return "ממתין לאישור WhatsApp";
      case "approved":
        return "אושר על ידי WhatsApp";
      case "rejected":
        return "נדחה על ידי WhatsApp";
      default:
        return "";
    }
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
            יצירת תבנית WhatsApp
            {submissionStatus !== "idle" && (
              <Badge variant="outline" className="mr-auto flex items-center gap-1">
                {getStatusIcon()}
                {getStatusText()}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            שלב 1: בחר סוג תוכן, קטגוריה ושפה | שלב 2: כתוב את תוכן ההודעה והגדר כפתורים
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 py-4" dir="rtl">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
              currentStep >= 1 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
            }`}>
              {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">סוג תוכן ושם</span>
              <span className="text-xs text-muted-foreground">Content Type, Category, Language</span>
            </div>
          </div>
          <Separator className="w-12" />
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
              currentStep >= 2 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
            }`}>
              2
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">תוכן ההודעה</span>
              <span className="text-xs text-muted-foreground">Body, Buttons, Variables</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 py-4" dir="rtl">
          {/* Step 1: Content Type, Category, Language & Name */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">צור תבנית עבור: *</Label>
                <Select value={templateSelection} onValueChange={handleTemplateSelectionChange}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="בחר סוג תבנית וסגנון..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {TEMPLATE_SELECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  בחר את סוג ההודעה והסגנון שברצונך ליצור
                </p>
              </div>

              <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                <h3 className="text-sm font-semibold mb-3">הגדרות Twilio/WhatsApp</h3>
                <div className="space-y-4">
                  {/* Content Type */}
                  <div className="space-y-2">
                    <Label>סוג תוכן (Content Type) *</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>
                            {ct.labelHe} ({ct.label})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Quick Reply = כפתורי תגובה | Media = תמונה/וידאו
                    </p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>קטגוריה (Category) *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex flex-col">
                              <span>{cat.labelHe}</span>
                              <span className="text-xs text-muted-foreground">{cat.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language - Read-only, always Hebrew */}
                  <div className="space-y-2">
                    <Label>שפה (Language)</Label>
                    <Input value="עברית (Hebrew)" disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      כרגע תומכים בעברית בלבד. תמיכה באנגלית תתווסף בקרוב.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Twilio Template Name */}
              <div className="space-y-2">
                <Label htmlFor="twilioTemplateName" className="text-base font-semibold">
                  שם תבנית Twilio (Template Name) *
                </Label>
                <Input
                  id="twilioTemplateName"
                  value={twilioTemplateName}
                  onChange={(e) => setTwilioTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="wedinex_invite_1_he"
                  dir="ltr"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  שם באנגלית, אותיות קטנות, קו תחתון (_) בלבד. נוצר אוטומטית כשבוחרים סוג תבנית.
                </p>
              </div>

              {/* Media Options for Media Content Type */}
              {contentType === "twilio/media" && (
                <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <h4 className="text-sm font-semibold mb-3">⚠️ הגדרות מדיה</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>סוג מדיה *</Label>
                      <Select value={mediaType} onValueChange={(v) => setMediaType(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMAGE">תמונה (Image)</SelectItem>
                          <SelectItem value="VIDEO">וידאו (Video)</SelectItem>
                          <SelectItem value="DOCUMENT">מסמך (Document)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-xs text-muted-foreground p-3 bg-white dark:bg-gray-800 rounded border">
                      <p className="font-semibold mb-1">📌 חשוב: פורמט Media URL</p>
                      <code className="text-xs bg-muted px-1 rounded">https://res.cloudinary.com/{`{{10}}`}</code>
                      <p className="mt-2">המשתנה {`{{10}}`} יכיל את נתיב התמונה</p>
                      <p className="mt-1">דוגמה: <code className="bg-muted px-1 rounded">demo/image/upload/sample.jpg</code></p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Media Header for Interactive Templates (Quick Reply & Card) */}
              {(contentType === "twilio/quick-reply" ||
                contentType === "whatsapp/card" ||
                type === "INTERACTIVE_INVITE" ||
                type === "INTERACTIVE_REMINDER") && (
                <Card className="p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">📸 כותרת מדיה (Media Header)</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          הוסף תמונה/וידאו בראש ההודעה (אופציונלי)
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeMedia}
                          onChange={(e) => setIncludeMedia(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">
                          {includeMedia ? "מופעל" : "כבוי"}
                        </span>
                      </label>
                    </div>

                    {includeMedia && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-2">
                          <Label>סוג מדיה *</Label>
                          <Select value={mediaType} onValueChange={(v) => setMediaType(v as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IMAGE">תמונה (Image)</SelectItem>
                              <SelectItem value="VIDEO">וידאו (Video)</SelectItem>
                              <SelectItem value="DOCUMENT">מסמך (Document)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-xs text-muted-foreground p-3 bg-white dark:bg-gray-800 rounded border">
                          <p className="font-semibold mb-1">📌 פורמט Media URL</p>
                          <code className="text-xs bg-muted px-1 rounded">https://res.cloudinary.com/{`{{10}}`}</code>
                          <p className="mt-2">המשתנה {`{{10}}`} ישמש לנתיב התמונה ב-Cloudinary</p>
                          <p className="mt-1">דוגמה לערך: <code className="bg-muted px-1 rounded">invitations/wedding_invite.jpg</code></p>
                          <p className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ ודא שהתמונה זמינה ב-Cloudinary לפני שליחת ההודעה
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>שלב הבא:</strong> תוכן התבנית, כפתורים, ומשתנים
                </p>
              </Card>
            </div>
          )}

          {/* Step 2: Template Content */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Selected Template Summary */}
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">תבנית שנבחרה:</h3>
                    <p className="text-base font-medium">
                      {TEMPLATE_SELECTION_OPTIONS.find(opt => opt.value === templateSelection)?.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {twilioTemplateName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleAutoGenerateComplete}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    צור הודעה מקצועית
                  </Button>
                </div>
              </Card>

              {/* Variable Helper */}
              <VariableHelper templateType={type} style={style} />

              {/* Template Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="templateBodyHe">תוכן ההודעה (Body) *</Label>
                  <span className={`text-sm ${templateBodyHe.length > 1024 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {templateBodyHe.length}/1024 תווים
                  </span>
                </div>
                <Textarea
                  id="templateBodyHe"
                  value={templateBodyHe}
                  onChange={(e) => setTemplateBodyHe(e.target.value)}
                  placeholder="שלום {{1}}, הוזמנת לאירוע {{2}}..."
                  rows={10}
                  className="font-mono text-sm"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">
                  משתנים זמינים: {`{{1}}`} שם אורח, {`{{2}}`} שם אירוע, {`{{3}}`} שם מקום, {`{{4}}`} כתובת, {`{{5}}`} תאריך, {`{{6}}`} שעה, {`{{7}}`} קישור, {`{{8}}`} מספר שולחן, {`{{9}}`} הסעות, {`{{10}}`} תמונה
                </p>
              </div>

              {/* Header & Footer (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headerText">כותרת עליונה (Header) - אופציונלי</Label>
                  <Input
                    id="headerText"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="ברוכים הבאים!"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerText">כותרת תחתונה (Footer) - אופציונלי</Label>
                  <Input
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="תודה, צוות Wedinex"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Preview Text */}
              <div className="space-y-2">
                <Label htmlFor="previewTextHe">
                  טקסט תצוגה מקדימה - אופציונלי
                  <span className="text-xs text-muted-foreground mr-2">(יוצג בממשק בחירת תבניות)</span>
                </Label>
                <Input
                  id="previewTextHe"
                  value={previewTextHe}
                  onChange={(e) => setPreviewTextHe(e.target.value)}
                  placeholder="הזמנה רשמית לאירוע..."
                  dir="rtl"
                />
              </div>

              {/* Buttons for Quick Reply */}
              {isInteractive && (
                <Card className="p-4 bg-purple-50 dark:bg-purple-950/30 border-purple-200">
                  <h3 className="font-semibold mb-3">כפתורים אינטראקטיביים (Quick Reply Buttons)</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    מקסימום 3 כפתורים, עד 20 תווים כל כפתור
                  </p>
                  <ButtonConfigEditor
                    buttons={buttons}
                    onChange={setButtons}
                    hebrewOnly={true}
                  />
                </Card>
              )}

              {/* Validation & Preview */}
              {templateBodyHe && (
                <TemplateValidator
                  templateBody={templateBodyHe}
                  buttons={isInteractive ? buttons : []}
                  locale="he"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {currentStep === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                ביטול
              </Button>
              <Button onClick={handleNext} disabled={isLoading}>
                הבא
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                <ArrowRight className="ml-2 h-4 w-4" />
                הקודם
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isLoading || submissionStatus === "submitting" || submissionStatus === "pending"}>
                {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
                צור ושלח לאישור
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
