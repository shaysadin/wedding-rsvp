"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Plus, Smartphone, ExternalLink, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/shared/icons";
import {
  getEventSmsTemplates,
  initializeDefaultSmsTemplates,
  deleteEventSmsTemplate,
} from "@/actions/sms-templates";
import { getAllWhatsAppTemplates } from "@/actions/whatsapp-templates";
import { SmsTemplateDialog } from "./sms-template-dialog";
import { getSmsStyleDescription } from "@/config/sms-template-presets";
import type { SmsTemplateType } from "@/config/sms-template-presets";

interface MessagesPageContentProps {
  eventId: string;
  locale: string;
}

interface SmsTemplate {
  id: string;
  type: string;
  style: string;
  nameHe: string;
  nameEn: string;
  messageBodyHe: string;
  messageBodyEn: string | null;
  isDefault: boolean;
}

interface WhatsAppTemplate {
  id: string;
  type: string;
  style: string;
  nameHe: string;
  nameEn: string;
  previewText: string | null;
  previewTextHe: string | null;
  approvalStatus: string;
}

export function MessagesPageContent({ eventId, locale }: MessagesPageContentProps) {
  const t = useTranslations();
  const isRTL = locale === "he";

  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

  // Fetch SMS and WhatsApp templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [smsResult, whatsappResult] = await Promise.all([
        getEventSmsTemplates(eventId),
        getAllWhatsAppTemplates(),
      ]);

      if (smsResult.success) {
        setSmsTemplates(smsResult.templates as SmsTemplate[]);
      }

      if (whatsappResult.success) {
        setWhatsappTemplates(whatsappResult.templates as WhatsAppTemplate[]);
      }
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [eventId]);

  // Initialize default templates
  const handleInitializeDefaults = async () => {
    setInitializing(true);
    try {
      const result = await initializeDefaultSmsTemplates(eventId);
      if (result.success) {
        toast.success(result.message || "Default templates created");
        fetchTemplates();
      } else {
        toast.error(result.error || "Failed to initialize templates");
      }
    } catch (error) {
      toast.error("Failed to initialize templates");
    } finally {
      setInitializing(false);
    }
  };

  // Delete SMS template
  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? "האם למחוק תבנית זו?" : "Delete this template?")) {
      return;
    }

    try {
      const result = await deleteEventSmsTemplate(id, eventId);
      if (result.success) {
        toast.success(isRTL ? "התבנית נמחקה" : "Template deleted");
        fetchTemplates();
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  // Open edit dialog
  const handleEdit = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  // Group templates by type
  const groupedSmsTemplates = smsTemplates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<string, SmsTemplate[]>);

  const groupedWhatsappTemplates = whatsappTemplates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<string, WhatsAppTemplate[]>);

  // Type display names
  const typeNames: Record<string, { he: string; en: string }> = {
    INVITE: { he: "הזמנה", en: "Invitation" },
    REMINDER: { he: "תזכורת", en: "Reminder" },
    EVENT_DAY: { he: "יום האירוע", en: "Event Day" },
    THANK_YOU: { he: "תודה (יום אחרי)", en: "Thank You (Day After)" },
    INTERACTIVE_INVITE: { he: "הזמנה אינטראקטיבית", en: "Interactive Invite" },
    INTERACTIVE_REMINDER: { he: "תזכורת אינטראקטיבית", en: "Interactive Reminder" },
    IMAGE_INVITE: { he: "הזמנה עם תמונה", en: "Image Invite" },
    CONFIRMATION: { he: "אישור RSVP", en: "RSVP Confirmation" },
    TABLE_ASSIGNMENT: { he: "שיבוץ שולחן", en: "Table Assignment" },
    GUEST_COUNT_LIST: { he: "ספירת אורחים", en: "Guest Count" },
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isRTL ? `${smsTemplates.length} תבניות SMS` : `${smsTemplates.length} SMS Templates`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {smsTemplates.length === 0 && (
              <Button onClick={handleInitializeDefaults} disabled={initializing}>
                {initializing && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                <Plus className="me-2 h-4 w-4" />
                {isRTL ? "צור תבניות ברירת מחדל" : "Create Default Templates"}
              </Button>
            )}
            <Button onClick={() => {
              setEditingTemplate(null);
              setDialogOpen(true);
            }}>
              <Plus className="me-2 h-4 w-4" />
              {isRTL ? "תבנית חדשה" : "New Template"}
            </Button>
          </div>
        </div>

        {/* Main content tabs */}
        <Tabs defaultValue="sms" className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
          <TabsList className={isRTL ? "flex-row-reverse" : ""}>
            <TabsTrigger value="sms" className="gap-2">
              <Smartphone className="h-4 w-4" />
              {isRTL ? "תבניות SMS" : "SMS Templates"}
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {isRTL ? "תבניות WhatsApp (לצפייה)" : "WhatsApp Templates (View)"}
            </TabsTrigger>
          </TabsList>

          {/* SMS Templates Tab */}
          <TabsContent value="sms" className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : smsTemplates.length === 0 ? (
              <Card>
                <CardContent className={`flex flex-col items-center justify-center py-12 ${isRTL ? "text-center" : "text-center"}`}>
                  <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {isRTL ? "אין תבניות SMS" : "No SMS Templates"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isRTL
                      ? "התחל בהוספת תבניות SMS מותאמות אישית לאירוע שלך"
                      : "Start by adding custom SMS templates for your event"}
                  </p>
                  <Button onClick={handleInitializeDefaults} disabled={initializing}>
                    {initializing && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                    <Plus className="me-2 h-4 w-4" />
                    {isRTL ? "צור תבניות ברירת מחדל" : "Create Default Templates"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {Object.entries(groupedSmsTemplates).map(([type, templates]) => (
                  <Card key={type}>
                    <CardHeader className={isRTL ? "text-right" : "text-left"}>
                      <CardTitle className="flex items-center gap-2">
                        {isRTL ? typeNames[type]?.he || type : typeNames[type]?.en || type}
                        <Badge variant="secondary">{templates.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {isRTL
                          ? `תבניות SMS עבור ${typeNames[type]?.he || type}`
                          : `SMS templates for ${typeNames[type]?.en || type}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {templates.map((template) => {
                        const styleDesc = getSmsStyleDescription(template.style as any);
                        return (
                          <div key={template.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">
                                    {isRTL ? template.nameHe : template.nameEn}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {isRTL ? styleDesc.he : styleDesc.en}
                                  </Badge>
                                  {template.isDefault && (
                                    <Badge variant="secondary" className="text-xs">
                                      {isRTL ? "ברירת מחדל" : "Default"}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {styleDesc.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Separator />
                            <div className={`bg-muted/30 rounded p-3 ${isRTL ? "text-right" : "text-left"} max-h-[400px] overflow-y-auto`}>
                              <p className="text-sm whitespace-pre-wrap font-mono break-words">
                                {isRTL ? template.messageBodyHe : (template.messageBodyEn || template.messageBodyHe)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* WhatsApp Templates Tab (View Only) */}
          <TabsContent value="whatsapp" className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {isRTL
                            ? "תבניות WhatsApp מנוהלות ע\"י המערכת"
                            : "WhatsApp Templates are System-Managed"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL
                            ? "תבניות WhatsApp מאושרות ומנוהלות על ידי מנהלי המערכת. צפה בתבניות הזמינות למטה."
                            : "WhatsApp templates are approved and managed by system admins. View available templates below."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6">
                  {Object.entries(groupedWhatsappTemplates).map(([type, templates]) => (
                    <Card key={type}>
                      <CardHeader className={isRTL ? "text-right" : "text-left"}>
                        <CardTitle className="flex items-center gap-2">
                          {isRTL ? typeNames[type]?.he || type : typeNames[type]?.en || type}
                          <Badge variant="secondary">{templates.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {templates.map((template) => (
                          <div key={template.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">
                                    {isRTL ? template.nameHe : template.nameEn}
                                  </h4>
                                  <Badge
                                    variant={template.approvalStatus === "APPROVED" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {template.approvalStatus}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {(template.previewTextHe || template.previewText) && (
                              <>
                                <Separator />
                                <div className={`bg-muted/30 rounded p-3 ${isRTL ? "text-right" : "text-left"} max-h-[400px] overflow-y-auto`}>
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {isRTL ? template.previewTextHe : template.previewText}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* SMS Template Dialog */}
      <SmsTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventId={eventId}
        locale={locale}
        template={editingTemplate}
        onSuccess={() => {
          setDialogOpen(false);
          setEditingTemplate(null);
          fetchTemplates();
        }}
      />
    </div>
  );
}
