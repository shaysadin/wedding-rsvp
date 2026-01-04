"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { EventType } from "@prisma/client";

import { getAdminInvitationTemplates, createInvitationTemplate, deleteInvitationTemplate, updateInvitationTemplate } from "@/actions/invitation-templates";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  eventType: EventType;
  pdfUrl: string;
  thumbnailUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  fields: Array<{
    id: string;
    fieldType: string;
    label: string;
  }>;
  _count: {
    generations: number;
  };
}

export default function AdminInvitationTemplatesPage() {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedPdfData, setUploadedPdfData] = useState<{
    pdfUrl: string;
    previewUrl: string;
    dimensions: { width: number; height: number };
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    nameHe: "",
    description: "",
    descriptionHe: "",
    eventType: "WEDDING" as EventType,
    pdfUrl: "",
    thumbnailUrl: "",
  });

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAdminInvitationTemplates();
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
  }, [isRTL]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error(isRTL ? "אנא בחרו קובץ PDF" : "Please select a PDF file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error(isRTL ? "הקובץ גדול מדי. גודל מקסימלי: 20MB" : "File too large. Max size: 20MB");
      return;
    }

    setPdfFile(file);
    setIsUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append("pdf", file);

      // Upload PDF via API route
      const response = await fetch("/api/admin/upload-pdf-template", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "Failed to upload PDF");
        setPdfFile(null);
      } else if (result.success) {
        setUploadedPdfData({
          pdfUrl: result.pdfUrl,
          previewUrl: result.previewUrl,
          dimensions: result.dimensions,
        });
        // Auto-fill form data
        setFormData((prev) => ({
          ...prev,
          pdfUrl: result.pdfUrl,
          thumbnailUrl: result.previewUrl,
        }));
        toast.success(isRTL ? "הקובץ הועלה בהצלחה" : "File uploaded successfully");
      }

      setIsUploading(false);
    } catch (error) {
      toast.error(isRTL ? "שגיאה בהעלאת הקובץ" : "Error uploading file");
      setPdfFile(null);
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.nameHe || !formData.pdfUrl) {
      toast.error(isRTL ? "נא למלא את כל השדות הנדרשים" : "Please fill all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createInvitationTemplate({
        name: formData.name,
        nameHe: formData.nameHe,
        description: formData.description || undefined,
        descriptionHe: formData.descriptionHe || undefined,
        eventType: formData.eventType,
        pdfUrl: formData.pdfUrl,
        thumbnailUrl: formData.thumbnailUrl || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "התבנית נוצרה בהצלחה" : "Template created successfully");
        setIsCreateOpen(false);
        // Reset all state
        setFormData({
          name: "",
          nameHe: "",
          description: "",
          descriptionHe: "",
          eventType: "WEDDING",
          pdfUrl: "",
          thumbnailUrl: "",
        });
        setPdfFile(null);
        setUploadedPdfData(null);
        loadTemplates();
      }
    } catch {
      toast.error(isRTL ? "שגיאה ביצירת התבנית" : "Failed to create template");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const result = await deleteInvitationTemplate(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "התבנית נמחקה בהצלחה" : "Template deleted successfully");
        loadTemplates();
      }
    } catch {
      toast.error(isRTL ? "שגיאה במחיקת התבנית" : "Failed to delete template");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const result = await updateInvitationTemplate(template.id, {
        isActive: !template.isActive,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          template.isActive
            ? (isRTL ? "התבנית הושבתה" : "Template deactivated")
            : (isRTL ? "התבנית הופעלה" : "Template activated")
        );
        loadTemplates();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון התבנית" : "Failed to update template");
    }
  };

  const eventTypeLabels: Record<EventType, { en: string; he: string }> = {
    WEDDING: { en: "Wedding", he: "חתונה" },
    HENNA: { en: "Henna", he: "חינה" },
    ENGAGEMENT: { en: "Engagement", he: "אירוסין" },
    OTHER: { en: "Other", he: "אחר" },
  };

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "תבניות הזמנות" : "Invitation Templates"}
        text={isRTL ? "ניהול תבניות הזמנות PDF" : "Manage PDF invitation templates"}
      >
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              // Reset state when closing
              setPdfFile(null);
              setUploadedPdfData(null);
              setFormData({
                name: "",
                nameHe: "",
                description: "",
                descriptionHe: "",
                eventType: "WEDDING",
                pdfUrl: "",
                thumbnailUrl: "",
              });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Icons.add className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? "תבנית חדשה" : "New Template"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isRTL ? "יצירת תבנית חדשה" : "Create New Template"}</DialogTitle>
              <DialogDescription>
                {isRTL ? "הוסיפו תבנית הזמנה חדשה" : "Add a new invitation template"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "תיאור (אנגלית)" : "Description (English)"}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A beautiful elegant design..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "תיאור (עברית)" : "Description (Hebrew)"}</Label>
                  <Input
                    value={formData.descriptionHe}
                    onChange={(e) => setFormData({ ...formData, descriptionHe: e.target.value })}
                    placeholder="עיצוב אלגנטי ויפה..."
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "סוג אירוע" : "Event Type"} *</Label>
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

              <div className="space-y-2">
                <Label>{isRTL ? "העלאת קובץ PDF" : "Upload PDF File"} *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  {isUploading && (
                    <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {pdfFile && !isUploading && (
                  <p className="text-sm text-muted-foreground">
                    {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {uploadedPdfData && (
                <div className="space-y-2">
                  <Label>{isRTL ? "תצוגה מקדימה" : "Preview"}</Label>
                  <div className="relative aspect-[3/4] max-w-xs bg-muted rounded-lg overflow-hidden border">
                    <Image
                      src={uploadedPdfData.previewUrl}
                      alt="PDF Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "מידות" : "Dimensions"}: {uploadedPdfData.dimensions.width} x {uploadedPdfData.dimensions.height}px
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {isRTL ? "ביטול" : "Cancel"}
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !uploadedPdfData}>
                {isCreating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {isRTL ? "צור תבנית" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.fileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isRTL ? "אין תבניות עדיין" : "No templates yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isRTL ? "צרו את התבנית הראשונה שלכם" : "Create your first template"}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Icons.add className="mr-2 h-4 w-4" />
              {isRTL ? "תבנית חדשה" : "New Template"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="relative aspect-[3/4] bg-muted">
                {template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={isRTL ? template.nameHe : template.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.fileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive
                      ? (isRTL ? "פעיל" : "Active")
                      : (isRTL ? "לא פעיל" : "Inactive")}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {isRTL ? template.nameHe : template.name}
                    </CardTitle>
                    <CardDescription>
                      {isRTL
                        ? eventTypeLabels[template.eventType].he
                        : eventTypeLabels[template.eventType].en}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Icons.moreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/${locale}/admin/invitation-templates/${template.id}`}>
                          <Icons.edit className="mr-2 h-4 w-4" />
                          {isRTL ? "ערוך שדות" : "Edit Fields"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                        {template.isActive ? (
                          <>
                            <Icons.eyeOff className="mr-2 h-4 w-4" />
                            {isRTL ? "השבת" : "Deactivate"}
                          </>
                        ) : (
                          <>
                            <Icons.eye className="mr-2 h-4 w-4" />
                            {isRTL ? "הפעל" : "Activate"}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(template.id)}
                      >
                        <Icons.trash className="mr-2 h-4 w-4" />
                        {isRTL ? "מחק" : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {template.fields.length} {isRTL ? "שדות" : "fields"}
                  </span>
                  <span>
                    {template._count.generations} {isRTL ? "שימושים" : "uses"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "מחיקת תבנית" : "Delete Template"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "האם אתם בטוחים שברצונכם למחוק תבנית זו? פעולה זו לא ניתנת לביטול."
                : "Are you sure you want to delete this template? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
