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
  positionX: number;
  positionY: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textColor: string;
  textAlign: string;
  maxWidth: number | null;
  isRequired: boolean;
  defaultValue: string | null;
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
  { value: "COUPLE_NAMES", labelEn: "Couple Names", labelHe: "שמות הזוג" },
  { value: "EVENT_DATE", labelEn: "Event Date", labelHe: "תאריך האירוע" },
  { value: "EVENT_TIME", labelEn: "Event Time", labelHe: "שעת האירוע" },
  { value: "VENUE_NAME", labelEn: "Venue", labelHe: "מקום האירוע" },
  { value: "CUSTOM", labelEn: "Custom", labelHe: "מותאם" },
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
    positionX: 50,
    positionY: 50,
    fontSize: 24,
    fontFamily: "Heebo",
    fontWeight: "normal",
    textColor: "#000000",
    textAlign: "center",
    maxWidth: 400,
    isRequired: true,
    defaultValue: "",
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
        positionX: newField.positionX,
        positionY: newField.positionY,
        fontSize: newField.fontSize,
        fontFamily: newField.fontFamily,
        fontWeight: newField.fontWeight,
        textColor: newField.textColor,
        textAlign: newField.textAlign,
        maxWidth: newField.maxWidth || undefined,
        isRequired: newField.isRequired,
        defaultValue: newField.defaultValue || undefined,
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
          positionX: 50,
          positionY: 50,
          fontSize: 24,
          fontFamily: "Heebo",
          fontWeight: "normal",
          textColor: "#000000",
          textAlign: "center",
          maxWidth: 400,
          isRequired: true,
          defaultValue: "",
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
        positionX: editingField.positionX,
        positionY: editingField.positionY,
        fontSize: editingField.fontSize,
        fontFamily: editingField.fontFamily,
        fontWeight: editingField.fontWeight,
        textColor: editingField.textColor,
        textAlign: editingField.textAlign,
        maxWidth: editingField.maxWidth || undefined,
        isRequired: editingField.isRequired,
        defaultValue: editingField.defaultValue || undefined,
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "מיקום X (%)" : "Position X (%)"}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newField.positionX}
                      onChange={(e) => setNewField({ ...newField, positionX: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "מיקום Y (%)" : "Position Y (%)"}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newField.positionY}
                      onChange={(e) => setNewField({ ...newField, positionY: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "גודל גופן" : "Font Size"}</Label>
                    <Input
                      type="number"
                      min="8"
                      max="72"
                      value={newField.fontSize}
                      onChange={(e) => setNewField({ ...newField, fontSize: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "גופן" : "Font Family"}</Label>
                    <Select
                      value={newField.fontFamily}
                      onValueChange={(value) => setNewField({ ...newField, fontFamily: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font} value={font}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "יישור" : "Alignment"}</Label>
                    <Select
                      value={newField.textAlign}
                      onValueChange={(value) => setNewField({ ...newField, textAlign: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEXT_ALIGNS.map((align) => (
                          <SelectItem key={align} value={align}>
                            {align}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "צבע טקסט" : "Text Color"}</Label>
                    <Input
                      type="color"
                      value={newField.textColor}
                      onChange={(e) => setNewField({ ...newField, textColor: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "רוחב מקסימלי" : "Max Width"}</Label>
                    <Input
                      type="number"
                      min="50"
                      max="1000"
                      value={newField.maxWidth}
                      onChange={(e) => setNewField({ ...newField, maxWidth: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newField.isRequired}
                    onCheckedChange={(checked) => setNewField({ ...newField, isRequired: checked })}
                  />
                  <Label>{isRTL ? "שדה חובה" : "Required Field"}</Label>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "ערך ברירת מחדל" : "Default Value"}</Label>
                  <Input
                    value={newField.defaultValue}
                    onChange={(e) => setNewField({ ...newField, defaultValue: e.target.value })}
                    placeholder={isRTL ? "אופציונלי" : "Optional"}
                  />
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

              {/* Field markers */}
              {template.fields.map((field) => (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={cn(
                    "absolute cursor-pointer transition-all",
                    "border-2 border-dashed rounded px-2 py-1",
                    selectedFieldId === field.id
                      ? "border-primary bg-primary/20"
                      : "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                  )}
                  style={{
                    left: `${field.positionX}%`,
                    top: `${field.positionY}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${Math.max(8, field.fontSize / 3)}px`,
                    color: field.textColor,
                  }}
                >
                  {isRTL && field.labelHe ? field.labelHe : field.label}
                </div>
              ))}
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
                        <div className="text-xs text-muted-foreground mt-1">
                          X: {field.positionX}% | Y: {field.positionY}% | {field.fontSize}px
                        </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "מיקום X (%)" : "Position X (%)"}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingField.positionX}
                    onChange={(e) =>
                      setEditingField({ ...editingField, positionX: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "מיקום Y (%)" : "Position Y (%)"}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingField.positionY}
                    onChange={(e) =>
                      setEditingField({ ...editingField, positionY: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "גודל גופן" : "Font Size"}</Label>
                  <Input
                    type="number"
                    min="8"
                    max="72"
                    value={editingField.fontSize}
                    onChange={(e) =>
                      setEditingField({ ...editingField, fontSize: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "גופן" : "Font Family"}</Label>
                  <Select
                    value={editingField.fontFamily}
                    onValueChange={(value) =>
                      setEditingField({ ...editingField, fontFamily: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "יישור" : "Alignment"}</Label>
                  <Select
                    value={editingField.textAlign}
                    onValueChange={(value) =>
                      setEditingField({ ...editingField, textAlign: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_ALIGNS.map((align) => (
                        <SelectItem key={align} value={align}>
                          {align}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "צבע טקסט" : "Text Color"}</Label>
                  <Input
                    type="color"
                    value={editingField.textColor}
                    onChange={(e) =>
                      setEditingField({ ...editingField, textColor: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "רוחב מקסימלי" : "Max Width"}</Label>
                  <Input
                    type="number"
                    min="50"
                    max="1000"
                    value={editingField.maxWidth || 0}
                    onChange={(e) =>
                      setEditingField({ ...editingField, maxWidth: Number(e.target.value) || null })
                    }
                  />
                </div>
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
