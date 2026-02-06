"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUpRight, MessageCircle, Phone, Sparkles, Zap, ExternalLink, Image as ImageIcon, ImagePlus, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { sendInvite, sendReminder, sendEventDayReminder, sendInteractiveInvite, sendInteractiveReminder, ChannelType, getCurrentUserUsage } from "@/actions/notifications";
import { sendBulkMessages } from "@/actions/bulk-notifications";
import { getAvailableChannels } from "@/actions/messaging-settings";
import { MessagePreview } from "./message-preview";
import {
  getWhatsAppTemplateDefinitions,
  type WhatsAppTemplateType,
  type WhatsAppTemplateDefinition,
} from "@/config/whatsapp-templates";
import { getActiveWhatsAppTemplates } from "@/actions/whatsapp-templates";
import {
  getSmsTemplates,
  renderSmsTemplate,
  SMS_MAX_LENGTH,
  type SmsTemplate,
} from "@/config/sms-templates";
import { getEventSmsTemplatesByType } from "@/actions/sms-templates";
import { getSmsStyleDescription, type SmsTemplateType as EventSmsTemplateType } from "@/config/sms-template-presets";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestIds: string[];
  guestNames?: string[];
  guestStatuses?: ("PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE")[];
  eventId: string;
  mode: "single" | "bulk";
  invitationImageUrl?: string | null;
}

type MessageType = "INVITE" | "REMINDER" | "EVENT_DAY" | "THANK_YOU";
type MessageFormat = "STANDARD" | "INTERACTIVE";

interface ChannelStatus {
  whatsapp: { enabled: boolean; configured: boolean };
  sms: { enabled: boolean; configured: boolean };
}

interface UsageStatus {
  canSendMessages: boolean;
  whatsappRemaining: number;
  smsRemaining: number;
}

interface ActiveTemplate {
  id: string;
  style: string;
  contentSid: string | null;
  nameHe: string;
  nameEn: string;
  templateText: string | null;
  previewText: string | null;
  previewTextHe: string | null;
}

const INTERACTIVE_BUTTONS = {
  he: [
    { text: "כן, אגיע", variant: "accept" as const },
    { text: "לא אגיע", variant: "decline" as const },
    { text: "עדיין לא יודע/ת", variant: "maybe" as const },
  ],
  en: [
    { text: "Yes, I'll attend", variant: "accept" as const },
    { text: "No, I won't attend", variant: "decline" as const },
    { text: "Don't know yet", variant: "maybe" as const },
  ],
};

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

  // State
  const [channel, setChannel] = useState<ChannelType>("WHATSAPP");
  const [messageType, setMessageType] = useState<MessageType>("INVITE");
  const [messageFormat, setMessageFormat] = useState<MessageFormat>("STANDARD");
  const [includeImage, setIncludeImage] = useState(!!invitationImageUrl);

  // WhatsApp template state - use a Map to cache templates by type
  const [whatsappTemplatesCache, setWhatsappTemplatesCache] = useState<Map<WhatsAppTemplateType, ActiveTemplate[]>>(new Map());
  const [selectedWhatsappStyle, setSelectedWhatsappStyle] = useState<string>("formal");
  const [whatsappContentSid, setWhatsappContentSid] = useState<string | null>(null);
  const [loadingWhatsappTemplates, setLoadingWhatsappTemplates] = useState(false);

  // SMS template state
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [eventSmsTemplates, setEventSmsTemplates] = useState<any[]>([]);
  const [selectedSmsTemplateId, setSelectedSmsTemplateId] = useState<string | null>(null);
  const [selectedEventSmsTemplateId, setSelectedEventSmsTemplateId] = useState<string | null>(null);
  const [isCustomSms, setIsCustomSms] = useState(false);
  const [customSmsMessage, setCustomSmsMessage] = useState("");
  const [smsTemplate, setSmsTemplate] = useState<string>("");

  // Channel & usage state
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Sending state
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const hasInvitationImage = !!invitationImageUrl;
  const acceptedGuestsCount = guestStatuses?.filter(s => s === "ACCEPTED").length || 0;
  const hasAcceptedGuests = acceptedGuestsCount > 0;

  // Get WhatsApp template type based on message type and format
  const whatsappTemplateType: WhatsAppTemplateType = useMemo(() => {
    if (messageType === "EVENT_DAY") {
      return "EVENT_DAY";
    }
    if (messageType === "THANK_YOU") {
      return "THANK_YOU" as WhatsAppTemplateType;
    }
    if (messageFormat === "INTERACTIVE") {
      return messageType === "INVITE" ? "INTERACTIVE_INVITE" : "INTERACTIVE_REMINDER";
    }
    return messageType === "INVITE" ? "INVITE" : "REMINDER";
  }, [messageType, messageFormat]);

  // Get current templates from cache (must be after whatsappTemplateType is defined)
  const whatsappTemplates = whatsappTemplatesCache.get(whatsappTemplateType) || [];

  // Preview context - 10-variable system
  const previewContext = {
    guestName: mode === "single" && guestNames?.[0] ? guestNames[0] : (isRTL ? "דני ושרה" : "Guest Name"),
    eventTitle: isRTL ? "חתונת דני ושרה" : "Event Name",
    venueName: isRTL ? "אולם מאגיה" : "Venue Name",
    venueAddress: isRTL ? "רחוב החשמל 5, טבריה" : "Street 5, City",
    eventDate: isRTL ? "יום שישי, 15 במרץ 2026" : "Friday, March 15, 2026",
    eventTime: isRTL ? "20:00" : "8:00 PM",
    rsvpLink: "https://wedinex.co/r/sample",
    tableNumber: isRTL ? "12" : "12",
    transportationLink: "https://wedinex.co/t/sample",
    mediaUrl: "demo/image/upload/sample.jpg", // {{10}} - Cloudinary path for WhatsApp Card templates
    // Legacy mappings for SMS templates (keep for backward compatibility)
    dynamicLink: "https://wedinex.co/r/sample",  // Deprecated, use rsvpLink
    eventVenue: isRTL ? "מאגיה, רחוב החשמל 5, טבריה" : "Venue Name, Street 5, City",
    tableName: isRTL ? "שולחן 12" : "Table 12",
    navigationUrl: "https://waze.com/ul?q=...",
    giftLink: "https://...",
  };

  // Get template definitions for WhatsApp
  const whatsappTemplateDefinitions = useMemo(
    () => getWhatsAppTemplateDefinitions(whatsappTemplateType),
    [whatsappTemplateType]
  );

  // Fetch channels and usage on open
  useEffect(() => {
    if (open) {
      setProgress(0);
      setResults(null);
      setSending(false);
      setLoadingChannels(true);
      setShowConfirmation(false);
      // Default to INTERACTIVE for INVITE and REMINDER, STANDARD for EVENT_DAY
      setMessageFormat(messageType === "EVENT_DAY" ? "STANDARD" : "INTERACTIVE");
      setIncludeImage(hasInvitationImage);
      setIsCustomSms(false);
      setCustomSmsMessage("");

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

        // Auto-select first available channel
        if (channels && usage) {
          const whatsappAvailable = channels.whatsapp.enabled && usage.whatsappRemaining > 0;
          const smsAvailable = channels.sms.enabled && usage.smsRemaining > 0;

          if (whatsappAvailable) {
            setChannel("WHATSAPP");
          } else if (smsAvailable) {
            setChannel("SMS");
          }
        }

        setLoadingChannels(false);
      });

      // Load SMS templates (config + event-specific)
      // Note: THANK_YOU type doesn't have config templates, only event-specific ones
      const smsTemplatesList = messageType === "THANK_YOU" ? [] : getSmsTemplates(messageType);
      setSmsTemplates(smsTemplatesList);

      // Load event-specific SMS templates
      const eventSmsType: EventSmsTemplateType =
        messageType === "INVITE" ? "INVITE" :
        messageType === "REMINDER" ? "REMINDER" :
        messageType === "EVENT_DAY" ? "EVENT_DAY" : "THANK_YOU";

      getEventSmsTemplatesByType(eventId, eventSmsType).then((result) => {
        if (result.success && result.templates) {
          setEventSmsTemplates(result.templates);
          // Auto-select first event template if available
          if (result.templates.length > 0) {
            const firstTemplate = result.templates[0];
            setSelectedEventSmsTemplateId(firstTemplate.id);
            setSmsTemplate(isRTL ? firstTemplate.messageBodyHe : (firstTemplate.messageBodyEn || firstTemplate.messageBodyHe));
            return;
          }
        }

        // Fallback to config templates
        if (smsTemplatesList.length > 0) {
          setSelectedSmsTemplateId(smsTemplatesList[0].id);
          setSmsTemplate(isRTL ? smsTemplatesList[0].messageHe : smsTemplatesList[0].messageEn);
        }
      });
    }
  }, [open, hasInvitationImage, messageType, isRTL, eventId]);

  // Fetch WhatsApp templates - only fetch once per template type (cached)
  useEffect(() => {
    if (!open || channel !== "WHATSAPP") return;

    // Check if we already have templates for this type in cache
    if (whatsappTemplatesCache.has(whatsappTemplateType)) {
      // Already loaded, just select first template if needed (NO LOADING STATE)
      const cachedTemplates = whatsappTemplatesCache.get(whatsappTemplateType)!;
      if (cachedTemplates.length > 0) {
        const firstTemplate = cachedTemplates[0];
        setSelectedWhatsappStyle(firstTemplate.style);
        setWhatsappContentSid(firstTemplate.contentSid);
      }
      return;
    }

    // Only show loading when actually fetching from API
    setLoadingWhatsappTemplates(true);

    getActiveWhatsAppTemplates(whatsappTemplateType).then((result) => {
      let templatesToCache: ActiveTemplate[] = [];

      if (result.success && result.templates && result.templates.length > 0) {
        templatesToCache = result.templates;
      } else {
        // Fallback to config templates
        const fallbackTemplates: ActiveTemplate[] = whatsappTemplateDefinitions
          .filter((def) => def.existingContentSid)
          .map((def) => ({
            id: `config-${def.style}`,
            style: def.style,
            contentSid: def.existingContentSid!,
            nameHe: def.nameHe,
            nameEn: def.nameEn,
            templateText: isRTL ? def.templateTextHe : def.templateTextEn,
            previewText: def.templateTextEn,
            previewTextHe: def.templateTextHe,
          }));

        templatesToCache = fallbackTemplates;
      }

      // Store in cache
      setWhatsappTemplatesCache(prev => new Map(prev).set(whatsappTemplateType, templatesToCache));

      // Auto-select first template
      if (templatesToCache.length > 0) {
        const firstTemplate = templatesToCache[0];
        setSelectedWhatsappStyle(firstTemplate.style);
        setWhatsappContentSid(firstTemplate.contentSid);
      } else {
        setWhatsappContentSid(null);
      }

      setLoadingWhatsappTemplates(false);
    }).catch(() => {
      setLoadingWhatsappTemplates(false);
    });
  }, [open, channel, whatsappTemplateType, whatsappTemplateDefinitions, isRTL, whatsappTemplatesCache]);

  // Reset cache when dialog closes
  useEffect(() => {
    if (!open) {
      setWhatsappTemplatesCache(new Map());
    }
  }, [open]);

  // Update SMS templates when message type changes
  useEffect(() => {
    if (channel === "SMS" && open) {
      const smsTemplatesList = messageType === "THANK_YOU" ? [] : getSmsTemplates(messageType);
      setSmsTemplates(smsTemplatesList);

      // Load event-specific SMS templates
      const eventSmsType: EventSmsTemplateType =
        messageType === "INVITE" ? "INVITE" :
        messageType === "REMINDER" ? "REMINDER" :
        messageType === "EVENT_DAY" ? "EVENT_DAY" : "THANK_YOU";

      getEventSmsTemplatesByType(eventId, eventSmsType).then((result) => {
        if (result.success && result.templates && result.templates.length > 0 && !isCustomSms) {
          setEventSmsTemplates(result.templates);
          const firstTemplate = result.templates[0];
          setSelectedEventSmsTemplateId(firstTemplate.id);
          setSelectedSmsTemplateId(null);
          setSmsTemplate(isRTL ? firstTemplate.messageBodyHe : (firstTemplate.messageBodyEn || firstTemplate.messageBodyHe));
        } else {
          setEventSmsTemplates([]);
          if (smsTemplatesList.length > 0 && !isCustomSms) {
            setSelectedSmsTemplateId(smsTemplatesList[0].id);
            setSelectedEventSmsTemplateId(null);
            setSmsTemplate(isRTL ? smsTemplatesList[0].messageHe : smsTemplatesList[0].messageEn);
          }
        }
      });
    }
  }, [channel, messageType, isRTL, isCustomSms, eventId, open]);

  // Auto-switch format when message type changes
  useEffect(() => {
    if (open && channel === "WHATSAPP") {
      // EVENT_DAY and THANK_YOU don't have interactive mode, use STANDARD
      // INVITE and REMINDER default to INTERACTIVE
      if (messageType === "EVENT_DAY" || messageType === "THANK_YOU") {
        setMessageFormat("STANDARD");
      } else if (messageFormat === "STANDARD" && (messageType === "INVITE" || messageType === "REMINDER")) {
        // If switching from EVENT_DAY/THANK_YOU back to INVITE/REMINDER, switch to INTERACTIVE
        setMessageFormat("INTERACTIVE");
      }
    }
  }, [messageType, open, channel]);

  // Get preview message content
  const getPreviewMessage = (): string => {
    if (channel === "WHATSAPP") {
      // First try to get preview text from database (admin-configured)
      const activeTemplate = whatsappTemplates.find((t) => t.style === selectedWhatsappStyle);
      if (activeTemplate) {
        const dbPreviewText = isRTL ? activeTemplate.previewTextHe : activeTemplate.previewText;
        if (dbPreviewText) {
          // New 10-variable system - universal mapping
          return dbPreviewText
            .replace(/\{\{1\}\}/g, previewContext.guestName)
            .replace(/\{\{2\}\}/g, previewContext.eventTitle)
            .replace(/\{\{3\}\}/g, previewContext.venueName)
            .replace(/\{\{4\}\}/g, previewContext.venueAddress)
            .replace(/\{\{5\}\}/g, previewContext.eventDate)
            .replace(/\{\{6\}\}/g, previewContext.eventTime)
            .replace(/\{\{7\}\}/g, previewContext.rsvpLink)
            .replace(/\{\{8\}\}/g, previewContext.tableNumber)
            .replace(/\{\{9\}\}/g, previewContext.transportationLink)
            .replace(/\{\{10\}\}/g, previewContext.mediaUrl);
        }
      }

      // Fallback to template definitions from config file
      const definition = whatsappTemplateDefinitions.find((d) => d.style === selectedWhatsappStyle);
      if (definition) {
        const text = isRTL ? definition.templateTextHe : definition.templateTextEn;
        // New 10-variable system - universal mapping
        return text
          .replace(/\{\{1\}\}/g, previewContext.guestName)
          .replace(/\{\{2\}\}/g, previewContext.eventTitle)
          .replace(/\{\{3\}\}/g, previewContext.venueName)
          .replace(/\{\{4\}\}/g, previewContext.venueAddress)
          .replace(/\{\{5\}\}/g, previewContext.eventDate)
          .replace(/\{\{6\}\}/g, previewContext.eventTime)
          .replace(/\{\{7\}\}/g, previewContext.rsvpLink)
          .replace(/\{\{8\}\}/g, previewContext.tableNumber)
          .replace(/\{\{9\}\}/g, previewContext.transportationLink)
          .replace(/\{\{10\}\}/g, previewContext.mediaUrl);
      }
      return isRTL ? "תצוגה מקדימה לא זמינה" : "Preview not available";
    } else {
      // SMS - uses legacy variable names for backward compatibility
      if (isCustomSms) {
        return renderSmsTemplate(customSmsMessage || "", previewContext);
      }

      // Check event-specific templates first
      if (selectedEventSmsTemplateId) {
        const eventTemplate = eventSmsTemplates.find((t) => t.id === selectedEventSmsTemplateId);
        if (eventTemplate) {
          const msg = isRTL ? eventTemplate.messageBodyHe : (eventTemplate.messageBodyEn || eventTemplate.messageBodyHe);
          // Use new 12-variable system for event templates
          return msg
            .replace(/\{\{1\}\}/g, previewContext.guestName)
            .replace(/\{\{2\}\}/g, previewContext.eventTitle)
            .replace(/\{\{3\}\}/g, previewContext.venueName)
            .replace(/\{\{4\}\}/g, previewContext.venueAddress)
            .replace(/\{\{5\}\}/g, previewContext.eventDate)
            .replace(/\{\{6\}\}/g, previewContext.eventTime)
            .replace(/\{\{7\}\}/g, previewContext.navigationUrl)
            .replace(/\{\{8\}\}/g, previewContext.tableNumber)
            .replace(/\{\{9\}\}/g, previewContext.transportationLink)
            .replace(/\{\{10\}\}/g, isRTL ? "צד א" : "Side A")
            .replace(/\{\{11\}\}/g, previewContext.rsvpLink)
            .replace(/\{\{12\}\}/g, previewContext.giftLink);
        }
      }

      // Fallback to config templates
      const template = smsTemplates.find((t) => t.id === selectedSmsTemplateId);
      if (template) {
        const msg = isRTL ? template.messageHe : template.messageEn;
        return renderSmsTemplate(msg, previewContext);
      }
      return "";
    }
  };

  // Handle template selection
  const handleWhatsappTemplateSelect = (template: ActiveTemplate) => {
    setSelectedWhatsappStyle(template.style);
    setWhatsappContentSid(template.contentSid);
  };

  const handleSmsTemplateSelect = (template: SmsTemplate) => {
    setSelectedSmsTemplateId(template.id);
    setIsCustomSms(false);
    const msg = isRTL ? template.messageHe : template.messageEn;
    setSmsTemplate(msg);
  };

  const handleCustomSmsChange = (value: string) => {
    const trimmed = value.slice(0, SMS_MAX_LENGTH);
    setCustomSmsMessage(trimmed);
    setSmsTemplate(trimmed);
  };

  // Send handlers
  const handleSendClick = () => {
    if (hasAcceptedGuests && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    executeSend();
  };

  const executeSend = async () => {
    setSending(true);
    setProgress(0);
    setResults(null);
    setShowConfirmation(false);

    const total = guestIds.length;

    if (guestIds.length > 1) {
      const estimatedDuration = Math.max(2000, total * 150);
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) {
            const increment = (90 - prev) * 0.1;
            return Math.min(90, prev + Math.max(1, increment));
          }
          return prev;
        });
      }, 100);

      try {
        const result = await sendBulkMessages({
          eventId,
          guestIds,
          messageType,
          messageFormat,
          channel,
          includeImage,
          smsTemplate: channel === "SMS" ? smsTemplate : undefined,
          whatsappContentSid: channel === "WHATSAPP" && whatsappContentSid ? whatsappContentSid : undefined,
        });

        clearInterval(progressInterval);
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
        clearInterval(progressInterval);
        setProgress(100);
        setResults({ success: 0, failed: total, errors: ["Unexpected error occurred"] });
        toast.error(t("messageSentFailed"));
      }
    } else {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      try {
        let result;
        const guestId = guestIds[0];

        if (messageType === "EVENT_DAY") {
          const customTemplate = channel === "SMS" ? smsTemplate : undefined;
          const templateSid = channel === "WHATSAPP" && whatsappContentSid ? whatsappContentSid : undefined;
          result = await sendEventDayReminder(guestId, channel, customTemplate, templateSid);
        } else if (messageFormat === "INTERACTIVE") {
          const templateSid = whatsappContentSid || undefined;
          if (messageType === "INVITE") {
            result = await sendInteractiveInvite(guestId, includeImage, templateSid);
          } else {
            result = await sendInteractiveReminder(guestId, includeImage, templateSid);
          }
        } else {
          const customTemplate = channel === "SMS" ? smsTemplate : undefined;
          const templateSid = channel === "WHATSAPP" && whatsappContentSid ? whatsappContentSid : undefined;
          if (messageType === "INVITE") {
            result = await sendInvite(guestId, channel, customTemplate, templateSid);
          } else {
            result = await sendReminder(guestId, channel, customTemplate, templateSid);
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

  const previewMessage = getPreviewMessage();
  const charCount = previewMessage.length;

  // Get style display name
  const getStyleName = (style: string): string => {
    const styleNames: Record<string, { en: string; he: string }> = {
      formal: { en: "Formal", he: "רשמי" },
      friendly: { en: "Friendly", he: "ידידותי" },
      short: { en: "Short", he: "קצר" },
    };
    return isRTL ? styleNames[style]?.he || style : styleNames[style]?.en || style;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl" className="overflow-hidden p-0 max-h-[90vh]">
        {loadingChannels ? (
          <div className="flex items-center justify-center py-16">
            <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : noQuotaAvailable ? (
          <div className="p-6">
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
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  {tc("cancel")}
                </Button>
                <Button asChild>
                  <Link href={`/${locale}/dashboard/billing`} className="gap-1">
                    {isRTL ? "שדרג עכשיו" : "Upgrade Now"}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : noChannelsAvailable ? (
          <div className="p-6">
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Icons.warning className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold">{t("noChannelsAvailable")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("contactAdminForChannels")}
              </p>
              <div className="mt-6">
                <Button onClick={handleClose}>{tc("close")}</Button>
              </div>
            </div>
          </div>
        ) : !results ? (
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden max-h-[90vh]">
            {/* Left Side - Preview (hidden on small screens, shown on md+) */}
            <div className="hidden md:flex md:w-[280px] lg:w-[320px] shrink-0 bg-muted/30 p-3 lg:p-4 flex-col border-e overflow-y-auto">
              <div className="text-center mb-3 shrink-0">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {isRTL ? "תצוגה מקדימה" : "Preview"}
                </h4>
              </div>
              <div className="flex items-center justify-center flex-1 min-h-0">
                <MessagePreview
                  channel={channel === "AUTO" ? "WHATSAPP" : channel}
                  message={previewMessage}
                  isRTL={isRTL}
                  hasButtons={messageFormat === "INTERACTIVE" && channel === "WHATSAPP"}
                  buttons={INTERACTIVE_BUTTONS[isRTL ? "he" : "en"]}
                  imageUrl={includeImage ? invitationImageUrl || undefined : undefined}
                />
              </div>
              {channel === "SMS" && (
                <div className="mt-3 text-center shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {charCount} / {SMS_MAX_LENGTH} {isRTL ? "תווים" : "chars"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Right Side - Controls */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Icons.messageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  {mode === "single" ? t("sendMessage") : t("sendBulkMessage")}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {mode === "single" && guestNames?.[0]
                    ? t("sendMessageTo", { name: guestNames[0] })
                    : t("sendMessageToSelected", { count: guestIds.length })}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Channel Selection */}
                <div className="space-y-2">
                  <Label>{t("sendVia")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "WHATSAPP" as ChannelType, icon: MessageCircle, label: "WhatsApp", color: "green" },
                      { value: "SMS" as ChannelType, icon: Phone, label: "SMS", color: "blue" },
                    ].map((ch) => {
                      const isEnabled = ch.value === "WHATSAPP"
                        ? channelStatus?.whatsapp.enabled && (usageStatus?.whatsappRemaining ?? 0) > 0
                        : channelStatus?.sms.enabled && (usageStatus?.smsRemaining ?? 0) > 0;
                      const remaining = ch.value === "WHATSAPP"
                        ? usageStatus?.whatsappRemaining ?? 0
                        : usageStatus?.smsRemaining ?? 0;

                      return (
                        <button
                          key={ch.value}
                          onClick={() => isEnabled && setChannel(ch.value)}
                          disabled={!isEnabled || sending}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                            channel === ch.value && isEnabled
                              ? ch.color === "green"
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : isEnabled
                                ? "border-border hover:border-primary/50"
                                : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                          )}
                        >
                          <ch.icon className={cn(
                            "h-5 w-5",
                            channel === ch.value && isEnabled
                              ? ch.color === "green" ? "text-green-600" : "text-blue-600"
                              : "text-muted-foreground"
                          )} />
                          <div className="flex-1 text-start">
                            <p className="font-medium text-sm">{ch.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {remaining} {isRTL ? "נותרו" : "remaining"}
                            </p>
                          </div>
                          {channel === ch.value && isEnabled && (
                            <Icons.check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Type - 2x2 Grid */}
                <div className="space-y-2">
                  <Label>{t("messageType")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMessageType("INVITE")}
                      disabled={sending}
                      className={cn(
                        "p-3 rounded-lg border-2 text-start transition-all",
                        messageType === "INVITE"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-border hover:border-blue-500/50"
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Icons.mail className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">
                            {t("invitation")}
                          </span>
                          {messageType === "INVITE" && (
                            <Icons.check className="h-4 w-4 text-blue-600 ms-auto" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "הזמנה ראשונית" : "Initial invite"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setMessageType("REMINDER")}
                      disabled={sending}
                      className={cn(
                        "p-3 rounded-lg border-2 text-start transition-all",
                        messageType === "REMINDER"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-border hover:border-purple-500/50"
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Icons.bell className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-sm">
                            {t("reminder")}
                          </span>
                          {messageType === "REMINDER" && (
                            <Icons.check className="h-4 w-4 text-purple-600 ms-auto" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "תזכורת RSVP" : "RSVP reminder"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setMessageType("EVENT_DAY")}
                      disabled={sending}
                      className={cn(
                        "p-3 rounded-lg border-2 text-start transition-all",
                        messageType === "EVENT_DAY"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                          : "border-border hover:border-amber-500/50"
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Icons.calendar className="h-4 w-4 text-amber-600" />
                          <span className="font-medium text-sm">
                            {isRTL ? "יום האירוע" : "Event Day"}
                          </span>
                          {messageType === "EVENT_DAY" && (
                            <Icons.check className="h-4 w-4 text-amber-600 ms-auto" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "ביום האירוע" : "On event day"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setMessageType("THANK_YOU")}
                      disabled={sending}
                      className={cn(
                        "p-3 rounded-lg border-2 text-start transition-all",
                        messageType === "THANK_YOU"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-border hover:border-green-500/50"
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Icons.heart className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">
                            {isRTL ? "יום אחרי" : "Day After"}
                          </span>
                          {messageType === "THANK_YOU" && (
                            <Icons.check className="h-4 w-4 text-green-600 ms-auto" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? "תודה לאורחים" : "Thank guests"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Message Format (WhatsApp only, not for EVENT_DAY or THANK_YOU) */}
                {channel === "WHATSAPP" && messageType !== "EVENT_DAY" && messageType !== "THANK_YOU" && (
                  <div className="space-y-2">
                    <Label>{isRTL ? "פורמט הודעה" : "Message Format"}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMessageFormat("STANDARD")}
                        disabled={sending}
                        className={cn(
                          "p-3 rounded-lg border-2 text-start transition-all",
                          messageFormat === "STANDARD"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {isRTL ? "סטנדרטי" : "Standard"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isRTL ? "עם קישור RSVP" : "With RSVP link"}
                            </p>
                          </div>
                          {messageFormat === "STANDARD" && (
                            <Icons.check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => setMessageFormat("INTERACTIVE")}
                        disabled={sending}
                        className={cn(
                          "p-3 rounded-lg border-2 text-start transition-all",
                          messageFormat === "INTERACTIVE"
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "border-border hover:border-purple-500/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-600" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {isRTL ? "אינטראקטיבי" : "Interactive"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isRTL ? "כפתורי תגובה" : "Response buttons"}
                            </p>
                          </div>
                          {messageFormat === "INTERACTIVE" && (
                            <Icons.check className="h-4 w-4 text-purple-600" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Invitation Image Section (Interactive mode) */}
                {messageFormat === "INTERACTIVE" && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {isRTL ? "תמונת הזמנה" : "Invitation Image"}
                    </Label>

                    {hasInvitationImage ? (
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                        {/* Current Invitation Preview */}
                        <div className="flex items-start gap-3">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border bg-white shrink-0">
                            <img
                              src={invitationImageUrl!}
                              alt={isRTL ? "תמונת הזמנה" : "Invitation"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {isRTL ? "הזמנה נבחרה" : "Invitation Selected"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isRTL ? "התמונה תישלח עם ההודעה" : "Image will be sent with message"}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              asChild
                            >
                              <Link href={`/${locale}/events/${eventId}/invitations`}>
                                <Pencil className="h-3 w-3 me-1" />
                                {isRTL ? "שנה הזמנה" : "Change Invitation"}
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Include Image Checkbox */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Checkbox
                            id="include-image"
                            checked={includeImage}
                            onCheckedChange={(checked) => setIncludeImage(checked === true)}
                            disabled={sending}
                          />
                          <Label htmlFor="include-image" className="text-sm cursor-pointer">
                            {isRTL ? "כלול תמונה בהודעה" : "Include image in message"}
                          </Label>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-4">
                        <div className="text-center">
                          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <ImagePlus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">
                            {isRTL ? "לא נבחרה הזמנה" : "No Invitation Selected"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 mb-3">
                            {isRTL
                              ? "צור הזמנה כדי לשלוח אותה עם ההודעה"
                              : "Create an invitation to send it with your message"}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/${locale}/events/${eventId}/invitations`}>
                              <ImagePlus className="h-4 w-4 me-1.5" />
                              {isRTL ? "צור הזמנה" : "Create Invitation"}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    {isRTL ? "בחר סגנון תבנית" : "Select Template Style"}
                  </Label>

                  {channel === "WHATSAPP" ? (
                    loadingWhatsappTemplates ? (
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <Skeleton className="h-12 sm:h-14 rounded-lg" />
                        <Skeleton className="h-12 sm:h-14 rounded-lg" />
                        <Skeleton className="h-12 sm:h-14 rounded-lg" />
                      </div>
                    ) : whatsappTemplates.length === 0 ? (
                      <div className="p-3 sm:p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                        <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                          {isRTL
                            ? "אין תבניות WhatsApp מאושרות עדיין"
                            : "No approved WhatsApp templates yet"}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {whatsappTemplateDefinitions.map((definition) => {
                          const activeTemplate = whatsappTemplates.find((t) => t.style === definition.style);
                          const isActive = !!activeTemplate;
                          const isSelected = selectedWhatsappStyle === definition.style;

                          // Map WhatsApp style names to descriptions
                          const getWhatsAppStyleDesc = (style: string) => {
                            const styleMap: Record<string, { he: string; en: string; desc: string }> = {
                              formal: { he: "רשמי", en: "Formal", desc: "Normal" },
                              friendly: { he: "ידידותי", en: "Friendly", desc: "Informative" },
                              short: { he: "קצר", en: "Short", desc: "Quick" },
                            };
                            return styleMap[style] || { he: style, en: style, desc: "" };
                          };

                          const styleDesc = getWhatsAppStyleDesc(definition.style);

                          return (
                            <button
                              key={definition.style}
                              onClick={() => activeTemplate && handleWhatsappTemplateSelect(activeTemplate)}
                              disabled={!isActive || sending}
                              className={cn(
                                "p-2 sm:p-3 rounded-lg border-2 text-center transition-all flex flex-col gap-1",
                                isSelected && isActive
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : isActive
                                    ? "border-border hover:border-green-500/50"
                                    : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                              )}
                            >
                              <p className="font-medium text-xs">
                                {isRTL ? styleDesc.he : styleDesc.en}
                              </p>
                              {isActive && styleDesc.desc && (
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                                  {styleDesc.desc}
                                </p>
                              )}
                              {!isActive && (
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                                  {isRTL ? "לא מאושר" : "Not approved"}
                                </p>
                              )}
                              {isSelected && isActive && (
                                <Icons.check className="h-3 w-3 text-green-600 mx-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {/* Event-Specific SMS Templates (if any) */}
                      {eventSmsTemplates.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            {isRTL ? "תבניות האירוע שלך" : "Your Event Templates"}
                          </Label>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            {eventSmsTemplates.map((template) => {
                              const isSelected = selectedEventSmsTemplateId === template.id && !isCustomSms;
                              const name = isRTL ? template.nameHe : template.nameEn;
                              const styleDesc = getSmsStyleDescription(template.style);

                              return (
                                <button
                                  key={template.id}
                                  onClick={() => {
                                    setSelectedEventSmsTemplateId(template.id);
                                    setSelectedSmsTemplateId(null);
                                    setIsCustomSms(false);
                                    setSmsTemplate(isRTL ? template.messageBodyHe : (template.messageBodyEn || template.messageBodyHe));
                                  }}
                                  disabled={sending}
                                  className={cn(
                                    "p-2 sm:p-3 rounded-lg border-2 text-center transition-all flex flex-col gap-1",
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  )}
                                >
                                  <p className="font-medium text-xs">{isRTL ? styleDesc.he : styleDesc.en}</p>
                                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                                    {styleDesc.description.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  {isSelected && (
                                    <Icons.check className="h-3 w-3 text-primary mx-auto" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Config SMS Template Buttons (fallback) */}
                      {smsTemplates.length > 0 && eventSmsTemplates.length === 0 && (
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                          {smsTemplates.map((template) => {
                            const isSelected = selectedSmsTemplateId === template.id && !isCustomSms;
                            const name = isRTL ? template.nameHe : template.nameEn;

                            return (
                              <button
                                key={template.id}
                                onClick={() => handleSmsTemplateSelect(template)}
                                disabled={sending}
                                className={cn(
                                  "p-2 sm:p-3 rounded-lg border-2 text-center transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <p className="font-medium text-xs sm:text-sm">{name}</p>
                                {isSelected && (
                                  <Icons.check className="h-3 w-3 sm:h-4 sm:w-4 text-primary mx-auto mt-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Custom SMS Toggle */}
                      <button
                        onClick={() => {
                          setIsCustomSms(!isCustomSms);
                          if (!isCustomSms) {
                            setSelectedSmsTemplateId(null);
                            setSmsTemplate(customSmsMessage);
                          }
                        }}
                        disabled={sending}
                        className={cn(
                          "w-full p-2 sm:p-3 rounded-lg border-2 text-center transition-all",
                          isCustomSms
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "border-dashed border-border hover:border-purple-500/50"
                        )}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Icons.edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="font-medium text-xs sm:text-sm">
                            {isRTL ? "הודעה מותאמת אישית" : "Custom Message"}
                          </span>
                          {isCustomSms && (
                            <Icons.check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                          )}
                        </div>
                      </button>

                      {/* Custom SMS Textarea */}
                      {isCustomSms && (
                        <div className="space-y-1.5 sm:space-y-2">
                          <Textarea
                            value={customSmsMessage}
                            onChange={(e) => handleCustomSmsChange(e.target.value)}
                            placeholder={
                              isRTL
                                ? "כתוב הודעה מותאמת אישית...\nתומך ב: {{guestName}}, {{eventTitle}}, {{rsvpLink}}"
                                : "Write a custom message...\nSupports: {{guestName}}, {{eventTitle}}, {{rsvpLink}}"
                            }
                            disabled={sending}
                            className="min-h-[70px] sm:min-h-[80px] text-xs sm:text-sm"
                            dir={isRTL ? "rtl" : "ltr"}
                          />
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {isRTL ? "משתנים:" : "Variables:"}{" "}
                            <code className="bg-muted px-0.5 sm:px-1 rounded text-[10px] sm:text-xs">{"{{guestName}}"}</code>{" "}
                            <code className="bg-muted px-0.5 sm:px-1 rounded text-[10px] sm:text-xs">{"{{eventTitle}}"}</code>{" "}
                            <code className="bg-muted px-0.5 sm:px-1 rounded text-[10px] sm:text-xs">{"{{rsvpLink}}"}</code>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Preview (shown only on small screens) */}
                <div className="md:hidden rounded-lg border bg-muted/30 p-4">
                  <div className="text-center mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {isRTL ? "תצוגה מקדימה" : "Preview"}
                    </h4>
                  </div>
                  <div className="flex justify-center">
                    <MessagePreview
                      channel={channel === "AUTO" ? "WHATSAPP" : channel}
                      message={previewMessage}
                      isRTL={isRTL}
                      hasButtons={messageFormat === "INTERACTIVE" && channel === "WHATSAPP"}
                      buttons={INTERACTIVE_BUTTONS[isRTL ? "he" : "en"]}
                      imageUrl={includeImage ? invitationImageUrl || undefined : undefined}
                    />
                  </div>
                  {channel === "SMS" && (
                    <div className="mt-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {charCount} / {SMS_MAX_LENGTH} {isRTL ? "תווים" : "chars"}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Recipients Summary */}
                <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("recipients")}</span>
                    <Badge variant="secondary">{guestIds.length}</Badge>
                  </div>
                  {mode === "single" && guestNames?.[0] && (
                    <p className="mt-1 text-sm text-muted-foreground">{guestNames[0]}</p>
                  )}
                </div>

                {/* Progress Bar */}
                {sending && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t("sending")}</span>
                      <span>{progress < 100 ? (isRTL ? "מעבד..." : "Processing...") : `${progress}%`}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* Confirmation Warning */}
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
              </div>

              <DialogFooter className="p-4 sm:p-6 pt-3 sm:pt-4 border-t shrink-0 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose} disabled={sending} className="w-full sm:w-auto">
                  {tc("cancel")}
                </Button>
                <Button onClick={handleSendClick} disabled={sending} className="w-full sm:w-auto">
                  {sending ? (
                    <>
                      <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                      {t("sending")}
                    </>
                  ) : showConfirmation ? (
                    <>
                      <Icons.check className="me-2 h-4 w-4" />
                      {isRTL ? "שלח בכל זאת" : "Send Anyway"}
                    </>
                  ) : (
                    <>
                      <Icons.send className="me-2 h-4 w-4" />
                      {t("send")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
