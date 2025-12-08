"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { getDuplicatePhoneGuests, deleteGuest } from "@/actions/guests";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icons } from "@/components/shared/icons";

interface DuplicateGroup {
  phoneNumber: string;
  guests: {
    id: string;
    name: string;
    phoneNumber: string | null;
    side: string | null;
    groupName: string | null;
  }[];
}

interface DuplicatePhoneWarningProps {
  eventId: string;
  onEditGuest?: (guestId: string) => void;
}

export function DuplicatePhoneWarning({ eventId, onEditGuest }: DuplicatePhoneWarningProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadDuplicates();
  }, [eventId]);

  // Listen for data changes
  useEffect(() => {
    const handleDataChange = () => {
      loadDuplicates();
    };

    window.addEventListener("guests-data-changed", handleDataChange);
    return () => window.removeEventListener("guests-data-changed", handleDataChange);
  }, [eventId]);

  async function loadDuplicates() {
    setIsLoading(true);
    try {
      const result = await getDuplicatePhoneGuests(eventId);
      if (result.success && result.duplicateGroups) {
        setDuplicateGroups(result.duplicateGroups);
      }
    } catch {
      // Silently fail - not critical
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(guestId: string) {
    setDeletingId(guestId);
    try {
      const result = await deleteGuest(guestId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(ts("deleted"));
        // Reload duplicates
        loadDuplicates();
        // Dispatch event to refresh main table
        window.dispatchEvent(new CustomEvent("guests-data-changed"));
      }
    } catch {
      toast.error("Failed to delete guest");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (isLoading) {
    return null;
  }

  if (duplicateGroups.length === 0) {
    return null;
  }

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.guests.length, 0);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border-2 border-orange-500/50 bg-orange-500/10 p-4">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center justify-between text-start",
                isRTL && "flex-row-reverse text-end"
              )}
            >
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                  <Icons.alertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-700 dark:text-orange-400">
                    {t("duplicates.title")}
                  </h3>
                  <p className="text-sm text-orange-600/80 dark:text-orange-400/80">
                    {t("duplicates.description", { count: totalDuplicates })}
                  </p>
                </div>
              </div>
              <Icons.chevronDown
                className={cn(
                  "h-5 w-5 text-orange-600 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-3">
            {duplicateGroups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="rounded-md border border-orange-500/30 bg-background p-3"
              >
                <div className={cn("mb-2 flex items-center gap-2 text-sm font-medium", isRTL && "flex-row-reverse")}>
                  <Icons.phone className="h-4 w-4 text-muted-foreground" />
                  <span dir="ltr">{group.phoneNumber}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.guests.length} {t("duplicates.guests")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {group.guests.map((guest) => (
                    <div
                      key={guest.id}
                      className={cn(
                        "flex items-center justify-between rounded-md bg-muted/50 px-3 py-2",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <span className="font-medium">{guest.name}</span>
                        {guest.side && (
                          <Badge variant="outline" className="text-xs">
                            {guest.side}
                          </Badge>
                        )}
                        {guest.groupName && (
                          <Badge variant="outline" className="text-xs">
                            {guest.groupName}
                          </Badge>
                        )}
                      </div>
                      <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                        {onEditGuest && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditGuest(guest.id)}
                          >
                            <Icons.edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(guest.id)}
                          disabled={deletingId === guest.id}
                        >
                          {deletingId === guest.id ? (
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icons.trash className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("duplicates.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("duplicates.confirmDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
