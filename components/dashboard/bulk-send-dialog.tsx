"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationType, NotificationChannel, BulkJobStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";

interface BulkSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  messageType: NotificationType;
  eligibleCount: number;
  totalGuests: number;
  smsSenderId?: string | null;
  onComplete?: () => void;
}

interface JobStatus {
  status: BulkJobStatus;
  totalGuests: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

type DialogState = "confirm" | "processing" | "completed" | "error";

export function BulkSendDialog({
  open,
  onOpenChange,
  eventId,
  messageType,
  eligibleCount,
  totalGuests,
  smsSenderId,
  onComplete,
}: BulkSendDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>("confirm");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel>(NotificationChannel.WHATSAPP);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDialogState("confirm");
      setJobId(null);
      setJobStatus(null);
      setError(null);
      setIsStarting(false);
      setIsCancelling(false);
      setSelectedChannel(NotificationChannel.WHATSAPP);
    }
  }, [open]);

  // Poll for job status when processing
  const pollStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/bulk-messages/${jobId}/status`);
      const data = await response.json();

      if (data.success) {
        setJobStatus({
          status: data.status,
          totalGuests: data.totalGuests,
          processedCount: data.processedCount,
          successCount: data.successCount,
          failedCount: data.failedCount,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        });

        // Check if completed
        if (
          data.status === BulkJobStatus.COMPLETED ||
          data.status === BulkJobStatus.CANCELLED ||
          data.status === BulkJobStatus.FAILED
        ) {
          setDialogState("completed");
          return true; // Stop polling
        }

        // Continue processing if not complete
        if (
          data.status === BulkJobStatus.PROCESSING ||
          data.status === BulkJobStatus.PENDING
        ) {
          // Trigger next chunk
          await fetch(`/api/bulk-messages/${jobId}/continue`, {
            method: "POST",
          });
        }
      } else {
        setError(data.error || "Failed to get job status");
        setDialogState("error");
        return true; // Stop polling
      }
    } catch (err: any) {
      console.error("Error polling status:", err);
      setError(err.message || "Failed to get job status");
      setDialogState("error");
      return true; // Stop polling
    }

    return false; // Continue polling
  }, [jobId]);

  // Polling effect
  useEffect(() => {
    if (dialogState !== "processing" || !jobId) return;

    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      const shouldStop = await pollStatus();
      if (!shouldStop) {
        timeoutId = setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };

    poll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [dialogState, jobId, pollStatus]);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/bulk-messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          messageType,
          channel: selectedChannel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJobId(data.jobId);
        setJobStatus({
          status: BulkJobStatus.PENDING,
          totalGuests: data.totalGuests,
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
          startedAt: null,
          completedAt: null,
        });
        setDialogState("processing");
      } else {
        setError(data.error || "Failed to start bulk job");
        setDialogState("error");
      }
    } catch (err: any) {
      console.error("Error starting bulk job:", err);
      setError(err.message || "Failed to start bulk job");
      setDialogState("error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;

    setIsCancelling(true);

    try {
      const response = await fetch(`/api/bulk-messages/${jobId}/cancel`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        // Status will be updated by the next poll
      } else {
        setError(data.error || "Failed to cancel job");
      }
    } catch (err: any) {
      console.error("Error cancelling job:", err);
      setError(err.message || "Failed to cancel job");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    if (dialogState === "completed") {
      onComplete?.();
    }
    onOpenChange(false);
  };

  const progressPercentage = jobStatus
    ? Math.round((jobStatus.processedCount / jobStatus.totalGuests) * 100)
    : 0;

  const messageTypeLabel =
    messageType === NotificationType.INVITE ? "Invitations" : "Reminders";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Confirm State */}
        {dialogState === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Send {messageTypeLabel} to All Guests</DialogTitle>
              <DialogDescription>
                This will send {messageType.toLowerCase()} messages to all
                eligible guests.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Channel Selection */}
              <div className="space-y-2">
                <Label>Send via</Label>
                <Select
                  value={selectedChannel}
                  onValueChange={(value) => setSelectedChannel(value as NotificationChannel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NotificationChannel.WHATSAPP}>
                      <div className="flex items-center gap-2">
                        <Icons.messageCircle className="h-4 w-4 text-green-600" />
                        <span>WhatsApp</span>
                        <span className="text-xs text-muted-foreground">(~$0.005/msg)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={NotificationChannel.SMS}>
                      <div className="flex items-center gap-2">
                        <Icons.phone className="h-4 w-4 text-blue-600" />
                        <span>SMS</span>
                        <span className="text-xs text-muted-foreground">(~$0.26/msg)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedChannel === NotificationChannel.SMS && smsSenderId && (
                  <p className="text-xs text-muted-foreground">
                    Sender ID: <Badge variant="secondary" className="text-xs">{smsSenderId}</Badge>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{totalGuests}</p>
                  <p className="text-sm text-muted-foreground">Total Guests</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {eligibleCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Eligible to Send
                  </p>
                </div>
              </div>

              {totalGuests - eligibleCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  <Icons.info className="mr-1 inline h-4 w-4" />
                  {totalGuests - eligibleCount} guest(s) will be skipped (no
                  phone number or already sent)
                </p>
              )}

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <Icons.warning className="mr-1 inline h-4 w-4" />
                  Estimated time: ~{Math.ceil(eligibleCount / 60)} minute(s)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={isStarting || eligibleCount === 0}>
                {isStarting ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Icons.send className="me-2 h-4 w-4" />
                    Start Sending
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Processing State */}
        {dialogState === "processing" && jobStatus && (
          <>
            <DialogHeader>
              <DialogTitle>Sending {messageTypeLabel}...</DialogTitle>
              <DialogDescription>
                Please keep this window open while messages are being sent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {jobStatus.processedCount} / {jobStatus.totalGuests}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-center text-sm text-muted-foreground">
                  {progressPercentage}% complete
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                  <p className="text-xl font-bold text-green-600">
                    {jobStatus.successCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                  <p className="text-xl font-bold text-red-600">
                    {jobStatus.failedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xl font-bold">
                    {jobStatus.totalGuests - jobStatus.processedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">
                  <Icons.warning className="mr-1 inline h-4 w-4" />
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Icons.close className="me-2 h-4 w-4" />
                    Cancel
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Completed State */}
        {dialogState === "completed" && jobStatus && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {jobStatus.status === BulkJobStatus.COMPLETED ? (
                  <>
                    <Icons.checkCircle className="h-5 w-5 text-green-600" />
                    Bulk Send Complete!
                  </>
                ) : jobStatus.status === BulkJobStatus.CANCELLED ? (
                  <>
                    <Icons.close className="h-5 w-5 text-yellow-600" />
                    Bulk Send Cancelled
                  </>
                ) : (
                  <>
                    <Icons.warning className="h-5 w-5 text-red-600" />
                    Bulk Send Failed
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
                  <p className="text-2xl font-bold text-green-600">
                    {jobStatus.successCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sent Successfully
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
                  <p className="text-2xl font-bold text-red-600">
                    {jobStatus.failedCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-2xl font-bold">
                    {jobStatus.totalGuests -
                      jobStatus.successCount -
                      jobStatus.failedCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Badge
                  variant={
                    jobStatus.status === BulkJobStatus.COMPLETED
                      ? "default"
                      : jobStatus.status === BulkJobStatus.CANCELLED
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {jobStatus.status}
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}

        {/* Error State */}
        {dialogState === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Icons.warning className="h-5 w-5" />
                Error
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {error || "An unexpected error occurred"}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setDialogState("confirm")}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
