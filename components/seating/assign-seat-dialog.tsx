"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";

interface Guest {
  id: string;
  name: string;
  rsvpStatus?: string;
}

interface ManageTableGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableName: string;
  chairIndex: number;
  currentGuest: Guest | null;
  availableGuests: Guest[];
  onAssign: (guestId: string) => Promise<void>;
  onReplace: (oldGuestId: string, newGuestId: string) => Promise<void>;
  onUnassign: (guestId: string) => Promise<void>;
}

export function ManageTableGuestDialog({
  open,
  onOpenChange,
  tableId,
  tableName,
  chairIndex,
  currentGuest,
  availableGuests,
  onAssign,
  onReplace,
  onUnassign,
}: ManageTableGuestDialogProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredGuests = availableGuests.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async (guestId: string) => {
    setIsLoading(true);
    try {
      if (currentGuest) {
        // Replace existing guest
        await onReplace(currentGuest.id, guestId);
        toast.success(t("guestReplaced"));
      } else {
        // Assign new guest
        await onAssign(guestId);
        toast.success(t("guestAssignedToTable"));
      }
      onOpenChange(false);
      setSearchTerm("");
    } catch {
      toast.error(t("assignmentError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!currentGuest) return;
    setIsLoading(true);
    try {
      await onUnassign(currentGuest.id);
      toast.success(t("guestUnassigned"));
      onOpenChange(false);
    } catch {
      toast.error(t("unassignError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setSearchTerm("");
    }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {currentGuest ? t("manageChair") : t("assignChair")}
          </DialogTitle>
          <DialogDescription>
            {tableName} - Chair {chairIndex + 1}
          </DialogDescription>
        </DialogHeader>

        {/* Current Assignment */}
        {currentGuest && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">{currentGuest.name.charAt(0)}</span>
              </div>
              <div>
                <div className="text-sm font-medium">{currentGuest.name}</div>
                {currentGuest.rsvpStatus && (
                  <Badge
                    variant={
                      currentGuest.rsvpStatus === "ACCEPTED" ? "default" :
                      currentGuest.rsvpStatus === "DECLINED" ? "destructive" : "outline"
                    }
                    className="mt-0.5 text-xs"
                  >
                    {currentGuest.rsvpStatus}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnassign}
              disabled={isLoading}
            >
              <Icons.close className="h-4 w-4 me-1" />
              {t("remove")}
            </Button>
          </div>
        )}

        {/* Replace/Assign Section */}
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="text-sm font-medium text-muted-foreground">
            {currentGuest ? t("replaceWith") : t("selectGuest")}
          </div>

          {/* Search */}
          <div className="relative">
            <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchGuests")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Guest List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {filteredGuests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icons.users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{searchTerm ? t("noGuestsFound") : t("noGuestsAvailable")}</p>
              </div>
            ) : (
              filteredGuests.map((guest) => (
                <Button
                  key={guest.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-2"
                  onClick={() => handleAssign(guest.id)}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold">{guest.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 text-start">
                      <span className="text-sm">{guest.name}</span>
                    </div>
                    {guest.rsvpStatus && (
                      <Badge
                        variant={
                          guest.rsvpStatus === "ACCEPTED" ? "default" :
                          guest.rsvpStatus === "DECLINED" ? "destructive" : "outline"
                        }
                        className="text-xs shrink-0"
                      >
                        {guest.rsvpStatus}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {tc("cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// Keep the old export name for backward compatibility during transition
export { ManageTableGuestDialog as AssignSeatDialog };
