"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteGuest } from "@/actions/guests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Icons } from "@/components/shared/icons";

export interface DuplicateInfo {
  name: string;
  phone: string;
  existingName?: string;
  existingGuestId?: string;
}

interface DuplicateErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicatesWithExisting?: DuplicateInfo[];
  duplicatesWithinBatch?: DuplicateInfo[];
  // For single guest add (simpler case)
  singleDuplicateNames?: string[];
  singleDuplicateGuestIds?: string[];
  guestName?: string;
  phoneNumber?: string;
  // Callback for editing an existing guest
  onEditGuest?: (guestId: string) => void;
  // Callback to skip/remove a duplicate from the import list (by phone)
  onSkipDuplicate?: (phone: string) => void;
  // Callback to skip all duplicates at once
  onSkipAllDuplicates?: () => void;
  // Callback when an existing guest is deleted (for single add mode)
  onExistingGuestDeleted?: () => void;
}

export function DuplicateErrorDialog({
  open,
  onOpenChange,
  duplicatesWithExisting = [],
  duplicatesWithinBatch = [],
  singleDuplicateNames = [],
  singleDuplicateGuestIds = [],
  guestName,
  phoneNumber,
  onEditGuest,
  onSkipDuplicate,
  onSkipAllDuplicates,
  onExistingGuestDeleted,
}: DuplicateErrorDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSingleMode = singleDuplicateNames.length > 0;
  const hasExistingDuplicates = duplicatesWithExisting.length > 0;
  const hasBatchDuplicates = duplicatesWithinBatch.length > 0;

  // Auto-close when all duplicates have been dealt with
  useEffect(() => {
    if (open && !isSingleMode && !hasExistingDuplicates && !hasBatchDuplicates) {
      onOpenChange(false);
    }
  }, [open, isSingleMode, hasExistingDuplicates, hasBatchDuplicates, onOpenChange]);

  // For single add mode - delete the existing guest
  const handleDeleteExistingClick = (guestId: string, guestName: string) => {
    setGuestToDelete({ id: guestId, name: guestName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteExisting = async () => {
    if (!guestToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteGuest(guestToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(ts("deleted"));
        setDeleteDialogOpen(false);
        setGuestToDelete(null);
        // Notify parent that existing guest was deleted
        if (onExistingGuestDeleted) {
          onExistingGuestDeleted();
        }
        onOpenChange(false);
        window.dispatchEvent(new CustomEvent("guests-data-changed"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setIsDeleting(false);
    }
  };

  // For bulk import - skip/remove from import list
  const handleSkipFromImport = (phone: string) => {
    if (onSkipDuplicate) {
      onSkipDuplicate(phone);
      toast.success(t("duplicates.skipped"));
    }
  };

  // Skip all duplicates at once (keeping first of each)
  const handleSkipAllDuplicates = () => {
    if (onSkipAllDuplicates) {
      onSkipAllDuplicates();
      toast.success(t("duplicates.allSkipped"));
      onOpenChange(false);
    }
  };

  const handleEditClick = (guestId: string) => {
    if (onEditGuest) {
      onOpenChange(false);
      onEditGuest(guestId);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Icons.alertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <DialogTitle>{t("duplicates.errorTitle")}</DialogTitle>
                <DialogDescription>
                  {t("duplicates.errorDescription")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-4 py-2">
              {/* Single guest duplicate mode - shows existing guests with same phone */}
              {isSingleMode && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icons.phone className="h-4 w-4 text-muted-foreground" />
                    <span dir="ltr">{phoneNumber}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("duplicates.alreadyUsedBy")}:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {singleDuplicateNames.map((name, idx) => {
                      const guestId = singleDuplicateGuestIds[idx];
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-sm">
                            {name}
                          </Badge>
                          {guestId && (
                            <div className="flex gap-1">
                              {onEditGuest && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleEditClick(guestId)}
                                  title={tc("edit")}
                                >
                                  <Icons.edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteExistingClick(guestId, name)}
                                title={tc("delete")}
                              >
                                <Icons.trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {guestName && (
                    <p className="mt-3 text-sm">
                      <span className="font-medium">{t("duplicates.tryingToAdd")}:</span> {guestName}
                    </p>
                  )}
                </div>
              )}

              {/* Bulk import - duplicates with existing guests */}
              {hasExistingDuplicates && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">
                    {t("duplicates.conflictWithExisting")}
                  </h4>
                  <div className="space-y-2">
                    {duplicatesWithExisting.map((dup, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{dup.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {t("duplicates.samePhoneAs")}: <span className="font-medium">{dup.existingName}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs" dir="ltr">
                              {dup.phone}
                            </Badge>
                            {onSkipDuplicate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => handleSkipFromImport(dup.phone)}
                                title={t("duplicates.skipFromImport")}
                              >
                                <Icons.close className="me-1 h-3.5 w-3.5" />
                                {t("duplicates.skip")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bulk import - duplicates within the batch */}
              {hasBatchDuplicates && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-600">
                    {t("duplicates.conflictWithinImport")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("duplicates.removeDuplicatesFromFile")}
                  </p>
                  <div className="space-y-2">
                    {duplicatesWithinBatch.map((dup, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{dup.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs" dir="ltr">
                              {dup.phone}
                            </Badge>
                            {onSkipDuplicate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-orange-600 hover:text-orange-600"
                                onClick={() => handleSkipFromImport(dup.phone)}
                                title={t("duplicates.skipFromImport")}
                              >
                                <Icons.close className="me-1 h-3.5 w-3.5" />
                                {t("duplicates.skip")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            {/* Show "Skip All Duplicates" button only in bulk mode with duplicates */}
            {(hasExistingDuplicates || hasBatchDuplicates) && onSkipAllDuplicates && (
              <Button
                variant="outline"
                onClick={handleSkipAllDuplicates}
                className="sm:mr-auto"
              >
                <Icons.close className="me-2 h-4 w-4" />
                {t("duplicates.skipAll")}
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>
              {tc("understood")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog - only for single add mode */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", { name: guestToDelete?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteExisting}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
