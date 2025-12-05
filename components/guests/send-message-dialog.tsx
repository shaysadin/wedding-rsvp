"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sendInvite, sendReminder, ChannelType } from "@/actions/notifications";
import { getAvailableChannels } from "@/actions/messaging-settings";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestIds: string[];
  guestNames?: string[];
  eventId: string;
  mode: "single" | "bulk";
}

type MessageType = "INVITE" | "REMINDER";

const MESSAGE_TYPES: { value: MessageType; labelKey: string; icon: keyof typeof Icons; descriptionKey: string }[] = [
  {
    value: "INVITE",
    labelKey: "invitation",
    icon: "mail",
    descriptionKey: "invitationDescription",
  },
  {
    value: "REMINDER",
    labelKey: "reminder",
    icon: "bell",
    descriptionKey: "reminderDescription",
  },
];

const CHANNELS: { value: ChannelType; labelKey: string; icon: keyof typeof Icons }[] = [
  {
    value: "WHATSAPP",
    labelKey: "whatsapp",
    icon: "messageCircle",
  },
  {
    value: "SMS",
    labelKey: "sms",
    icon: "phone",
  },
];

interface ChannelStatus {
  whatsapp: { enabled: boolean; configured: boolean };
  sms: { enabled: boolean; configured: boolean };
}

export function SendMessageDialog({
  open,
  onOpenChange,
  guestIds,
  guestNames,
  eventId,
  mode,
}: SendMessageDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [messageType, setMessageType] = useState<MessageType>("INVITE");
  const [channel, setChannel] = useState<ChannelType>("SMS");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Fetch available channels when dialog opens
  useEffect(() => {
    if (open) {
      setProgress(0);
      setResults(null);
      setSending(false);
      setLoadingChannels(true);

      getAvailableChannels().then((result) => {
        if (result.success && result.channels) {
          setChannelStatus(result.channels);
          // Auto-select first enabled channel
          if (result.channels.sms.enabled) {
            setChannel("SMS");
          } else if (result.channels.whatsapp.enabled) {
            setChannel("WHATSAPP");
          }
        }
        setLoadingChannels(false);
      });
    }
  }, [open]);

  const handleSend = async () => {
    setSending(true);
    setProgress(0);
    setResults(null);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const total = guestIds.length;

    for (let i = 0; i < guestIds.length; i++) {
      const guestId = guestIds[i];

      try {
        let result;
        if (messageType === "INVITE") {
          result = await sendInvite(guestId, channel);
        } else {
          result = await sendReminder(guestId, channel);
        }

        if (result.error) {
          failedCount++;
          if (!errors.includes(result.error)) {
            errors.push(result.error);
          }
        } else {
          successCount++;
        }
      } catch (error) {
        failedCount++;
        errors.push("Unexpected error");
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setResults({ success: successCount, failed: failedCount, errors });
    setSending(false);

    if (successCount > 0 && failedCount === 0) {
      toast.success(t("messageSentSuccess", { count: successCount }));
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(t("messageSentPartial", { success: successCount, failed: failedCount }));
    } else {
      toast.error(t("messageSentFailed"));
    }
  };

  const handleClose = () => {
    if (!sending) {
      onOpenChange(false);
    }
  };

  const noChannelsAvailable = channelStatus && !channelStatus.whatsapp.enabled && !channelStatus.sms.enabled;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.messageSquare className="h-5 w-5" />
            {mode === "single" ? t("sendMessage") : t("sendBulkMessage")}
          </DialogTitle>
          <DialogDescription>
            {mode === "single" && guestNames?.[0]
              ? t("sendMessageTo", { name: guestNames[0] })
              : t("sendMessageToSelected", { count: guestIds.length })}
          </DialogDescription>
        </DialogHeader>

        {loadingChannels ? (
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-6 w-6 animate-spin" />
          </div>
        ) : noChannelsAvailable ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Icons.warning className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold">{t("noChannelsAvailable")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("contactAdminForChannels")}
            </p>
            <DialogFooter className="mt-6">
              <Button onClick={handleClose}>{tc("close")}</Button>
            </DialogFooter>
          </div>
        ) : !results ? (
          <>
            <div className="space-y-4 py-4">
              {/* Channel Selection */}
              <div className="space-y-3">
                <Label>{t("sendVia")}</Label>
                <div className="flex gap-2">
                  {CHANNELS.map((ch) => {
                    const IconComponent = Icons[ch.icon];
                    const isEnabled = ch.value === "WHATSAPP"
                      ? channelStatus?.whatsapp.enabled
                      : channelStatus?.sms.enabled;
                    const isSelected = channel === ch.value;

                    return (
                      <button
                        key={ch.value}
                        type="button"
                        onClick={() => isEnabled && setChannel(ch.value)}
                        disabled={!isEnabled || sending}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition-colors ${
                          isSelected && isEnabled
                            ? "border-primary bg-primary/5"
                            : isEnabled
                            ? "border-border hover:border-primary/50 hover:bg-muted/50"
                            : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="font-medium">{tn(ch.labelKey as "whatsapp" | "sms")}</span>
                        {!isEnabled && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {t("offline")}
                          </Badge>
                        )}
                        {isSelected && isEnabled && (
                          <Icons.check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Type Selection */}
              <div className="space-y-3">
                <Label>{t("messageType")}</Label>
                <div className="grid gap-3">
                  {MESSAGE_TYPES.map((type) => {
                    const IconComponent = Icons[type.icon];
                    const isSelected = messageType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setMessageType(type.value)}
                        className={`flex items-start gap-4 rounded-lg border p-4 text-start transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        disabled={sending}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t(type.labelKey as "invitation" | "reminder")}
                            </span>
                            {isSelected && (
                              <Icons.check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t(type.descriptionKey as "invitationDescription" | "reminderDescription")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipients Summary */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("recipients")}</span>
                  <Badge variant="secondary">{guestIds.length}</Badge>
                </div>
                {mode === "single" && guestNames?.[0] && (
                  <p className="mt-1 text-sm text-muted-foreground">{guestNames[0]}</p>
                )}
              </div>

              {/* Progress Bar (when sending) */}
              {sending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t("sending")}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <Icons.send className="mr-2 h-4 w-4" />
                    {t("send")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results View */}
            <div className="py-6 text-center">
              {results.failed === 0 ? (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <Icons.check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              ) : results.success === 0 ? (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <Icons.close className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <Icons.warning className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              )}

              <h3 className="text-lg font-semibold">
                {results.failed === 0
                  ? t("allMessagesSent")
                  : results.success === 0
                  ? t("sendingFailed")
                  : t("partiallySent")}
              </h3>

              <div className="mt-4 flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{results.success}</p>
                  <p className="text-sm text-muted-foreground">{t("sent")}</p>
                </div>
                {results.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                    <p className="text-sm text-muted-foreground">{t("failed")}</p>
                  </div>
                )}
              </div>

              {/* Show errors if any */}
              {results.errors.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-start dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{t("errorDetails")}:</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-red-700 dark:text-red-300">
                    {results.errors.slice(0, 3).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {results.errors.length > 3 && (
                      <li>{t("andMoreErrors", { count: results.errors.length - 3 })}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>{tc("close")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
