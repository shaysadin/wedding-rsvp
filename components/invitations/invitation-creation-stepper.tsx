"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { EventType, InvitationFieldType } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";

import { getActiveTemplates } from "@/actions/invitation-templates";
import { generateInvitation, setActiveInvitation } from "@/actions/generate-invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TemplateField {
  id: string;
  fieldType: InvitationFieldType;
  label: string;
  labelHe: string | null;
  placeholder: string | null;
  isRequired: boolean;
  originalValue: string;
}

interface Template {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  eventType: EventType;
  imageUrl: string;
  thumbnailUrl: string | null;
  fields: TemplateField[];
}

interface InvitationCreationStepperProps {
  eventId: string;
  onComplete?: () => void;
}

const EVENT_TYPES: { value: EventType; labelEn: string; labelHe: string; icon: keyof typeof Icons }[] = [
  { value: "WEDDING", labelEn: "Wedding", labelHe: "חתונה", icon: "heart" },
  { value: "HENNA", labelEn: "Henna", labelHe: "חינה", icon: "sparkles" },
  { value: "ENGAGEMENT", labelEn: "Engagement", labelHe: "אירוסין", icon: "gift" },
  { value: "OTHER", labelEn: "Other", labelHe: "אחר", icon: "calendar" },
];

const STEPS = [
  { id: 1, titleEn: "Event Type", titleHe: "סוג אירוע" },
  { id: 2, titleEn: "Choose Template", titleHe: "בחירת תבנית" },
  { id: 3, titleEn: "Fill Details", titleHe: "מילוי פרטים" },
  { id: 4, titleEn: "Generate", titleHe: "יצירה" },
];

const LOADING_PHASES = [
  { id: 1, messageEn: "Preparing your template...", messageHe: "מכין את התבנית...", icon: "fileText" as const },
  { id: 2, messageEn: "Applying your custom details...", messageHe: "מוסיף את הפרטים שלך...", icon: "pencil" as const },
  { id: 3, messageEn: "Generating with AI...", messageHe: "יוצר עם בינה מלאכותית...", icon: "sparkles" as const },
  { id: 4, messageEn: "Finalizing your invitation...", messageHe: "מסיים את ההזמנה...", icon: "check" as const },
];

export function InvitationCreationStepper({
  eventId,
  onComplete,
}: InvitationCreationStepperProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [isSettingActive, setIsSettingActive] = useState(false);
  const [showZoomDialog, setShowZoomDialog] = useState(false);

  // Load templates when event type is selected
  useEffect(() => {
    if (selectedEventType && currentStep === 2) {
      loadTemplates();
    }
  }, [selectedEventType, currentStep]);

  const loadTemplates = async () => {
    if (!selectedEventType) return;

    setIsLoadingTemplates(true);
    try {
      const result = await getActiveTemplates(selectedEventType);
      if (result.error) {
        toast.error(result.error);
      } else if (result.templates) {
        setTemplates(result.templates as unknown as Template[]);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת התבניות" : "Failed to load templates");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setCurrentStep(2);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFieldValues({});
    setCurrentStep(3);
  };

  const handleFieldChange = (fieldType: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldType]: value }));
  };

  const handleProceedToGenerate = () => {
    if (!selectedTemplate) return;

    // Validate required fields
    for (const field of selectedTemplate.fields) {
      if (field.isRequired && !fieldValues[field.fieldType]) {
        toast.error(
          isRTL
            ? `נא למלא את השדה "${field.labelHe || field.label}"`
            : `Please fill in "${field.label}"`
        );
        return;
      }
    }
    setCurrentStep(4);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setLoadingPhase(1);

    // Simulate loading phases for better UX
    const phaseInterval = setInterval(() => {
      setLoadingPhase((prev) => {
        if (prev < LOADING_PHASES.length) return prev + 1;
        return prev;
      });
    }, 1500);

    try {
      const result = await generateInvitation({
        eventId,
        templateId: selectedTemplate.id,
        fieldValues: Object.entries(fieldValues).map(([fieldType, value]) => ({
          fieldType: fieldType as InvitationFieldType,
          value,
        })),
      });

      clearInterval(phaseInterval);

      if (result.error) {
        toast.error(result.error);
        setIsGenerating(false);
        setLoadingPhase(0);
      } else if (result.pngUrl) {
        // Show final phase briefly before showing result
        setLoadingPhase(LOADING_PHASES.length);
        await new Promise((resolve) => setTimeout(resolve, 500));

        setGeneratedUrl(result.pngUrl);
        setGeneratedId(result.id || null);
        setIsGenerating(false);
        window.dispatchEvent(new CustomEvent("invitation-data-changed"));
      }
    } catch {
      clearInterval(phaseInterval);
      toast.error(isRTL ? "שגיאה ביצירת ההזמנה" : "Failed to generate invitation");
      setIsGenerating(false);
      setLoadingPhase(0);
    }
  };

  const handleSetAsActive = async () => {
    if (!generatedId) return;

    setIsSettingActive(true);
    try {
      const result = await setActiveInvitation(generatedId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההזמנה הוגדרה כפעילה!" : "Invitation set as active!");
        window.dispatchEvent(new CustomEvent("invitation-data-changed"));
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהגדרת ההזמנה" : "Failed to set invitation as active");
    } finally {
      setIsSettingActive(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedUrl(null);
    setGeneratedId(null);
    setLoadingPhase(0);
    // Small delay to show loading state, then trigger generation
    setTimeout(() => {
      handleGenerate();
    }, 100);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setSelectedEventType(null);
    setSelectedTemplate(null);
    setFieldValues({});
    setGeneratedUrl(null);
    setGeneratedId(null);
    setLoadingPhase(0);
  };

  const handleDone = () => {
    handleStartOver();
    onComplete?.();
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Step Indicator */}
      <div className="flex items-center justify-center">
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          {STEPS.map((step, index) => (
            <div key={step.id} className={cn("flex items-center", isRTL && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-all duration-300",
                  currentStep === step.id
                    ? "border-primary bg-primary text-primary-foreground scale-110"
                    : currentStep > step.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Icons.check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 transition-all duration-300",
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {isRTL ? STEPS[currentStep - 1].titleHe : STEPS[currentStep - 1].titleEn}
        </h3>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Event Type Selection */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {EVENT_TYPES.map((eventType) => {
                const IconComponent = Icons[eventType.icon];
                return (
                  <button
                    key={eventType.value}
                    onClick={() => handleEventTypeSelect(eventType.value)}
                    className={cn(
                      "group relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all hover:border-primary hover:shadow-md",
                      selectedEventType === eventType.value
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <span className="font-medium">
                      {isRTL ? eventType.labelHe : eventType.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Template Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icons.fileText className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {isRTL
                      ? "אין תבניות זמינות לסוג אירוע זה"
                      : "No templates available for this event type"}
                  </p>
                  <Button variant="outline" className="mt-4" onClick={handleBack}>
                    {isRTL ? "חזור לבחירת סוג אירוע" : "Go back to event type"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={cn(
                          "group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all hover:border-primary hover:shadow-lg",
                          selectedTemplate?.id === template.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-muted"
                        )}
                      >
                        {template.thumbnailUrl || template.imageUrl ? (
                          <Image
                            src={template.thumbnailUrl || template.imageUrl}
                            alt={isRTL ? template.nameHe : template.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <Icons.fileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                          <p className="text-sm font-medium text-white">
                            {isRTL ? template.nameHe : template.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-start pt-4">
                    <Button variant="outline" onClick={handleBack}>
                      <Icons.arrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "me-2")} />
                      {isRTL ? "חזור" : "Back"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Fill Details */}
          {currentStep === 3 && selectedTemplate && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Template Preview */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? "תבנית שנבחרה" : "Selected Template"}
                  </Label>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-muted">
                    <Image
                      src={selectedTemplate.thumbnailUrl || selectedTemplate.imageUrl}
                      alt={isRTL ? selectedTemplate.nameHe : selectedTemplate.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Form Fields */}
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-4 pr-4">
                    <Label className="text-sm font-medium text-muted-foreground">
                      {isRTL ? "מלאו את הפרטים" : "Fill in the details"}
                    </Label>
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label
                          className={cn(
                            field.isRequired &&
                              "after:content-['*'] after:ml-1 after:text-destructive"
                          )}
                        >
                          {isRTL ? field.labelHe || field.label : field.label}
                        </Label>
                        <Input
                          value={fieldValues[field.fieldType] || ""}
                          onChange={(e) => handleFieldChange(field.fieldType, e.target.value)}
                          placeholder={field.placeholder || field.originalValue}
                          dir="auto"
                          className="text-base"
                        />
                        {field.originalValue && (
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? "יוחלף מ: " : "Replaces: "}
                            &quot;{field.originalValue}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <Icons.arrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "me-2")} />
                  {isRTL ? "חזור" : "Back"}
                </Button>
                <Button onClick={handleProceedToGenerate} size="lg">
                  {isRTL ? "המשך ליצירה" : "Continue to Generate"}
                  <Icons.arrowRight className={cn("h-4 w-4", isRTL ? "me-2 rotate-180" : "ml-2")} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {currentStep === 4 && selectedTemplate && (
            <div className="space-y-6">
              {/* Pre-generation state */}
              {!isGenerating && !generatedUrl && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Card className="w-full max-w-md border-0 bg-gradient-to-br from-background to-muted/30 shadow-xl">
                    <CardContent className="flex flex-col items-center gap-6 p-8">
                      <div className="relative">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                          <Icons.sparkles className="h-12 w-12 text-primary" />
                        </div>
                        <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                          <Icons.zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-2 text-center">
                        <h4 className="text-xl font-semibold">
                          {isRTL ? "הכל מוכן!" : "Ready to Create!"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {isRTL
                            ? "לחצו על הכפתור ליצירת ההזמנה המותאמת אישית שלכם"
                            : "Click the button to generate your personalized invitation"}
                        </p>
                      </div>

                      {/* Summary Card */}
                      <div className="w-full space-y-3 rounded-xl bg-muted/50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{isRTL ? "תבנית" : "Template"}</span>
                          <Badge variant="secondary">
                            {isRTL ? selectedTemplate.nameHe : selectedTemplate.name}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{isRTL ? "שדות מותאמים" : "Custom fields"}</span>
                          <Badge variant="outline">{Object.keys(fieldValues).length}</Badge>
                        </div>
                      </div>

                      <Button
                        onClick={handleGenerate}
                        size="lg"
                        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg transition-all hover:shadow-xl"
                      >
                        <Icons.sparkles className="h-5 w-5" />
                        {isRTL ? "צור הזמנה עם AI" : "Generate with AI"}
                      </Button>

                      <Button variant="ghost" onClick={handleBack} className="text-muted-foreground">
                        <Icons.arrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "me-2")} />
                        {isRTL ? "חזור לעריכה" : "Back to edit"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Loading state with animated phases */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl">
                    {/* Animated gradient header */}
                    <div className="relative h-2 w-full overflow-hidden bg-muted">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/60 to-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(loadingPhase / LOADING_PHASES.length) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>

                    <CardContent className="flex flex-col items-center gap-8 p-8">
                      {/* Animated icon */}
                      <div className="relative">
                        <motion.div
                          className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          >
                            <Icons.sparkles className="h-14 w-14 text-primary" />
                          </motion.div>
                        </motion.div>

                        {/* Orbiting dots */}
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="absolute h-3 w-3 rounded-full bg-primary/60"
                            style={{ top: "50%", left: "50%" }}
                            animate={{
                              x: [0, 50 * Math.cos((i * 2 * Math.PI) / 3 + Date.now() / 1000), 0],
                              y: [0, 50 * Math.sin((i * 2 * Math.PI) / 3 + Date.now() / 1000), 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: i * 0.3,
                            }}
                          />
                        ))}
                      </div>

                      {/* Phase messages */}
                      <div className="min-h-[80px] text-center">
                        <AnimatePresence mode="wait">
                          {loadingPhase > 0 && loadingPhase <= LOADING_PHASES.length && (
                            <motion.div
                              key={loadingPhase}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-2"
                            >
                              <h4 className="text-lg font-semibold">
                                {isRTL
                                  ? LOADING_PHASES[loadingPhase - 1]?.messageHe
                                  : LOADING_PHASES[loadingPhase - 1]?.messageEn}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {isRTL ? "אנא המתינו..." : "Please wait..."}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Phase indicators */}
                      <div className="flex items-center gap-2">
                        {LOADING_PHASES.map((phase, index) => (
                          <motion.div
                            key={phase.id}
                            className={cn(
                              "h-2 w-2 rounded-full transition-colors duration-300",
                              index < loadingPhase ? "bg-primary" : "bg-muted-foreground/30"
                            )}
                            animate={index === loadingPhase - 1 ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Success state with generated image */}
              {generatedUrl && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex flex-col items-center gap-6 py-4"
                >
                  {/* Success header */}
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                      className="relative"
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
                        <Icons.check className="h-10 w-10 text-white" />
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -right-2 -top-2"
                      >
                        <Icons.sparkles className="h-6 w-6 text-yellow-500" />
                      </motion.div>
                    </motion.div>

                    <div className="space-y-1 text-center">
                      <motion.h4
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold"
                      >
                        {isRTL ? "ההזמנה נוצרה בהצלחה!" : "Invitation Created!"}
                      </motion.h4>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-muted-foreground"
                      >
                        {isRTL
                          ? "ההזמנה שלכם מוכנה ונשמרה בגלריה"
                          : "Your invitation is ready and saved to the gallery"}
                      </motion.p>
                    </div>
                  </div>

                  {/* Image preview with fancy border */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative"
                  >
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/50 via-primary/20 to-transparent blur-sm" />
                    <div className="relative h-[320px] w-[240px] overflow-hidden rounded-xl border-4 border-background bg-background shadow-2xl">
                      <Image
                        src={generatedUrl}
                        alt="Generated invitation"
                        fill
                        className="object-contain"
                        sizes="240px"
                      />
                    </div>
                  </motion.div>

                  {/* Template info */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Icons.fileText className="h-4 w-4" />
                    <span>
                      {isRTL ? "תבנית:" : "Template:"}{" "}
                      <span className="font-medium text-foreground">
                        {isRTL ? selectedTemplate.nameHe : selectedTemplate.name}
                      </span>
                    </span>
                  </motion.div>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center gap-3 sm:flex-row"
                  >
                    <Button
                      onClick={handleSetAsActive}
                      disabled={isSettingActive}
                      className="gap-2 bg-gradient-to-r from-green-500 to-green-600 shadow-lg hover:from-green-600 hover:to-green-700"
                    >
                      {isSettingActive ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.check className="h-4 w-4" />
                      )}
                      {isRTL ? "הגדר כהזמנה הפעילה" : "Set as Active Invitation"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowZoomDialog(true)}
                      className="gap-2"
                    >
                      <Icons.zoomIn className="h-4 w-4" />
                      {isRTL ? "צפייה מוגדלת" : "View Full Size"}
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-wrap justify-center gap-2 pt-2"
                  >
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={generatedUrl} download="invitation.png" target="_blank" rel="noopener noreferrer">
                        <Icons.download className="h-4 w-4" />
                        {isRTL ? "הורדה" : "Download"}
                      </a>
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-2">
                      <Icons.refresh className="h-4 w-4" />
                      {isRTL ? "יצירה מחדש" : "Regenerate"}
                    </Button>

                    <Button variant="ghost" size="sm" onClick={handleStartOver} className="gap-2 text-muted-foreground">
                      <Icons.add className="h-4 w-4" />
                      {isRTL ? "צור הזמנה נוספת" : "Create Another"}
                    </Button>

                    <Button variant="ghost" size="sm" onClick={handleDone} className="gap-2 text-muted-foreground">
                      {isRTL ? "לגלריה" : "Go to Gallery"}
                      <Icons.arrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Zoom Dialog */}
      <Dialog open={showZoomDialog} onOpenChange={setShowZoomDialog}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle>
              {selectedTemplate && (isRTL ? selectedTemplate.nameHe : selectedTemplate.name)}
            </DialogTitle>
          </DialogHeader>

          {generatedUrl && (
            <>
              {/* Large Image */}
              <div className="flex-1 relative min-h-0 mx-4">
                <Image
                  src={generatedUrl}
                  alt="Invitation preview"
                  fill
                  className="object-contain"
                  quality={100}
                  priority
                  sizes="90vw"
                />
              </div>

              {/* Footer with actions */}
              <div className="shrink-0 flex justify-center gap-3 border-t bg-muted/30 p-4">
                <Button variant="outline" asChild>
                  <a href={generatedUrl} download="invitation.png" target="_blank" rel="noopener noreferrer">
                    <Icons.download className={cn("h-4 w-4", isRTL ? "ml-2" : "me-2")} />
                    {isRTL ? "הורדה" : "Download"}
                  </a>
                </Button>

                <Button
                  onClick={() => {
                    handleSetAsActive();
                    setShowZoomDialog(false);
                  }}
                  disabled={isSettingActive}
                >
                  {isSettingActive ? (
                    <Icons.spinner className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "me-2")} />
                  ) : (
                    <Icons.check className={cn("h-4 w-4", isRTL ? "ml-2" : "me-2")} />
                  )}
                  {isRTL ? "הגדר כהזמנה הפעילה" : "Set as Active Invitation"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
