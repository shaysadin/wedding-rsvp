"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { setActiveInvitation, deleteGeneratedInvitation } from "@/actions/generate-invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
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

interface GeneratedInvitation {
  id: string;
  pngUrl: string;
  createdAt: Date;
  template: {
    name: string;
    nameHe: string;
    thumbnailUrl: string | null;
  };
}

interface GeneratedInvitationsGalleryProps {
  invitations: GeneratedInvitation[];
  activeImageUrl: string | null;
  onRefresh: () => void;
}

export function GeneratedInvitationsGallery({
  invitations,
  activeImageUrl,
  onRefresh,
}: GeneratedInvitationsGalleryProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [selectedInvitation, setSelectedInvitation] = useState<GeneratedInvitation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState<string | null>(null);

  const handleSetActive = async (invitationId: string) => {
    setIsSettingActive(invitationId);
    try {
      const result = await setActiveInvitation(invitationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההזמנה הוגדרה כפעילה" : "Invitation set as active");
        onRefresh();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהגדרת ההזמנה" : "Failed to set invitation");
    } finally {
      setIsSettingActive(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const result = await deleteGeneratedInvitation(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההזמנה נמחקה" : "Invitation deleted");
        onRefresh();
      }
    } catch {
      toast.error(isRTL ? "שגיאה במחיקת ההזמנה" : "Failed to delete invitation");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isRTL ? "he-IL" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Icons.media className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {isRTL ? "אין הזמנות עדיין" : "No Invitations Yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRTL
              ? "צרו הזמנה חדשה בלשונית 'יצירת הזמנה'"
              : "Create a new invitation in the 'Create' tab"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card dir={isRTL ? "rtl" : "ltr"}>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2")}>
            <Icons.media className="h-5 w-5" />
            {isRTL ? "הזמנות שנוצרו" : "Generated Invitations"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? `${invitations.length} הזמנות נוצרו. לחצו על תמונה לצפייה מורחבת.`
              : `${invitations.length} invitations created. Click on an image to view.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <AnimatePresence>
              {invitations.map((invitation, index) => {
                const isActive = invitation.pngUrl === activeImageUrl;

                return (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group relative aspect-[3/4] overflow-hidden rounded-xl border-2 bg-muted transition-all hover:shadow-lg",
                      isActive ? "border-green-500 ring-2 ring-green-500/20" : "border-muted hover:border-primary/50"
                    )}
                  >
                    {/* Image */}
                    <Image
                      src={invitation.pngUrl}
                      alt={isRTL ? invitation.template.nameHe : invitation.template.name}
                      fill
                      className="cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setSelectedInvitation(invitation)}
                    />

                    {/* Active Badge */}
                    {isActive && (
                      <Badge className="absolute start-2 top-2 bg-green-600 hover:bg-green-600">
                        <Icons.check className="me-1 h-3 w-3" />
                        {isRTL ? "פעיל" : "Active"}
                      </Badge>
                    )}

                    {/* Hover Actions */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedInvitation(invitation)}
                      >
                        <Icons.zoomIn className="me-1 h-4 w-4" />
                        {isRTL ? "צפייה" : "View"}
                      </Button>
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSetActive(invitation.id)}
                          disabled={isSettingActive === invitation.id}
                        >
                          {isSettingActive === invitation.id ? (
                            <Icons.spinner className="me-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Icons.check className="me-1 h-4 w-4" />
                          )}
                          {isRTL ? "הגדר כפעיל" : "Set Active"}
                        </Button>
                      )}
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="truncate text-xs font-medium text-white">
                        {isRTL ? invitation.template.nameHe : invitation.template.name}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedInvitation}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvitation(null);
          }
        }}
      >
        <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedInvitation && (
                <>
                  {selectedInvitation.pngUrl === activeImageUrl && (
                    <Badge className="bg-green-600 hover:bg-green-600">
                      <Icons.check className="me-1 h-3 w-3" />
                      {isRTL ? "פעילה" : "Active"}
                    </Badge>
                  )}
                  <span>{isRTL ? selectedInvitation.template.nameHe : selectedInvitation.template.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedInvitation && (
            <>
              {/* Large Image - takes most of the dialog */}
              <div className="flex-1 relative min-h-0 mx-4">
                <Image
                  src={selectedInvitation.pngUrl}
                  alt="Invitation preview"
                  fill
                  className="object-contain"
                  quality={100}
                  priority
                  sizes="90vw"
                />
              </div>

              {/* Footer with info and actions */}
              <div className="shrink-0 flex flex-col gap-3 border-t bg-muted/30 p-4">
                {/* Info */}
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                  <Icons.clock className="me-1 h-4 w-4" />
                  {formatDate(selectedInvitation.createdAt)}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" asChild>
                    <a
                      href={selectedInvitation.pngUrl}
                      download="invitation.png"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icons.download className="h-4 w-4 me-2" />
                      {isRTL ? "הורדה" : "Download"}
                    </a>
                  </Button>

                  {selectedInvitation.pngUrl !== activeImageUrl && (
                    <Button
                      onClick={() => {
                        handleSetActive(selectedInvitation.id);
                        setSelectedInvitation(null);
                      }}
                      disabled={isSettingActive === selectedInvitation.id}
                    >
                      {isSettingActive === selectedInvitation.id ? (
                        <Icons.spinner className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <Icons.check className="h-4 w-4 me-2" />
                      )}
                      {isRTL ? "הגדר כהזמנה הפעילה" : "Set as Active Invitation"}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeleteId(selectedInvitation.id);
                      setSelectedInvitation(null);
                    }}
                  >
                    <Icons.trash className="h-4 w-4 me-2" />
                    {isRTL ? "מחק" : "Delete"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "מחיקת הזמנה" : "Delete Invitation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "האם אתם בטוחים שברצונכם למחוק הזמנה זו? פעולה זו לא ניתנת לביטול."
                : "Are you sure you want to delete this invitation? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {isRTL ? "מחק" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
