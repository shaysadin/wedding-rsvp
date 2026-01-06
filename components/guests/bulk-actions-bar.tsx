"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sendBulkInvites, sendBulkReminders } from "@/actions/notifications";
import { startBulkCalling, getGuestsForCalling } from "@/actions/vapi/calls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  rsvp?: {
    status: string;
    guestCount: number | null;
  } | null;
}

interface BulkActionsBarProps {
  eventId: string;
  pendingCount: number;
}

export function BulkActionsBar({ eventId, pendingCount }: BulkActionsBarProps) {
  const t = useTranslations("guests");
  const tv = useTranslations("voiceAgent.calls");
  const te = useTranslations("errors");
  const tc = useTranslations("common");

  const [isLoading, setIsLoading] = useState<"invites" | "reminders" | "calls" | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [pendingGuestsWithPhone, setPendingGuestsWithPhone] = useState<Guest[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);

  // Load guests when modal opens
  const loadGuestsForCalling = async () => {
    setIsLoadingGuests(true);
    try {
      const result = await getGuestsForCalling(eventId);
      if (result.guests) {
        // Filter to only pending guests with phone numbers
        const pending = result.guests.filter(
          (g: Guest) => g.phoneNumber && (!g.rsvp || g.rsvp.status === "PENDING")
        );
        setPendingGuestsWithPhone(pending);
      }
    } catch {
      toast.error(te("generic"));
    } finally {
      setIsLoadingGuests(false);
    }
  };

  const handleOpenCallModal = () => {
    setShowCallModal(true);
    loadGuestsForCalling();
  };

  const handleBulkCall = async () => {
    if (pendingGuestsWithPhone.length === 0) return;

    setIsLoading("calls");
    try {
      const guestIds = pendingGuestsWithPhone.map((g) => g.id);
      const result = await startBulkCalling(eventId, guestIds);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tv("bulkCallStarted", { count: result.totalGuests || 0 }));
        setShowCallModal(false);
        window.dispatchEvent(new CustomEvent("voice-agent-data-changed"));
      }
    } catch {
      toast.error(te("generic"));
    } finally {
      setIsLoading(null);
    }
  };

  const handleSendInvites = async () => {
    setIsLoading("invites");

    try {
      const result = await sendBulkInvites(eventId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.sent || result.sent === 0) {
        toast.info(t("noInvitesToSend"));
      } else {
        toast.success(t("sentInvites", { count: result.sent }));
      }
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(null);
    }
  };

  const handleSendReminders = async () => {
    if (pendingCount === 0) {
      toast.info(t("noPendingToRemind"));
      return;
    }

    setIsLoading("reminders");

    try {
      const result = await sendBulkReminders(eventId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.sent || result.sent === 0) {
        toast.info(t("noPendingToRemind"));
      } else {
        toast.success(t("sentReminders", { count: result.sent }));
      }
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <Button
            variant="outline"
            onClick={handleSendInvites}
            disabled={isLoading !== null}
          >
            {isLoading === "invites" ? (
              <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.send className="me-2 h-4 w-4" />
            )}
            {t("sendAllInvites")}
          </Button>

          <Button
            variant="outline"
            onClick={handleSendReminders}
            disabled={isLoading !== null || pendingCount === 0}
          >
            {isLoading === "reminders" ? (
              <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.bell className="me-2 h-4 w-4" />
            )}
            {t("sendAllPending")} ({pendingCount})
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenCallModal}
            disabled={isLoading !== null || pendingCount === 0}
          >
            {isLoading === "calls" ? (
              <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.phone className="me-2 h-4 w-4" />
            )}
            {t("callAllPending")} ({pendingCount})
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Call Modal */}
      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <Icons.phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              {tv("bulkConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {tv("bulkConfirmDescription", { count: pendingGuestsWithPhone.length })}
            </DialogDescription>
          </DialogHeader>

          {/* Selected Guests List */}
          <div className="py-4">
            <p className="text-sm font-medium mb-3">{tv("selectedGuests")}</p>
            {isLoadingGuests ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingGuestsWithPhone.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Icons.phone className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">{t("noGuestsWithPhone")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-lg border bg-muted/30 p-3">
                <div className="space-y-2">
                  {pendingGuestsWithPhone.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between rounded-md border bg-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                          <Icons.user className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{guest.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {guest.phoneNumber}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {tv("pending")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCallModal(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleBulkCall}
              disabled={isLoading === "calls" || pendingGuestsWithPhone.length === 0}
            >
              {isLoading === "calls" ? (
                <>
                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                  {tv("calling")}
                </>
              ) : (
                <>
                  <Icons.phone className="me-2 h-4 w-4" />
                  {tv("startCalling")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
