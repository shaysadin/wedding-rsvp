"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { InvitationFieldType, EventType } from "@prisma/client";
import { ArrowLeft } from "lucide-react";

import { getInvitationTemplate, addTemplateField, updateTemplateField, deleteTemplateField, updateInvitationTemplate } from "@/actions/invitation-templates";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface TemplateField {
  id: string;
  fieldType: InvitationFieldType;
  label: string;
  labelHe: string | null;
  placeholder: string | null;
  isRequired: boolean;
  originalValue: string;
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  eventType: EventType;
  isActive: boolean;
  pdfUrl: string;
  thumbnailUrl: string | null;
  fields: TemplateField[];
}

interface TemplateEditorPageProps {
  params: Promise<{ templateId: string; locale: string }>;
}

const FIELD_TYPES: { value: InvitationFieldType; labelEn: string; labelHe: string }[] = [
  { value: "GUEST_NAME", labelEn: "Guest Name", labelHe: "שם האורח" },
  { value: "COUPLE_NAMES", labelEn: "Couple Names", labelHe: "שמות בני הזוג" },
  { value: "COUPLE_NAMES_ENGLISH", labelEn: "Couple Names (English)", labelHe: "שמות בני הזוג (אנגלית)" },
  { value: "COUPLE_NAMES_HEBREW", labelEn: "Couple Names (Hebrew)", labelHe: "שמות בני הזוג (עברית)" },
  { value: "EVENT_DATE", labelEn: "Event Date", labelHe: "תאריך האירוע" },
  { value: "EVENT_DATE_HEBREW", labelEn: "Hebrew Date", labelHe: "תאריך עברי" },
  { value: "DAY_OF_WEEK", labelEn: "Day of Week", labelHe: "יום בשבוע" },
  { value: "EVENT_TIME", labelEn: "Event Time", labelHe: "שעת האירוע" },
  { value: "RECEPTION_TIME", labelEn: "Reception Time", labelHe: "שעת קבלת פנים" },
  { value: "CEREMONY_TIME", labelEn: "Ceremony Time", labelHe: "שעת הטקס" },
  { value: "VENUE_NAME", labelEn: "Venue Name", labelHe: "שם האולם" },
  { value: "VENUE_ADDRESS", labelEn: "Venue Address", labelHe: "כתובת האולם" },
  { value: "STREET_ADDRESS", labelEn: "Street Address", labelHe: "רחוב" },
  { value: "CITY", labelEn: "City", labelHe: "עיר" },
  { value: "BRIDE_PARENTS", labelEn: "Bride's Parents", labelHe: "הורי הכלה" },
  { value: "GROOM_PARENTS", labelEn: "Groom's Parents", labelHe: "הורי החתן" },
  { value: "BRIDE_FAMILY", labelEn: "Bride's Family", labelHe: "משפחת הכלה" },
  { value: "GROOM_FAMILY", labelEn: "Groom's Family", labelHe: "משפחת החתן" },
  { value: "EVENT_TYPE", labelEn: "Event Type", labelHe: "סוג האירוע" },
  { value: "INVITATION_TEXT", labelEn: "Invitation Text", labelHe: "טקסט ההזמנה" },
  { value: "BLESSING_QUOTE", labelEn: "Blessing/Quote", labelHe: "ברכה/ציטוט" },
  { value: "CUSTOM", labelEn: "Custom Field", labelHe: "שדה מותאם" },
];

const FONT_FAMILIES = ["Heebo", "Assistant", "Arial", "Times New Roman"];
const TEXT_ALIGNS = ["left", "center", "right"];

const EVENT_TYPES: { value: EventType; labelEn: string; labelHe: string }[] = [
  { value: "WEDDING", labelEn: "Wedding", labelHe: "חתונה" },
  { value: "HENNA", labelEn: "Henna", labelHe: "חינה" },
  { value: "ENGAGEMENT", labelEn: "Engagement", labelHe: "אירוסין" },
  { value: "OTHER", labelEn: "Other", labelHe: "אחר" },
];

export default function TemplateEditorPage({ params }: TemplateEditorPageProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [resolvedLocale, setResolvedLocale] = useState<string>("en");
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Template details editing
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [editDetails, setEditDetails] = useState({
    name: "",
    nameHe: "",
    description: "",
    descriptionHe: "",
    eventType: "WEDDING" as EventType,
    isActive: true,
  });

  // New field form
  const [newField, setNewField] = useState({
    fieldType: "GUEST_NAME" as InvitationFieldType,
    label: "",
    labelHe: "",
    isRequired: true,
    originalValue: "",
  });

  // Resolve params
  useEffect(() => {
    params.then((p) => {
      setTemplateId(p.templateId);
      setResolvedLocale(p.locale);
    });
  }, [params]);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;

    setIsLoading(true);
    try {
      const result = await getInvitationTemplate(templateId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.template) {
        setTemplate(result.template as unknown as Template);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת התבנית" : "Failed to load template");
    } finally {
      setIsLoading(false);
    }
  }, [templateId, isRTL]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId, loadTemplate]);

  const handleAddField = async () => {
    if (!templateId || !newField.label) {
      toast.error(isRTL ? "נא למלא את שם השדה" : "Please fill field label");
      return;
    }

    setIsAdding(true);
    try {
      const result = await addTemplateField(templateId, {
        fieldType: newField.fieldType,
        label: newField.label,
        labelHe: newField.labelHe || undefined,
        isRequired: newField.isRequired,
        originalValue: newField.originalValue || "",
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "השדה נוסף בהצלחה" : "Field added successfully");
        setIsAddOpen(false);
        setNewField({
          fieldType: "GUEST_NAME",
          label: "",
          labelHe: "",
          isRequired: true,
          originalValue: "",
        });
        loadTemplate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהוספת שדה" : "Failed to add field");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateField = async () => {
    if (!editingField) return;

    try {
      const result = await updateTemplateField(editingField.id, {
        fieldType: editingField.fieldType,
        label: editingField.label,
        labelHe: editingField.labelHe || undefined,
        isRequired: editingField.isRequired,
        originalValue: editingField.originalValue || "",
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "השדה עודכן בהצלחה" : "Field updated successfully");
        setEditingField(null);
        loadTemplate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון שדה" : "Failed to update field");
    }
  };

  const handleDeleteField = async () => {
    if (!deleteFieldId) return;

    setIsDeleting(true);
    try {
      const result = await deleteTemplateField(deleteFieldId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "השדה נמחק בהצלחה" : "Field deleted successfully");
        loadTemplate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה במחיקת שדה" : "Failed to delete field");
    } finally {
      setIsDeleting(false);
      setDeleteFieldId(null);
    }
  };

  const handleOpenEditDetails = () => {
    if (template) {
      setEditDetails({
        name: template.name,
        nameHe: template.nameHe,
        description: template.description || "",
        descriptionHe: template.descriptionHe || "",
        eventType: template.eventType,
        isActive: template.isActive,
      });
      setIsEditDetailsOpen(true);
    }
  };

  const handleSaveDetails = async () => {
    if (!templateId) return;

    setIsSavingDetails(true);
    try {
      const result = await updateInvitationTemplate(templateId, {
        name: editDetails.name,
        nameHe: editDetails.nameHe,
        description: editDetails.description || undefined,
        descriptionHe: editDetails.descriptionHe || undefined,
        eventType: editDetails.eventType,
        isActive: editDetails.isActive,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "פרטי התבנית עודכנו בהצלחה" : "Template details updated successfully");
        setIsEditDetailsOpen(false);
        loadTemplate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון פרטי התבנית" : "Failed to update template details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  if (isLoading || !template) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? template.nameHe : template.name}
        text={isRTL ? "ניהול שדות התבנית" : "Manage template fields"}
      >
        <div className={cn("flex flex-row flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          <Button variant="outline" asChild>
            <Link href={`/${resolvedLocale}/admin/invitation-templates`}>
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              {isRTL ? "חזרה" : "Back"}
            </Link>
          </Button>
          <Button variant="outline" onClick={handleOpenEditDetails}>
            <Icons.settings className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? "עריכת פרטי תבנית" : "Edit Details"}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Icons.add className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {isRTL ? "הוסף שדה" : "Add Field"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isRTL ? "הוספת שדה חדש" : "Add New Field"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "הגדירו שדה חדש להזמנה" : "Define a new field for the invitation"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "סוג שדה" : "Field Type"}</Label>
                  <Select
                    value={newField.fieldType}
                    onValueChange={(value) => setNewField({ ...newField, fieldType: value as InvitationFieldType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>
                          {isRTL ? ft.labelHe : ft.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "תווית (אנגלית)" : "Label (English)"}</Label>
                    <Input
                      value={newField.label}
                      onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                      placeholder="Guest Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "תווית (עברית)" : "Label (Hebrew)"}</Label>
                    <Input
                      value={newField.labelHe}
                      onChange={(e) => setNewField({ ...newField, labelHe: e.target.value })}
                      placeholder="שם האורח"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "טקסט מקורי בתבנית" : "Original Text in Template"}</Label>
                  <Input
                    value={newField.originalValue}
                    onChange={(e) => setNewField({ ...newField, originalValue: e.target.value })}
                    placeholder={isRTL ? "הטקסט שיוחלף בתמונה" : "Text to be replaced in image"}
                    dir="rtl"
                  />
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "הזינו את הטקסט המקורי שמופיע בתמונת התבנית ויוחלף בעת יצירת ההזמנה"
                      : "Enter the original text from the template image that will be replaced when generating invitations"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newField.isRequired}
                    onCheckedChange={(checked) => setNewField({ ...newField, isRequired: checked })}
                  />
                  <Label>{isRTL ? "שדה חובה" : "Required Field"}</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  {isRTL ? "ביטול" : "Cancel"}
                </Button>
                <Button onClick={handleAddField} disabled={isAdding}>
                  {isAdding && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {isRTL ? "הוסף שדה" : "Add Field"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardHeader>

      {/* Template Info Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{isRTL ? "קטגוריה:" : "Category:"}</span>
          <span className="font-medium">
            {EVENT_TYPES.find((et) => et.value === template.eventType)?.[isRTL ? "labelHe" : "labelEn"]}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{isRTL ? "סטטוס:" : "Status:"}</span>
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            template.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
          )}>
            {template.isActive ? (isRTL ? "פעיל" : "Active") : (isRTL ? "לא פעיל" : "Inactive")}
          </span>
        </div>
        {(template.description || template.descriptionHe) && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{isRTL ? "תיאור:" : "Description:"}</span>
              <span className="text-sm">
                {isRTL ? template.descriptionHe || template.description : template.description || template.descriptionHe}
              </span>
            </div>
          </>
        )}
        <Button variant="ghost" size="sm" className="ms-auto" onClick={handleOpenEditDetails}>
          <Icons.edit className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {isRTL ? "ערוך" : "Edit"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "תצוגה מקדימה" : "Preview"}</CardTitle>
            <CardDescription>
              {isRTL ? "לחצו על שדה לעריכה" : "Click on a field to edit"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden border">
              {template.thumbnailUrl ? (
                <Image
                  src={template.thumbnailUrl}
                  alt={isRTL ? template.nameHe : template.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <Icons.fileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              {/* Field count badge */}
              {template.fields.length > 0 && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                  {template.fields.length} {isRTL ? "שדות" : "fields"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fields List */}
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "שדות" : "Fields"}</CardTitle>
            <CardDescription>
              {template.fields.length} {isRTL ? "שדות מוגדרים" : "fields defined"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {template.fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icons.fileText className="h-12 w-12 mx-auto mb-4" />
                <p>{isRTL ? "אין שדות עדיין" : "No fields yet"}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsAddOpen(true)}
                >
                  <Icons.add className="mr-2 h-4 w-4" />
                  {isRTL ? "הוסף שדה ראשון" : "Add First Field"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {template.fields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors cursor-pointer",
                      selectedFieldId === field.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          {isRTL && field.labelHe ? field.labelHe : field.label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {FIELD_TYPES.find((ft) => ft.value === field.fieldType)?.[isRTL ? "labelHe" : "labelEn"]}
                        </div>
                        {field.originalValue && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {isRTL ? "טקסט מקורי:" : "Original text:"} &quot;{field.originalValue}&quot;
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingField(field);
                          }}
                        >
                          <Icons.edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteFieldId(field.id);
                          }}
                        >
                          <Icons.trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Field Dialog */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? "עריכת שדה" : "Edit Field"}</DialogTitle>
          </DialogHeader>

          {editingField && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? "סוג שדה" : "Field Type"}</Label>
                <Select
                  value={editingField.fieldType}
                  onValueChange={(value) =>
                    setEditingField({ ...editingField, fieldType: value as InvitationFieldType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {isRTL ? ft.labelHe : ft.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "תווית (אנגלית)" : "Label (English)"}</Label>
                  <Input
                    value={editingField.label}
                    onChange={(e) =>
                      setEditingField({ ...editingField, label: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "תווית (עברית)" : "Label (Hebrew)"}</Label>
                  <Input
                    value={editingField.labelHe || ""}
                    onChange={(e) =>
                      setEditingField({ ...editingField, labelHe: e.target.value || null })
                    }
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "טקסט מקורי בתבנית" : "Original Text in Template"}</Label>
                <Input
                  value={editingField.originalValue}
                  onChange={(e) =>
                    setEditingField({ ...editingField, originalValue: e.target.value })
                  }
                  dir="rtl"
                />
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? "הטקסט שמופיע בתמונת התבנית ויוחלף בעת יצירת ההזמנה"
                    : "The text in the template image that will be replaced when generating invitations"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingField.isRequired}
                  onCheckedChange={(checked) =>
                    setEditingField({ ...editingField, isRequired: checked })
                  }
                />
                <Label>{isRTL ? "שדה חובה" : "Required Field"}</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingField(null)}>
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleUpdateField}>
              {isRTL ? "שמור שינויים" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "מחיקת שדה" : "Delete Field"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "האם אתם בטוחים שברצונכם למחוק שדה זה?"
                : "Are you sure you want to delete this field?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {isRTL ? "מחק" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Template Details Dialog */}
      <Dialog open={isEditDetailsOpen} onOpenChange={setIsEditDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? "עריכת פרטי תבנית" : "Edit Template Details"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "עדכנו את שם התבנית, קטגוריה ותיאור" : "Update template name, category and description"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "שם (אנגלית)" : "Name (English)"}</Label>
                <Input
                  value={editDetails.name}
                  onChange={(e) => setEditDetails({ ...editDetails, name: e.target.value })}
                  placeholder="Template Name"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "שם (עברית)" : "Name (Hebrew)"}</Label>
                <Input
                  value={editDetails.nameHe}
                  onChange={(e) => setEditDetails({ ...editDetails, nameHe: e.target.value })}
                  placeholder="שם התבנית"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "קטגוריה" : "Category"}</Label>
              <Select
                value={editDetails.eventType}
                onValueChange={(value) => setEditDetails({ ...editDetails, eventType: value as EventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {isRTL ? et.labelHe : et.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "תיאור (אנגלית)" : "Description (English)"}</Label>
                <Input
                  value={editDetails.description}
                  onChange={(e) => setEditDetails({ ...editDetails, description: e.target.value })}
                  placeholder="Short description"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "תיאור (עברית)" : "Description (Hebrew)"}</Label>
                <Input
                  value={editDetails.descriptionHe}
                  onChange={(e) => setEditDetails({ ...editDetails, descriptionHe: e.target.value })}
                  placeholder="תיאור קצר"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editDetails.isActive}
                onCheckedChange={(checked) => setEditDetails({ ...editDetails, isActive: checked })}
              />
              <Label>{isRTL ? "תבנית פעילה" : "Active Template"}</Label>
              <span className="text-sm text-muted-foreground">
                {isRTL
                  ? "(תבניות לא פעילות לא יוצגו למשתמשים)"
                  : "(Inactive templates won't be shown to users)"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDetailsOpen(false)}>
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleSaveDetails} disabled={isSavingDetails || !editDetails.name || !editDetails.nameHe}>
              {isSavingDetails && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {isRTL ? "שמור שינויים" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFadeIn>
  );
}
