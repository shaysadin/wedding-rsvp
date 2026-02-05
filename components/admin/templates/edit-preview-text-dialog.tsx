"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateWhatsAppTemplateContent } from "@/actions/whatsapp-templates";
import { Icons } from "@/components/shared/icons";

interface EditPreviewTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    nameHe: string;
    nameEn: string;
    previewText: string | null;
    previewTextHe: string | null;
    approvalStatus: string;
  } | null;
  onSuccess?: () => void;
}

export function EditPreviewTextDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: EditPreviewTextDialogProps) {
  const [previewTextHe, setPreviewTextHe] = useState("");
  const [previewTextEn, setPreviewTextEn] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when template changes or dialog opens
  useEffect(() => {
    if (open && template) {
      setPreviewTextHe(template.previewTextHe || "");
      setPreviewTextEn(template.previewText || "");
    }
  }, [open, template]);

  const handleSave = async () => {
    if (!template) return;

    // Validate that at least Hebrew preview is provided
    if (!previewTextHe.trim()) {
      toast.error("נא להזין טקסט תצוגה מקדימה בעברית");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateWhatsAppTemplateContent({
        id: template.id,
        previewText: previewTextEn || previewTextHe, // Fallback to Hebrew if English not provided
        previewTextHe,
      });

      if (result.success) {
        toast.success("טקסט התצוגה המקדימה עודכן בהצלחה");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "שגיאה בעדכון טקסט התצוגה המקדימה");
      }
    } catch (error) {
      toast.error("שגיאה בעדכון טקסט התצוגה המקדימה");
      console.error("Preview text update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת טקסט תצוגה מקדימה</DialogTitle>
          <DialogDescription>
            עדכן את הטקסט שמוצג בתצוגה המקדימה של ההודעה
            <br />
            <span className="font-medium">{template.nameHe} ({template.nameEn})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hebrew Preview Text */}
          <div className="space-y-2">
            <Label htmlFor="previewTextHe" className="text-base font-semibold">
              טקסט תצוגה מקדימה - עברית <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="previewTextHe"
              value={previewTextHe}
              onChange={(e) => setPreviewTextHe(e.target.value)}
              placeholder="הזן את הטקסט המלא שיוצג בתצוגה מקדימה..."
              className="min-h-[200px] font-sans text-base"
              dir="rtl"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              זהו הטקסט שיוצג למשתמשים בתצוגה המקדימה כאשר הם בוחרים תבנית זו.
              השתמש במשתנים כמו {`{{1}}`}, {`{{2}}`} וכו'.
            </p>
          </div>

          {/* English Preview Text (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="previewTextEn" className="text-base font-semibold">
              טקסט תצוגה מקדימה - אנגלית (אופציונלי)
            </Label>
            <Textarea
              id="previewTextEn"
              value={previewTextEn}
              onChange={(e) => setPreviewTextEn(e.target.value)}
              placeholder="Enter the full preview text in English..."
              className="min-h-[200px] font-sans text-base"
              dir="ltr"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              אם לא מסופק, יוצג הטקסט בעברית גם עבור משתמשי אנגלית.
            </p>
          </div>

          {/* Warning for DRAFT templates */}
          {template.approvalStatus === "DRAFT" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-900/20 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                💡 טיפ: תבנית זו במצב טיוטה. תוכל לערוך את הטקסט המלא של ההודעה בטרם הגשתה לאישור.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !previewTextHe.trim()}
          >
            {isLoading ? (
              <>
                <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                שומר...
              </>
            ) : (
              "שמור"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
