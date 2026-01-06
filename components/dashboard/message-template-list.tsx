"use client";

import { useState, useTransition, useEffect } from "react";
import { MessageTemplate, NotificationType } from "@prisma/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { MessageTemplateEditor } from "@/components/dashboard/message-template-editor";
import { BulkSendDialog } from "@/components/dashboard/bulk-send-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  toggleTemplateActive,
  resetToDefaults,
  getBulkSendStats,
  updateSmsSenderId,
} from "@/actions/message-templates";
import { getWhatsAppTemplates } from "@/actions/messaging-settings";

interface MessageTemplateListProps {
  templates: MessageTemplate[];
  eventId: string;
  eventTitle: string;
  locale: string;
  smsSenderId?: string | null;
}

// Only INVITE and REMINDER - no CONFIRMATION
const TEMPLATE_TYPES = ["INVITE", "REMINDER"] as const;

export function MessageTemplateList({
  templates,
  eventId,
  eventTitle,
  locale,
  smsSenderId: initialSmsSenderId,
}: MessageTemplateListProps) {
  const t = useTranslations("messageTemplates");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [bulkSendType, setBulkSendType] = useState<NotificationType>(NotificationType.INVITE);
  const [bulkStats, setBulkStats] = useState<{
    totalGuests: number;
    eligibleCount: number;
  } | null>(null);
  const [smsSenderId, setSmsSenderId] = useState(initialSmsSenderId || "");
  const [isSavingSenderId, setIsSavingSenderId] = useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<{
    invite: string | null;
    reminder: string | null;
    confirmation: string | null;
  } | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // Fetch WhatsApp templates on mount
  useEffect(() => {
    getWhatsAppTemplates().then((result) => {
      if (result.success && result.templates) {
        setWhatsappTemplates(result.templates);
        setWhatsappEnabled(result.whatsappEnabled || false);
      }
    });
  }, []);

  // Placeholder definitions with translation keys
  const placeholders = [
    { key: "{{guestName}}", descriptionKey: "guestName" },
    { key: "{{eventTitle}}", descriptionKey: "eventTitle" },
    { key: "{{rsvpLink}}", descriptionKey: "rsvpLink" },
    { key: "{{eventDate}}", descriptionKey: "eventDate" },
    { key: "{{eventTime}}", descriptionKey: "eventTime" },
    { key: "{{eventLocation}}", descriptionKey: "eventLocation" },
    { key: "{{eventVenue}}", descriptionKey: "eventVenue" },
  ];

  // Load bulk stats when opening the dialog
  const openBulkSend = async (messageType: NotificationType) => {
    setBulkSendType(messageType);
    const result = await getBulkSendStats(eventId, messageType);
    if (result.success) {
      setBulkStats({
        totalGuests: result.totalGuests || 0,
        eligibleCount: result.eligibleCount || 0,
      });
    }
    setBulkSendOpen(true);
  };

  const handleToggleActive = (templateId: string) => {
    startTransition(async () => {
      const result = await toggleTemplateActive(templateId);
      if (result.success) {
        toast.success(t("templateStatusUpdated"));
      } else {
        toast.error(result.error || tc("errors.generic"));
      }
    });
  };

  const handleResetDefaults = () => {
    if (!confirm(t("resetConfirm"))) {
      return;
    }

    startTransition(async () => {
      const result = await resetToDefaults(eventId, locale);
      if (result.success) {
        toast.success(t("templateReset"));
      } else {
        toast.error(result.error || tc("errors.generic"));
      }
    });
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleSaveSmsSenderId = async () => {
    setIsSavingSenderId(true);
    const result = await updateSmsSenderId(eventId, smsSenderId || null);
    setIsSavingSenderId(false);

    if (result.success) {
      toast.success(t("smsSenderId.saved"));
    } else {
      toast.error(result.error || t("smsSenderId.saveFailed"));
    }
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  };

  // Filter templates to only show INVITE and REMINDER (exclude CONFIRMATION)
  const filteredTemplates = templates.filter(
    (t) => t.type === NotificationType.INVITE || t.type === NotificationType.REMINDER
  );

  // Group templates by type
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    acc[template.type] = template;
    return acc;
  }, {} as Record<string, MessageTemplate>);

  // Template categories - only 2 types
  const templateCategories = [
    {
      key: "INVITE",
      labelKey: "inviteMessage",
      descriptionKey: "inviteDescription",
      icon: "mail" as keyof typeof Icons,
      colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    {
      key: "REMINDER",
      labelKey: "reminderMessage",
      descriptionKey: "reminderDescription",
      icon: "bell" as keyof typeof Icons,
      colorClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("templatesFor", { eventTitle })}</h3>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button variant="outline" onClick={handleResetDefaults} disabled={isPending}>
          <Icons.trash className="me-2 h-4 w-4" />
          {t("resetToDefaults")}
        </Button>
      </div>

      {/* Bulk Send Actions */}
      <Card className="border-2 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("bulkSendTitle")}</CardTitle>
          <CardDescription>
            {t("bulkSendDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => openBulkSend(NotificationType.INVITE)}
              className="gap-2"
            >
              <Icons.send className="h-4 w-4" />
              {t("sendInvitationsToAll")}
            </Button>
            <Button
              variant="outline"
              onClick={() => openBulkSend(NotificationType.REMINDER)}
              className="gap-2"
            >
              <Icons.bell className="h-4 w-4" />
              {t("sendRemindersTosPending")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Sender ID Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Icons.phone className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <CardTitle className="text-base">{t("smsSenderId.title")}</CardTitle>
              <CardDescription>
                {t("smsSenderId.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sms-sender-id">{t("smsSenderId.label")}</Label>
            <div className="flex gap-2">
              <Input
                id="sms-sender-id"
                placeholder={t("smsSenderId.placeholder")}
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                maxLength={11}
                className="max-w-xs"
              />
              <Button
                onClick={handleSaveSmsSenderId}
                disabled={isSavingSenderId}
              >
                {isSavingSenderId ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  tc("save")
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("smsSenderId.hint")}
            </p>
          </div>
          {smsSenderId && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                {t("smsSenderId.preview")}{" "}
                <Badge variant="secondary">{smsSenderId}</Badge>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholders Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("availablePlaceholders")}</CardTitle>
          <CardDescription>
            {t("placeholdersDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((placeholder) => (
              <Badge
                key={placeholder.key}
                variant="secondary"
                className="cursor-help"
                title={t(`placeholders.${placeholder.descriptionKey}`)}
              >
                {placeholder.key}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Templates (Read-only) */}
      {whatsappEnabled && whatsappTemplates && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Icons.messageCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t("whatsappTemplates")}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{t("readOnly")}</Badge>
                </div>
                <CardDescription>
                  {t("whatsappTemplatesDescription")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* WhatsApp Invite */}
              {whatsappTemplates.invite && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icons.mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{t("inviteMessage")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {whatsappTemplates.invite}
                  </p>
                </div>
              )}
              {/* WhatsApp Reminder */}
              {whatsappTemplates.reminder && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icons.bell className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">{t("reminderMessage")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {whatsappTemplates.reminder}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("whatsappTemplatesNote")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* SMS Templates (Editable) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Icons.phone className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{t("smsTemplates")}</CardTitle>
                <Badge variant="outline" className="text-xs">{t("editable")}</Badge>
              </div>
              <CardDescription>
                {t("smsTemplatesDescription")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {templateCategories.map((category) => {
              const template = groupedTemplates[category.key];
              const IconComponent = Icons[category.icon];

              return (
                <div
                  key={category.key}
                  className={`rounded-lg border p-4 ${!template?.isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${category.colorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t(category.labelKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(category.descriptionKey)}</p>
                      </div>
                    </div>
                    {template && (
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleActive(template.id)}
                        disabled={isPending}
                      />
                    )}
                  </div>

                  {template ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t("titleLabel")}</p>
                        <p className="text-sm">{template.title}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t("messagePreview")}</p>
                        <p className="text-sm line-clamp-3 whitespace-pre-wrap text-muted-foreground">
                          {template.message}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEdit(template)}
                      >
                        <Icons.edit className="me-2 h-4 w-4" />
                        {t("editTemplate")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <Icons.messageCircle className="mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{t("noTemplateConfigured")}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setEditingTemplate({
                            id: "",
                            weddingEventId: eventId,
                            type: category.key as NotificationType,
                            locale,
                            title: "",
                            message: "",
                            isAcceptedVariant: false,
                            isActive: true,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                          });
                          setIsEditorOpen(true);
                        }}
                      >
                        <Icons.add className="me-2 h-4 w-4" />
                        {t("createTemplate")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? t("editTemplateTitle") : t("createTemplateTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("editorDescription")}
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <MessageTemplateEditor
              template={editingTemplate}
              eventId={eventId}
              placeholders={placeholders.map(p => ({
                key: p.key,
                description: t(`placeholders.${p.descriptionKey}`),
              }))}
              onClose={handleEditorClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      {bulkStats && (
        <BulkSendDialog
          open={bulkSendOpen}
          onOpenChange={setBulkSendOpen}
          eventId={eventId}
          messageType={bulkSendType}
          eligibleCount={bulkStats.eligibleCount}
          totalGuests={bulkStats.totalGuests}
          smsSenderId={smsSenderId}
        />
      )}
    </div>
  );
}
