"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { InvitationFieldType } from "@prisma/client";
import { ArrowLeft } from "lucide-react";

import { getInvitationTemplate, addTemplateField, updateTemplateField, deleteTemplateField } from "@/actions/invitation-templates";
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
    </PageFadeIn>
  );
}
