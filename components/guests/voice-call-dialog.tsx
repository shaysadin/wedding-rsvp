"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/template/ui/badge";
import { Icons } from "@/components/shared/icons";
import { callGuest, startBulkCalling, getCallJobStatus, syncCall } from "@/actions/vapi/calls";
import type { GuestWithRsvp } from "./template-guests-table";

type CallStatus = "PENDING" | "CALLING" | "COMPLETED" | "NO_ANSWER" | "BUSY" | "FAILED" | "CANCELLED";

interface GuestCallStatus {
  guestId: string;
  guestName: string;
  phoneNumber: string;
  status: CallStatus;
  callLogId?: string;
  rsvpStatus?: string;
}

interface VoiceCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  mode: "single" | "bulk";
  guest?: GuestWithRsvp;
  selectedGuests?: GuestWithRsvp[];
  onCallComplete?: () => void;
}

const callStatusConfig: Record<CallStatus, { label: string; color: "light" | "warning" | "info" | "success" | "error" }> = {
  PENDING: { label: "pending", color: "light" },
  CALLING: { label: "calling", color: "info" },
  COMPLETED: { label: "completed", color: "success" },
  NO_ANSWER: { label: "noAnswer", color: "warning" },
  BUSY: { label: "busy", color: "warning" },
  FAILED: { label: "failed", color: "error" },
  CANCELLED: { label: "cancelled", color: "light" },
};

export function VoiceCallDialog({
  open,
  onOpenChange,
  eventId,
  mode,
  guest,
  selectedGuests = [],
  onCallComplete,
}: VoiceCallDialogProps) {
  const t = useTranslations("voiceCall");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");

  // State
  const [isStarting, setIsStarting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [singleCallLogId, setSingleCallLogId] = useState<string | null>(null);
  const [guestStatuses, setGuestStatuses] = useState<GuestCallStatus[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0, success: 0, failed: 0 });

  // Initialize guest statuses when dialog opens
  useEffect(() => {
    if (open) {
      if (mode === "single" && guest) {
        setGuestStatuses([{
          guestId: guest.id,
          guestName: guest.name,
          phoneNumber: guest.phoneNumber || "",
          status: "PENDING",
          rsvpStatus: guest.rsvp?.status || "PENDING",
        }]);
        setProgress({ processed: 0, total: 1, success: 0, failed: 0 });
      } else if (mode === "bulk" && selectedGuests.length > 0) {
        const statuses = selectedGuests
          .filter(g => g.phoneNumber)
          .map(g => ({
            guestId: g.id,
            guestName: g.name,
            phoneNumber: g.phoneNumber || "",
            status: "PENDING" as CallStatus,
            rsvpStatus: g.rsvp?.status || "PENDING",
          }));
        setGuestStatuses(statuses);
        setProgress({ processed: 0, total: statuses.length, success: 0, failed: 0 });
      }
      // Reset state
      setIsCallActive(false);
      setBulkJobId(null);
      setSingleCallLogId(null);
      setIsStarting(false);
    }
  }, [open, mode, guest, selectedGuests]);

  // Polling for call status updates
  const pollStatus = useCallback(async () => {
    if (!isCallActive) return;

    if (mode === "single" && singleCallLogId) {
      // Poll single call
      const result = await syncCall(singleCallLogId);
      if (result.success && result.callLog) {
        const newStatus = result.callLog.status as CallStatus;
        setGuestStatuses(prev => prev.map(gs =>
          gs.callLogId === singleCallLogId ? { ...gs, status: newStatus } : gs
        ));

        // Check if call is complete
        if (["COMPLETED", "NO_ANSWER", "BUSY", "FAILED", "CANCELLED"].includes(newStatus)) {
          setIsCallActive(false);
          setProgress(p => ({
            ...p,
            processed: 1,
            success: newStatus === "COMPLETED" ? 1 : 0,
            failed: ["NO_ANSWER", "BUSY", "FAILED"].includes(newStatus) ? 1 : 0,
          }));
        }
      }
    } else if (mode === "bulk" && bulkJobId) {
      // Poll bulk job
      const result = await getCallJobStatus(bulkJobId);
      if (result.success && result.job) {
        const job = result.job;

        // Update progress
        setProgress({
          processed: job.processedCount,
          total: job.totalGuests,
          success: job.successCount,
          failed: job.failedCount,
        });

        // Update individual guest statuses
        if (job.callLogs) {
          setGuestStatuses(prev => prev.map(gs => {
            const callLog = job.callLogs?.find((cl: { guestId: string }) => cl.guestId === gs.guestId);
            if (callLog) {
              return { ...gs, status: callLog.status as CallStatus };
            }
            return gs;
          }));
        }

        // Check if job is complete
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
          setIsCallActive(false);
        }
      }
    }
  }, [isCallActive, mode, singleCallLogId, bulkJobId]);

  // Set up polling interval
  useEffect(() => {
    if (!isCallActive) return;

    const interval = setInterval(pollStatus, mode === "single" ? 2000 : 3000);
    return () => clearInterval(interval);
  }, [isCallActive, pollStatus, mode]);

  // Start calls
  const handleStartCalls = async () => {
    setIsStarting(true);

    try {
      if (mode === "single" && guest) {
        // Single call
        const result = await callGuest(guest.id, eventId);

        if (result.error) {
          toast.error(result.error);
          setIsStarting(false);
          return;
        }

        if (result.success && result.callLogId) {
          setSingleCallLogId(result.callLogId);
          setGuestStatuses(prev => prev.map(gs =>
            gs.guestId === guest.id
              ? { ...gs, status: "CALLING", callLogId: result.callLogId }
              : gs
          ));
          setIsCallActive(true);
          toast.success(t("callStarted"));
        }
      } else if (mode === "bulk" && guestStatuses.length > 0) {
        // Bulk call
        const guestIds = guestStatuses.map(gs => gs.guestId);
        const result = await startBulkCalling(eventId, guestIds);

        if (result.error) {
          toast.error(result.error);
          setIsStarting(false);
          return;
        }

        if (result.success && result.jobId) {
          setBulkJobId(result.jobId);
          setIsCallActive(true);
          toast.success(t("bulkCallStarted", { count: result.totalGuests }));
        }
      }
    } catch (error) {
      console.error("Error starting calls:", error);
      toast.error(tc("error"));
    } finally {
      setIsStarting(false);
    }
  };

  // Handle dialog close
  const handleClose = (newOpen: boolean) => {
    if (!newOpen && isCallActive) {
      // Don't close while calls are active - just minimize awareness
      toast.info(t("callsInProgress"));
    }
    onOpenChange(newOpen);
    if (!newOpen && !isCallActive) {
      onCallComplete?.();
    }
  };

  const guestsWithPhone = guestStatuses.filter(gs => gs.phoneNumber);
  const hasStarted = isCallActive || progress.processed > 0;
  const isComplete = !isCallActive && progress.processed > 0 && progress.processed === progress.total;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <Icons.phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="block">{t("title")}</span>
              <span className="block text-sm font-normal text-gray-500 dark:text-gray-400">
                {mode === "single"
                  ? t("callSingleGuest", { name: guest?.name || "" })
                  : t("callMultipleGuests", { count: guestsWithPhone.length })}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Call Script Preview */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Icons.fileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("callScript")}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed" dir="rtl">
              {t("scriptPreview")}
            </p>
          </div>

          {/* Progress Bar (only for bulk or when started) */}
          {(mode === "bulk" || hasStarted) && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("progress")}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {progress.processed}/{progress.total}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isComplete
                      ? progress.failed === progress.total
                        ? "bg-red-500"
                        : "bg-emerald-500"
                      : "bg-brand-500"
                  )}
                  style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                />
              </div>
              {hasStarted && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Icons.check className="h-3 w-3" />
                    {progress.success} {t("successful")}
                  </span>
                  {progress.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <Icons.x className="h-3 w-3" />
                      {progress.failed} {t("failed")}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Guest List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === "single" ? t("guestToCall") : t("guestsToCall")}
              </span>
              {guestsWithPhone.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {guestsWithPhone.length} {t("withPhone")}
                </span>
              )}
            </div>

            <ScrollArea className={cn("rounded-lg border bg-white dark:bg-gray-900", mode === "bulk" ? "h-[240px]" : "h-auto")}>
              <div className="p-2 space-y-2">
                {guestsWithPhone.map((gs) => {
                  const statusConfig = callStatusConfig[gs.status];
                  const rsvpColor = gs.rsvpStatus === "ACCEPTED" ? "success"
                    : gs.rsvpStatus === "DECLINED" ? "error"
                    : "warning";

                  return (
                    <div
                      key={gs.guestId}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 transition-colors",
                        gs.status === "CALLING" && "border-brand-300 bg-brand-50/50 dark:border-brand-600 dark:bg-brand-500/10",
                        gs.status === "COMPLETED" && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-500/10",
                        ["NO_ANSWER", "BUSY", "FAILED"].includes(gs.status) && "border-red-200 bg-red-50/30 dark:border-red-700 dark:bg-red-500/10",
                        !["CALLING", "COMPLETED", "NO_ANSWER", "BUSY", "FAILED"].includes(gs.status) && "border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full",
                          gs.status === "CALLING" ? "bg-brand-100 dark:bg-brand-500/20" : "bg-gray-100 dark:bg-gray-800"
                        )}>
                          {gs.status === "CALLING" ? (
                            <Icons.phone className="h-4 w-4 text-brand-600 dark:text-brand-400 animate-pulse" />
                          ) : gs.status === "COMPLETED" ? (
                            <Icons.check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : ["NO_ANSWER", "BUSY", "FAILED"].includes(gs.status) ? (
                            <Icons.x className="h-4 w-4 text-red-500" />
                          ) : (
                            <Icons.user className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {gs.guestName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {gs.phoneNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge size="sm" color={rsvpColor}>
                          {tStatus(gs.rsvpStatus?.toLowerCase() as "pending" | "accepted" | "declined" || "pending")}
                        </Badge>
                        {hasStarted && (
                          <Badge size="sm" color={statusConfig.color}>
                            {gs.status === "CALLING" && (
                              <Icons.spinner className="h-3 w-3 animate-spin me-1" />
                            )}
                            {t(`status.${statusConfig.label}`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}

                {guestsWithPhone.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Icons.phone className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("noGuestsWithPhone")}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isStarting}
          >
            {isComplete ? tc("close") : tc("cancel")}
          </Button>

          {!isComplete && (
            <Button
              onClick={handleStartCalls}
              disabled={isStarting || isCallActive || guestsWithPhone.length === 0}
              className="gap-2"
            >
              {isStarting || isCallActive ? (
                <>
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  {isCallActive ? t("calling") : t("starting")}
                </>
              ) : (
                <>
                  <Icons.phone className="h-4 w-4" />
                  {mode === "single" ? t("startCall") : t("startCalls")}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
