"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { EventType, InvitationFieldType } from "@prisma/client";

import { getActiveTemplates } from "@/actions/invitation-templates";
import { generateInvitation, previewInvitation } from "@/actions/generate-invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

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

interface AIInvitationGeneratorProps {
  eventId: string;
  eventType?: EventType;
  onGenerated?: (imageUrl: string) => void;
}

export function AIInvitationGenerator({
  eventId,
  eventType,
  onGenerated,
}: AIInvitationGeneratorProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [eventType]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const result = await getActiveTemplates(eventType);
      if (result.error) {
        toast.error(result.error);
      } else if (result.templates) {
        setTemplates(result.templates as unknown as Template[]);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת התבניות" : "Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setFieldValues({});
    setPreviewUrl(null);
    setGeneratedUrl(null);
    setIsDialogOpen(true);
  };

  const handleFieldChange = (fieldType: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldType]: value }));
    setPreviewUrl(null); // Clear preview when values change
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    setIsPreviewing(true);
    try {
      const result = await previewInvitation({
        templateId: selectedTemplate.id,
        fieldValues: Object.entries(fieldValues).map(([fieldType, value]) => ({
          fieldType: fieldType as InvitationFieldType,
          value,
        })),
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.previewUrl) {
        setPreviewUrl(result.previewUrl);
      }
    } catch {
      toast.error(isRTL ? "שגיאה ביצירת תצוגה מקדימה" : "Failed to generate preview");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    // Validate required fields
    for (const field of selectedTemplate.fields) {
      if (field.isRequired && !fieldValues[field.fieldType]) {
        toast.error(
          isRTL
            ? `אנא מלאו את השדה "${field.labelHe || field.label}"`
            : `Please fill in the field "${field.label}"`
        );
        return;
      }
    }

    setIsGenerating(true);
    try {
      const result = await generateInvitation({
        eventId,
        templateId: selectedTemplate.id,
        fieldValues: Object.entries(fieldValues).map(([fieldType, value]) => ({
          fieldType: fieldType as InvitationFieldType,
          value,
        })),
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.pngUrl) {
        setGeneratedUrl(result.pngUrl);
        toast.success(isRTL ? "ההזמנה נוצרה בהצלחה!" : "Invitation generated successfully!");
        onGenerated?.(result.pngUrl);

        // Dispatch event to refresh parent components
        window.dispatchEvent(new CustomEvent("invitation-data-changed"));
      }
    } catch {
      toast.error(isRTL ? "שגיאה ביצירת ההזמנה" : "Failed to generate invitation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
    setFieldValues({});
    setPreviewUrl(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2")}>
          <Icons.sparkles className="h-5 w-5" />
          {isRTL ? "יצירת הזמנה עם AI" : "Create Invitation with AI"}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? "בחרו תבנית והזינו את הפרטים שלכם. הבינה המלאכותית תיצור הזמנה מותאמת אישית."
            : "Select a template and enter your details. AI will create a personalized invitation."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icons.fileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isRTL ? "אין תבניות זמינות כרגע" : "No templates available yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary hover:shadow-md"
              >
                {template.thumbnailUrl || template.imageUrl ? (
                  <Image
                    src={template.thumbnailUrl || template.imageUrl}
                    alt={isRTL ? template.nameHe : template.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.fileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs font-medium text-white">
                    {isRTL ? template.nameHe : template.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Generated Invitation Preview */}
        {generatedUrl && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium">{isRTL ? "ההזמנה שנוצרה" : "Generated Invitation"}</h4>
            <div className="relative aspect-[3/4] max-w-sm overflow-hidden rounded-lg border">
              <Image src={generatedUrl} alt="Generated invitation" fill className="object-contain" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href={generatedUrl} download="invitation.png" target="_blank" rel="noopener noreferrer">
                  <Icons.download className="me-2 h-4 w-4" />
                  {isRTL ? "הורדה" : "Download"}
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {selectedTemplate && (isRTL ? selectedTemplate.nameHe : selectedTemplate.name)}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? "מלאו את הפרטים שלכם ליצירת הזמנה מותאמת אישית"
                : "Fill in your details to create a personalized invitation"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
            {/* Preview */}
            <div className="space-y-4 flex flex-col">
              <h4 className="font-medium flex-shrink-0">{isRTL ? "תצוגה מקדימה" : "Preview"}</h4>
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted flex-shrink-0">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                ) : selectedTemplate?.imageUrl ? (
                  <>
                    <Image
                      src={selectedTemplate.thumbnailUrl || selectedTemplate.imageUrl}
                      alt="Template"
                      fill
                      className="object-contain opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="rounded bg-background/80 px-3 py-1 text-sm">
                        {isRTL ? "מלאו פרטים לתצוגה מקדימה" : "Fill details for preview"}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isPreviewing || Object.keys(fieldValues).length === 0}
                className="w-full flex-shrink-0"
              >
                {isPreviewing && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {isRTL ? "תצוגה מקדימה" : "Preview"}
              </Button>
            </div>

            {/* Form */}
            <div className="flex flex-col min-h-0">
              <h4 className="font-medium mb-4 flex-shrink-0">{isRTL ? "פרטי ההזמנה" : "Invitation Details"}</h4>
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pe-4">
                  {selectedTemplate?.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className={cn(field.isRequired && "after:content-['*'] after:ms-1 after:text-destructive")}>
                        {isRTL ? field.labelHe || field.label : field.label}
                      </Label>
                      <Input
                        value={fieldValues[field.fieldType] || ""}
                        onChange={(e) => handleFieldChange(field.fieldType, e.target.value)}
                        placeholder={field.placeholder || field.originalValue}
                        dir="auto"
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "טקסט מקורי: " : "Original: "}{field.originalValue}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full mt-4 flex-shrink-0"
                size="lg"
              >
                {isGenerating && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                <Icons.sparkles className="me-2 h-4 w-4" />
                {isRTL ? "צור הזמנה" : "Generate Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
