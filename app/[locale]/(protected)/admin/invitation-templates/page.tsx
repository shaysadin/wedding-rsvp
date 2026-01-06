"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { EventType, InvitationFieldType } from "@prisma/client";

import {
  getAdminInvitationTemplates,
  deleteInvitationTemplate,
  updateInvitationTemplate,
} from "@/actions/invitation-templates";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface TemplateField {
  id: string;
  fieldType: InvitationFieldType;
  label: string;
  labelHe: string | null;
  originalValue: string;
  isRequired: boolean;
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
  isActive: boolean;
  sortOrder: number;
  fields: TemplateField[];
  _count: {
    generations: number;
  };
}

const eventTypeLabels: Record<EventType, { en: string; he: string }> = {
  WEDDING: { en: "Wedding", he: "חתונה" },
  HENNA: { en: "Henna", he: "חינה" },
  ENGAGEMENT: { en: "Engagement", he: "אירוסין" },
  OTHER: { en: "Other", he: "אחר" },
};

export default function AdminInvitationTemplatesPage() {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
            ? isRTL
              ? "התבנית הושבתה"
              : "Template deactivated"
            : isRTL
              ? "התבנית הופעלה"
              : "Template activated"
        );
        loadTemplates();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון התבנית" : "Failed to update template");
    }
  };

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "תבניות הזמנות" : "Invitation Templates"}
        text={
          isRTL
            ? "ניהול תבניות הזמנות עם עריכת טקסט בינה מלאכותית"
            : "Manage invitation templates with AI text editing"
        }
      >
        <Button asChild>
          <Link href={`/${locale}/admin/invitation-templates/new`}>
            <Icons.add className="h-4 w-4 me-2" />
            {isRTL ? "תבנית חדשה" : "New Template"}
          </Link>
        </Button>
      </DashboardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.fileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {isRTL ? "אין תבניות עדיין" : "No templates yet"}
            </h3>
            <p className="mb-4 text-muted-foreground">
              {isRTL ? "צרו את התבנית הראשונה שלכם" : "Create your first template"}
            </p>
            <Button asChild>
              <Link href={`/${locale}/admin/invitation-templates/new`}>
                <Icons.add className="me-2 h-4 w-4" />
                {isRTL ? "תבנית חדשה" : "New Template"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="relative aspect-[3/4] bg-muted">
                {template.thumbnailUrl || template.imageUrl ? (
                  <Image
                    src={template.thumbnailUrl || template.imageUrl}
                    alt={isRTL ? template.nameHe : template.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.fileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute right-2 top-2 flex gap-2">
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive
                      ? isRTL
                        ? "פעיל"
                        : "Active"
                      : isRTL
                        ? "לא פעיל"
                        : "Inactive"}
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
                        <Link
                          href={`/${locale}/admin/invitation-templates/${template.id}`}
                        >
                          <Icons.edit className="me-2 h-4 w-4" />
                          {isRTL ? "ערוך שדות" : "Edit Fields"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(template)}
                      >
                        {template.isActive ? (
                          <>
                            <Icons.eyeOff className="me-2 h-4 w-4" />
                            {isRTL ? "השבת" : "Deactivate"}
                          </>
                        ) : (
                          <>
                            <Icons.eye className="me-2 h-4 w-4" />
                            {isRTL ? "הפעל" : "Activate"}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(template.id)}
                      >
                        <Icons.trash className="me-2 h-4 w-4" />
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
              {isDeleting && (
                <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
              )}
              {isRTL ? "מחק" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageFadeIn>
  );
}
