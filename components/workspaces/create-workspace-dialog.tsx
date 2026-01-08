"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, setDefaultWorkspace } from "@/actions/workspaces";
import { generateSlug } from "@/lib/validations/workspace";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  onWorkspaceCreated?: () => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  locale,
  onWorkspaceCreated,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("workspaces");
  const isRTL = locale === "he";

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(locale === "he" ? "נא להזין שם" : "Please enter a name");
      return;
    }

    startTransition(async () => {
      const result = await createWorkspace({
        name: name.trim(),
        slug: slug || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.workspace) {
        // Switch to the new workspace by setting it as default
        await setDefaultWorkspace(result.workspace.id);

        toast.success(t("create.success"));
        onOpenChange(false);
        setName("");
        setSlug("");
        setSlugManuallyEdited(false);

        // Notify parent to refetch workspaces
        if (onWorkspaceCreated) {
          onWorkspaceCreated();
        }

        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("create.nameLabel")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("create.namePlaceholder")}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">{t("create.slugLabel")}</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder={t("create.slugPlaceholder")}
                dir="ltr"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("create.slugHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {locale === "he" ? "ביטול" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? locale === "he"
                  ? "יוצר..."
                  : "Creating..."
                : t("create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
