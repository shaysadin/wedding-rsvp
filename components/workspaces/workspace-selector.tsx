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
            role="combobox"
            aria-expanded={open}
            className="justify-between gap-2 h-auto py-2 w-full"
            disabled={isPending}
          >
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Building2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex flex-col items-start text-start truncate">
                <span className="font-medium truncate text-sm">
                  {currentWorkspace?.name || t("select")}
                </span>
                {currentWorkspace && (
                  <span className="text-xs text-muted-foreground">
                    {currentWorkspace._count?.events || 0} {t("events")}
                  </span>
                )}
              </div>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isRTL ? "start" : "end"}
          className="w-[280px] p-2"
        >
          <div className="mb-2 px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("yourWorkspaces")}
            </p>
          </div>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSelect(workspace.id)}
              className="flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 text-start">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{workspace.name}</p>
                  {workspace.isDefault && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {t("default")}
                    </Badge>
                  )}
                </div>
                {workspace._count !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {workspace._count.events} {t("events")}
                  </p>
                )}
              </div>
              <Check
                className={cn(
                  "size-4 shrink-0",
                  currentWorkspace?.id === workspace.id
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem
            onClick={handleCreateNew}
            className="flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">{t("createNew")}</span>
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
