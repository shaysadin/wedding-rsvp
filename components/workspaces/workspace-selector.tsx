"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus, Building2, Loader2 } from "lucide-react";
import { PlanTier } from "@prisma/client";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { setDefaultWorkspace } from "@/actions/workspaces";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  _count?: {
    events: number;
  };
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspaceId?: string | null;
  userPlan: PlanTier;
  locale: string;
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function WorkspaceSelector({
  workspaces,
  currentWorkspaceId,
  userPlan,
  locale,
  onWorkspaceChange,
}: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("workspaces");

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ||
    workspaces.find((w) => w.isDefault) ||
    workspaces[0];

  const isRTL = locale === "he";

  const handleSelect = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) {
      setOpen(false);
      return;
    }

    setOpen(false);

    startTransition(async () => {
      const result = await setDefaultWorkspace(workspaceId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (onWorkspaceChange) {
        onWorkspaceChange(workspaceId);
      }

      router.refresh();
    });
  };

  const handleCreateNew = () => {
    setOpen(false);
    setCreateDialogOpen(true);
  };

  // This component is only rendered for BUSINESS users (filtered by WorkspaceSelectorClient)
  // All BUSINESS users should have at least one default workspace

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between gap-2 min-w-[180px]",
              isRTL && "flex-row-reverse"
            )}
            disabled={isPending}
          >
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Building2 className="size-4 text-muted-foreground" />
              )}
              <span className="truncate max-w-[120px]">
                {currentWorkspace?.name || t("select")}
              </span>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={cn("w-[250px]", isRTL && "rtl")}
          align={isRTL ? "end" : "start"}
        >
          <DropdownMenuLabel>{t("yourWorkspaces")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSelect(workspace.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                currentWorkspace?.id === workspace.id && "bg-accent"
              )}
            >
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    currentWorkspace?.id === workspace.id
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                <span className="truncate">{workspace.name}</span>
                {workspace.isDefault && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t("default")}
                  </Badge>
                )}
              </div>
              {workspace._count !== undefined && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {workspace._count.events} {t("events")}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleCreateNew}
            className={cn(
              "cursor-pointer",
              isRTL && "flex-row-reverse"
            )}
          >
            <Plus className="size-4 me-2" />
            <span>{t("createNew")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        locale={locale}
        onWorkspaceCreated={() => {
          if (onWorkspaceChange) {
            // Pass empty string since we don't have the new ID here
            // The parent will refetch and get the correct data
            onWorkspaceChange("");
          }
        }}
      />
    </>
  );
}
