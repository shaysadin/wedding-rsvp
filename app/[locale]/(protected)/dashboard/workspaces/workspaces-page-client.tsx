"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlanTier } from "@prisma/client";
import { Plus, Building2, Settings, Trash2, Star, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { DashboardHeader } from "@/components/dashboard/header";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { deleteWorkspace, setDefaultWorkspace } from "@/actions/workspaces";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  _count: {
    events: number;
  };
}

interface WorkspacesPageClientProps {
  workspaces: Workspace[];
  userPlan: PlanTier;
  locale: string;
  canHaveMultiple: boolean;
}

export function WorkspacesPageClient({
  workspaces,
  userPlan,
  locale,
  canHaveMultiple,
}: WorkspacesPageClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("workspaces");
  const isRTL = locale === "he";

  const handleSetDefault = async (workspaceId: string) => {
    startTransition(async () => {
      const result = await setDefaultWorkspace(workspaceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("settings.updateSuccess"));
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (!workspaceToDelete) return;

    startTransition(async () => {
      const result = await deleteWorkspace(workspaceToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("settings.deleteSuccess"));
        router.refresh();
      }
      setDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
    });
  };

  const openDeleteDialog = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <DashboardHeader
        heading={t("title")}
        text={t("description")}
      >
        {canHaveMultiple && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t("createNew")}
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <Card
            key={workspace.id}
            className={cn(
              "relative",
              workspace.isDefault && "border-primary/50"
            )}
          >
            <CardHeader className="pb-2">
              <div className={cn("flex items-start justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Building2 className="size-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? "start" : "end"}>
                    {!workspace.isDefault && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleSetDefault(workspace.id)}
                          disabled={isPending}
                        >
                          <Star className="mr-2 size-4" />
                          {t("settings.setDefault")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(workspace)}
                      disabled={isPending || workspace.isDefault || workspace._count.events > 0}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      {t("settings.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription className="mt-1">
                /{workspace.slug}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <span className="text-2xl font-bold">{workspace._count.events}</span>
                  <span className="text-sm text-muted-foreground">{t("events")}</span>
                </div>
                {workspace.isDefault && (
                  <Badge variant="secondary">
                    <Star className="mr-1 size-3" />
                    {t("default")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {canHaveMultiple && (
          <Card
            className="cursor-pointer border-dashed hover:border-primary/50 hover:bg-muted/50 transition-colors"
            onClick={() => setIsCreateOpen(true)}
          >
            <CardContent className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <Plus className="size-8" />
              <span className="text-sm font-medium">{t("createNew")}</span>
            </CardContent>
          </Card>
        )}

        {!canHaveMultiple && workspaces.length >= 1 && (
          <Card className="border-dashed">
            <CardContent className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 text-muted-foreground text-center p-6">
              <Building2 className="size-8" />
              <span className="text-sm font-medium">{t("upgradeForMore")}</span>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateWorkspaceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        locale={locale}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === "he" ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {locale === "he" ? "מחיקה" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
