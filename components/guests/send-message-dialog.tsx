"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUpRight } from "lucide-react";

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
import { sendInvite, sendReminder, sendInteractiveInvite, sendInteractiveReminder, ChannelType, getCurrentUserUsage } from "@/actions/notifications";
import { sendBulkMessages } from "@/actions/bulk-notifications";
import { getAvailableChannels } from "@/actions/messaging-settings";
import { Checkbox } from "@/components/ui/checkbox";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestIds: string[];
  guestNames?: string[];
  guestStatuses?: ("PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE")[];
  eventId: string;
  mode: "single" | "bulk";
  invitationImageUrl?: string | null; // For interactive messages with image
}

type MessageType = "INVITE" | "REMINDER";
type MessageFormat = "STANDARD" | "INTERACTIVE";

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

interface UsageStatus {
  canSendMessages: boolean;
  whatsappRemaining: number;
  smsRemaining: number;
}

export function SendMessageDialog({
  open,
  onOpenChange,
  guestIds,
  guestNames,
  guestStatuses,
  eventId,
  mode,
  invitationImageUrl,
}: SendMessageDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const locale = useLocale();
  const isRTL = locale === "he";
  const [messageType, setMessageType] = useState<MessageType>("INVITE");
  const [messageFormat, setMessageFormat] = useState<MessageFormat>("STANDARD");
  const [channel, setChannel] = useState<ChannelType>("WHATSAPP");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Check if interactive buttons are configured (WhatsApp only)
  const hasInvitationImage = !!invitationImageUrl;
  const [includeImage, setIncludeImage] = useState(hasInvitationImage);

  // Count guests who already accepted
  const acceptedGuestsCount = guestStatuses?.filter(s => s === "ACCEPTED").length || 0;
  const hasAcceptedGuests = acceptedGuestsCount > 0;

  // Fetch available channels and user usage when dialog opens
  useEffect(() => {
    if (open) {
      setProgress(0);
      setResults(null);
      setSending(false);
      setLoadingChannels(true);
      setShowConfirmation(false);
      setMessageFormat("STANDARD");
      setIncludeImage(hasInvitationImage);

      // Fetch channels and usage in parallel
      Promise.all([
        getAvailableChannels(),
        getCurrentUserUsage()
      ]).then(([channelsResult, usageResult]) => {
        let channels: ChannelStatus | null = null;
        let usage: UsageStatus | null = null;

        if (channelsResult.success && channelsResult.channels) {
          channels = channelsResult.channels;
          setChannelStatus(channels);
        }

        if (usageResult.success) {
          usage = {
            canSendMessages: usageResult.canSendMessages,
            whatsappRemaining: usageResult.usage.whatsapp.remaining,
            smsRemaining: usageResult.usage.sms.remaining,
          };
          setUsageStatus(usage);
        }

        // Auto-select first channel that is both enabled AND has quota (prefer WhatsApp)
        if (channels && usage) {
          const smsAvailable = channels.sms.enabled && usage.smsRemaining > 0;
          const whatsappAvailable = channels.whatsapp.enabled && usage.whatsappRemaining > 0;

          if (whatsappAvailable) {
            setChannel("WHATSAPP");
          } else if (smsAvailable) {
            setChannel("SMS");
          }
        }

        setLoadingChannels(false);
      });
    }
  }, [open, hasInvitationImage]);

  const handleSendClick = () => {
    // If there are accepted guests, show confirmation first
    if (hasAcceptedGuests && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    // Otherwise proceed to send
    executeSend();
  };

  const executeSend = async () => {
    setSending(true);
    setProgress(0);
    setResults(null);
    setShowConfirmation(false);

    const total = guestIds.length;

    // Use bulk messaging for multiple guests (optimized for 20-800+ messages)
    if (guestIds.length > 1) {
      try {
        // Show initial progress
        setProgress(10);

        const result = await sendBulkMessages({
          eventId,
          guestIds,
          messageType,
          messageFormat,
          channel,
          includeImage,
        });

        setProgress(100);

        if (result.error && result.sent === 0) {
          setResults({ success: 0, failed: total, errors: result.errors || [result.error] });
          toast.error(t("messageSentFailed"));
        } else {
          setResults({
            success: result.sent,
            failed: result.failed + result.skippedLimit,
            errors: result.errors,
          });

          if (result.sent > 0 && result.failed === 0 && result.skippedLimit === 0) {
            toast.success(t("messageSentSuccess", { count: result.sent }));
          } else if (result.sent > 0) {
            toast.warning(t("messageSentPartial", { success: result.sent, failed: result.failed + result.skippedLimit }));
          } else {
            toast.error(t("messageSentFailed"));
          }
        }
      } catch (error) {
        setProgress(100);
        setResults({ success: 0, failed: total, errors: ["Unexpected error occurred"] });
        toast.error(t("messageSentFailed"));
      }
    } else {
      // Single guest - use direct messaging for immediate feedback
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      try {
        let result;
        const guestId = guestIds[0];

        if (messageFormat === "INTERACTIVE") {
          // Interactive button messages (WhatsApp only)
          if (messageType === "INVITE") {
            result = await sendInteractiveInvite(guestId, includeImage);
          } else {
            result = await sendInteractiveReminder(guestId, includeImage);
          }
        } else {
          // Standard messages with RSVP link
          if (messageType === "INVITE") {
            result = await sendInvite(guestId, channel);
          } else {
            result = await sendReminder(guestId, channel);
          }
        }

        if (result.error) {
          failedCount++;
          errors.push(result.error);
        } else {
          successCount++;
        }
      } catch (error) {
        failedCount++;
        errors.push("Unexpected error");
      }

      setProgress(100);
      setResults({ success: successCount, failed: failedCount, errors });

      if (successCount > 0) {
        toast.success(t("messageSentSuccess", { count: successCount }));
      } else {
        toast.error(t("messageSentFailed"));
      }
    }

    setSending(false);
  };

  const handleClose = () => {
    if (!sending) {
      onOpenChange(false);
    }
  };

  const noChannelsAvailable = channelStatus && !channelStatus.whatsapp.enabled && !channelStatus.sms.enabled;
  const noQuotaAvailable = usageStatus && !usageStatus.canSendMessages;

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
        ) : noQuotaAvailable ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <ArrowUpRight className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">
              {isRTL ? "שדרג כדי לשלוח הודעות" : "Upgrade to Send Messages"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
              {isRTL
                ? "התוכנית החינמית שלך לא כוללת הודעות. שדרג לתוכנית בתשלום כדי להתחיל לשלוח הזמנות ותזכורות לאורחים."
                : "Your free plan doesn't include messages. Upgrade to a paid plan to start sending invitations and reminders to your guests."}
            </p>
            <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose}>
                {tc("cancel")}
              </Button>
              <Button asChild>
                <Link href={`/${locale}/dashboard/billing`} className="gap-1">
                  {isRTL ? "שדרג עכשיו" : "Upgrade Now"}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </DialogFooter>
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
                    const isChannelEnabled = ch.value === "WHATSAPP"
                      ? channelStatus?.whatsapp.enabled
                      : channelStatus?.sms.enabled;
                    const remainingQuota = ch.value === "WHATSAPP"
                      ? usageStatus?.whatsappRemaining ?? 0
                      : usageStatus?.smsRemaining ?? 0;
                    const hasQuota = remainingQuota > 0;
                    const isEnabled = isChannelEnabled && hasQuota;
                    const isSelected = channel === ch.value;
                    const noQuotaLabel = isRTL ? "אזלה המכסה" : "No quota";

                    return (
                      <button
                        key={ch.value}
                        type="button"
                        onClick={() => isEnabled && setChannel(ch.value)}
                        disabled={!isEnabled || sending}
                        className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-colors ${
                          isSelected && isEnabled
                            ? "border-primary bg-primary/5"
                            : isEnabled
                            ? "border-border hover:border-primary/50 hover:bg-muted/50"
                            : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span className="font-medium">{tn(ch.labelKey as "whatsapp" | "sms")}</span>
                          {!isChannelEnabled && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {t("offline")}
                            </Badge>
                          )}
                          {isChannelEnabled && !hasQuota && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {noQuotaLabel}
                            </Badge>
                          )}
                          {isSelected && isEnabled && (
                            <Icons.check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {isChannelEnabled && (
                          <span className={`text-xs ${hasQuota ? 'text-muted-foreground' : 'text-destructive'}`}>
                            {remainingQuota} {isRTL ? 'נותרו' : 'remaining'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Format Selection (Standard vs Interactive) - WhatsApp only */}
              {channel === "WHATSAPP" && channelStatus?.whatsapp.enabled && (
                <div className="space-y-3">
                  <Label>{isRTL ? "פורמט הודעה" : "Message Format"}</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMessageFormat("STANDARD")}
                      disabled={sending}
                      className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-colors ${
                        messageFormat === "STANDARD"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icons.externalLink className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {isRTL ? "סטנדרטי (קישור)" : "Standard (Link)"}
                        </span>
                        {messageFormat === "STANDARD" && (
                          <Icons.check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isRTL ? "עם קישור לדף אישור הגעה" : "With RSVP page link"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageFormat("INTERACTIVE");
                        // Force WhatsApp channel for interactive
                        setChannel("WHATSAPP");
                      }}
                      disabled={sending}
                      className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-colors ${
                        messageFormat === "INTERACTIVE"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-border hover:border-purple-500/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icons.messageSquare className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-sm">
                          {isRTL ? "כפתורים אינטראקטיביים" : "Interactive Buttons"}
                        </span>
                        {messageFormat === "INTERACTIVE" && (
                          <Icons.check className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isRTL ? "אישור ישיר בלחיצה" : "Direct RSVP via buttons"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive Options - Show when format is Interactive */}
              {messageFormat === "INTERACTIVE" && (
                <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icons.messageSquare className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      {isRTL ? "אפשרויות הודעה אינטראקטיבית" : "Interactive Message Options"}
                    </span>
                  </div>

                  {/* Include Image Checkbox */}
                  {hasInvitationImage && (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id="include-image"
                        checked={includeImage}
                        onCheckedChange={(checked) => setIncludeImage(checked === true)}
                        disabled={sending}
                      />
                      <Label
                        htmlFor="include-image"
                        className="text-sm font-normal cursor-pointer"
                      >
                        {isRTL ? "כלול תמונת הזמנה" : "Include invitation image"}
                      </Label>
                    </div>
                  )}

                  {/* Button Preview */}
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">
                      {isRTL ? "תצוגה מקדימה של כפתורים:" : "Button preview:"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                        {isRTL ? "כן, אגיע" : "Yes, I'll attend"}
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                        {isRTL ? "לא אגיע" : "No, I won't attend"}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-300">
                        {isRTL ? "עדיין לא יודע/ת" : "Don't know yet"}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    {isRTL
                      ? "* לאחר אישור הגעה, האורח יקבל בקשה לבחור כמה אורחים"
                      : "* After accepting, guest will receive a request to select guest count"}
                  </p>
                </div>
              )}

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
                    <span>
                      {guestIds.length > 1
                        ? (progress < 100 ? (isRTL ? "מעבד..." : "Processing...") : `${progress}%`)
                        : `${progress}%`
                      }
                    </span>
                  </div>
                  <Progress value={progress} className={`h-2 ${progress < 100 && guestIds.length > 1 ? "animate-pulse" : ""}`} />
                  {guestIds.length > 10 && progress < 100 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {isRTL
                        ? `שולח ${guestIds.length} הודעות באצווה...`
                        : `Sending ${guestIds.length} messages in batches...`
                      }
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirmation for accepted guests */}
            {showConfirmation && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
                <div className="flex items-start gap-3">
                  <Icons.warning className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {isRTL
                        ? `${acceptedGuestsCount} ${acceptedGuestsCount === 1 ? "אורח כבר אישר" : "אורחים כבר אישרו"} הגעה`
                        : `${acceptedGuestsCount} ${acceptedGuestsCount === 1 ? "guest has" : "guests have"} already accepted`}
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {isRTL
                        ? "האם בכל זאת לשלוח להם את ההודעה?"
                        : "Do you still want to send them a message?"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleSendClick} disabled={sending}>
                {sending ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : showConfirmation ? (
                  <>
                    <Icons.check className="mr-2 h-4 w-4" />
                    {isRTL ? "שלח בכל זאת" : "Send Anyway"}
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
