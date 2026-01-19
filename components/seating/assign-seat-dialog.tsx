"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface AssignSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatId: string;
  seatNumber: number;
  tableName: string;
  currentGuest?: Guest | null;
  availableGuests: Guest[];
  onAssign: (guestId: string) => Promise<void>;
  onUnassign: () => Promise<void>;
}

export function AssignSeatDialog({
  open,
  onOpenChange,
  seatId,
  seatNumber,
  tableName,
  currentGuest,
  availableGuests,
  onAssign,
  onUnassign,
}: AssignSeatDialogProps) {
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
      await onAssign(guestId);
      toast.success(t("guestAssignedToSeat"));
      onOpenChange(false);
    } catch (error) {
      toast.error(t("assignmentError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      await onUnassign();
      toast.success(t("seatUnassigned"));
      onOpenChange(false);
    } catch (error) {
      toast.error(t("unassignError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("assignSeat", { table: tableName, seat: seatNumber })}
          </DialogTitle>
        </DialogHeader>

        {/* Current Assignment */}
        {currentGuest && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="text-sm font-medium">{currentGuest.name}</div>
              {currentGuest.rsvpStatus && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {currentGuest.rsvpStatus}
                </Badge>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnassign}
              disabled={isLoading}
            >
              <Icons.close className="h-4 w-4" />
            </Button>
          </div>
        )}

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
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icons.users className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{t("noGuestsAvailable")}</p>
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <Button
                key={guest.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAssign(guest.id)}
                disabled={isLoading}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{guest.name}</span>
                  {guest.rsvpStatus && (
                    <Badge variant="outline" className="text-xs">
                      {guest.rsvpStatus}
                    </Badge>
                  )}
                </div>
              </Button>
            ))
          )}
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {tc("cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
