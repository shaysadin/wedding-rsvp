"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { EventType, InvitationFieldType } from "@prisma/client";

import { createInvitationTemplate } from "@/actions/invitation-templates";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface TemplateField {
  id: string;
  fieldType: InvitationFieldType;
  label: string;
  labelHe: string;
  originalValue: string;
  isRequired: boolean;
}

const eventTypeLabels: Record<EventType, { en: string; he: string }> = {
  WEDDING: { en: "Wedding", he: "חתונה" },
  HENNA: { en: "Henna", he: "חינה" },
  ENGAGEMENT: { en: "Engagement", he: "אירוסין" },
  OTHER: { en: "Other", he: "אחר" },
};

const fieldTypeLabels: Record<InvitationFieldType, { en: string; he: string }> = {
  GUEST_NAME: { en: "Guest Name", he: "שם האורח" },
  COUPLE_NAMES: { en: "Couple Names", he: "שמות בני הזוג" },
  COUPLE_NAMES_ENGLISH: { en: "Couple Names (English)", he: "שמות בני הזוג (אנגלית)" },
  COUPLE_NAMES_HEBREW: { en: "Couple Names (Hebrew)", he: "שמות בני הזוג (עברית)" },
  EVENT_DATE: { en: "Event Date", he: "תאריך האירוע" },
  EVENT_DATE_HEBREW: { en: "Hebrew Date", he: "תאריך עברי" },
  DAY_OF_WEEK: { en: "Day of Week", he: "יום בשבוע" },
  EVENT_TIME: { en: "Event Time", he: "שעת האירוע" },
  RECEPTION_TIME: { en: "Reception Time", he: "שעת קבלת פנים" },
  CEREMONY_TIME: { en: "Ceremony Time", he: "שעת הטקס" },
  VENUE_NAME: { en: "Venue Name", he: "שם האולם" },
  VENUE_ADDRESS: { en: "Venue Address", he: "כתובת האולם" },
  STREET_ADDRESS: { en: "Street Address", he: "רחוב" },
  CITY: { en: "City", he: "עיר" },
  BRIDE_PARENTS: { en: "Bride's Parents", he: "הורי הכלה" },
  GROOM_PARENTS: { en: "Groom's Parents", he: "הורי החתן" },
  BRIDE_FAMILY: { en: "Bride's Family", he: "משפחת הכלה" },
  GROOM_FAMILY: { en: "Groom's Family", he: "משפחת החתן" },
  EVENT_TYPE: { en: "Event Type", he: "סוג האירוע" },
  INVITATION_TEXT: { en: "Invitation Text", he: "טקסט ההזמנה" },
  BLESSING_QUOTE: { en: "Blessing/Quote", he: "ברכה/ציטוט" },
  CUSTOM: { en: "Custom Field", he: "שדה מותאם" },
};

export default function NewInvitationTemplatePage() {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === "he";

  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedData, setUploadedData] = useState<{
    imageUrl: string;
    thumbnailUrl: string;
    pdfUrl?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    nameHe: "",
    description: "",
    descriptionHe: "",
    eventType: "WEDDING" as EventType,
  });

  const [fields, setFields] = useState<TemplateField[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error(isRTL ? "אנא בחרו קובץ תמונה או PDF" : "Please select an image or PDF file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error(isRTL ? "הקובץ גדול מדי. גודל מקסימלי: 20MB" : "File too large. Max size: 20MB");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-template", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "Failed to upload file");
      } else {
        setUploadedData({
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl,
          pdfUrl: result.pdfUrl,
        });
        toast.success(isRTL ? "הקובץ הועלה בהצלחה" : "File uploaded successfully");
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהעלאת הקובץ" : "Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const addField = () => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      fieldType: "COUPLE_NAMES",
      label: "",
      labelHe: "",
      originalValue: "",
      isRequired: true,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleCreate = async () => {
    if (!uploadedData) {
      toast.error(isRTL ? "אנא העלו תמונה או PDF" : "Please upload an image or PDF");
      return;
    }

    if (!formData.name || !formData.nameHe) {
      toast.error(isRTL ? "אנא מלאו שם בשתי השפות" : "Please fill in name in both languages");
      return;
    }

    if (fields.length === 0) {
      toast.error(isRTL ? "אנא הוסיפו לפחות שדה אחד" : "Please add at least one field");
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.originalValue) {
        toast.error(
          isRTL
            ? `אנא מלאו את הטקסט המקורי עבור השדה "${field.labelHe || field.label}"`
            : `Please fill in the original text for field "${field.label}"`
        );
        return;
      }
    }

    setIsCreating(true);

    try {
      const result = await createInvitationTemplate({
        name: formData.name,
        nameHe: formData.nameHe,
        description: formData.description || undefined,
        descriptionHe: formData.descriptionHe || undefined,
        eventType: formData.eventType,
        imageUrl: uploadedData.imageUrl,
        thumbnailUrl: uploadedData.thumbnailUrl,
        pdfUrl: uploadedData.pdfUrl,
        fields: fields.map((f, index) => ({
          fieldType: f.fieldType,
          label: f.label || fieldTypeLabels[f.fieldType].en,
          labelHe: f.labelHe || fieldTypeLabels[f.fieldType].he,
          originalValue: f.originalValue,
          isRequired: f.isRequired,
          sortOrder: index,
        })),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "התבנית נוצרה בהצלחה" : "Template created successfully");
        router.push(`/${locale}/admin/invitation-templates`);
      }
    } catch {
      toast.error(isRTL ? "שגיאה ביצירת התבנית" : "Failed to create template");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "תבנית חדשה" : "New Template"}
        text={isRTL ? "צרו תבנית הזמנה חדשה עם עריכת טקסט AI" : "Create a new invitation template with AI text editing"}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Upload & Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "העלאת תמונה" : "Upload Image"}</CardTitle>
              <CardDescription>
                {isRTL
                  ? "העלו את תמונת ההזמנה המקורית (PDF או תמונה)"
                  : "Upload your original invitation image (PDF or image)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!uploadedData ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
                  <Icons.upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-sm text-muted-foreground">
                    {isRTL ? "גררו קובץ לכאן או לחצו לבחירה" : "Drag a file here or click to select"}
                  </p>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="max-w-xs cursor-pointer"
                  />
                  {isUploading && (
                    <div className="mt-4 flex items-center gap-2">
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{isRTL ? "מעלה..." : "Uploading..."}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={uploadedData.imageUrl}
                      alt="Template preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setUploadedData(null)}
                    className="w-full"
                  >
                    <Icons.trash className="me-2 h-4 w-4" />
                    {isRTL ? "הסר תמונה" : "Remove Image"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "פרטי התבנית" : "Template Details"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "שם (אנגלית)" : "Name (English)"} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Elegant Wedding"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "שם (עברית)" : "Name (Hebrew)"} *</Label>
                  <Input
                    value={formData.nameHe}
                    onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
                    placeholder="חתונה אלגנטית"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "סוג אירוע" : "Event Type"}</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => setFormData({ ...formData, eventType: value as EventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeLabels).map(([key, labels]) => (
                      <SelectItem key={key} value={key}>
                        {isRTL ? labels.he : labels.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "תיאור (אנגלית)" : "Description (English)"}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A beautiful design..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "תיאור (עברית)" : "Description (Hebrew)"}</Label>
                  <Textarea
                    value={formData.descriptionHe}
                    onChange={(e) => setFormData({ ...formData, descriptionHe: e.target.value })}
                    placeholder="עיצוב יפהפה..."
                    dir="rtl"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editable Fields */}
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "שדות לעריכה" : "Editable Fields"}</CardTitle>
              <CardDescription>
                {isRTL
                  ? "הגדירו אילו טקסטים ניתנים לעריכה בתבנית. ציינו את הטקסט המקורי שמופיע בתמונה."
                  : "Define which texts can be edited in the template. Specify the original text that appears in the image."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {isRTL ? `שדה ${index + 1}` : `Field ${index + 1}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(field.id)}
                    >
                      <Icons.trash className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{isRTL ? "סוג שדה" : "Field Type"}</Label>
                      <Select
                        value={field.fieldType}
                        onValueChange={(value) =>
                          updateField(field.id, {
                            fieldType: value as InvitationFieldType,
                            label: fieldTypeLabels[value as InvitationFieldType].en,
                            labelHe: fieldTypeLabels[value as InvitationFieldType].he,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(fieldTypeLabels).map(([key, labels]) => (
                            <SelectItem key={key} value={key}>
                              {isRTL ? labels.he : labels.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{isRTL ? "טקסט מקורי בתמונה" : "Original Text in Image"} *</Label>
                      <Input
                        value={field.originalValue}
                        onChange={(e) => updateField(field.id, { originalValue: e.target.value })}
                        placeholder={isRTL ? "הטקסט כפי שמופיע בתמונה" : "Text as it appears in image"}
                        dir="auto"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.isRequired}
                      onCheckedChange={(checked) => updateField(field.id, { isRequired: checked })}
                    />
                    <Label className="text-xs">{isRTL ? "שדה חובה" : "Required field"}</Label>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addField} className="w-full">
                <Icons.add className="me-2 h-4 w-4" />
                {isRTL ? "הוסף שדה" : "Add Field"}
              </Button>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !uploadedData || fields.length === 0}
            className="w-full"
            size="lg"
          >
            {isCreating && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
            {isRTL ? "צור תבנית" : "Create Template"}
          </Button>
        </div>
      </div>
    </PageFadeIn>
  );
}
