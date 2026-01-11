"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Check, X, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icons } from "@/components/shared/icons";
import {
  ALL_WHATSAPP_TEMPLATE_DEFINITIONS,
  type WhatsAppTemplateType,
  type WhatsAppTemplateStyle,
} from "@/config/whatsapp-templates";
import {
  upsertWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from "@/actions/whatsapp-templates";

interface WhatsAppTemplate {
  id: string;
  type: string;
  style: string;
  nameHe: string;
  nameEn: string;
  contentSid: string;
  templateText: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface WhatsAppTemplatesAdminProps {
  templates: WhatsAppTemplate[];
}

const TYPE_LABELS: Record<WhatsAppTemplateType, { en: string; he: string }> = {
  INVITE: { en: "Standard Invite", he: "הזמנה רגילה" },
  REMINDER: { en: "Standard Reminder", he: "תזכורת רגילה" },
  INTERACTIVE_INVITE: { en: "Interactive Invite", he: "הזמנה אינטראקטיבית" },
  INTERACTIVE_REMINDER: { en: "Interactive Reminder", he: "תזכורת אינטראקטיבית" },
  IMAGE_INVITE: { en: "Image Invite", he: "הזמנה עם תמונה" },
  CONFIRMATION: { en: "RSVP Confirmation", he: "אישור RSVP" },
  EVENT_DAY: { en: "Event Day Reminder", he: "תזכורת יום האירוע" },
  THANK_YOU: { en: "Thank You", he: "הודעת תודה" },
  TABLE_ASSIGNMENT: { en: "Table Assignment", he: "שיבוץ לשולחן" },
  GUEST_COUNT_LIST: { en: "Guest Count List", he: "רשימת מספר אורחים" },
};

const STYLE_LABELS: Record<WhatsAppTemplateStyle, { en: string; he: string }> = {
  formal: { en: "Formal", he: "רשמי" },
  friendly: { en: "Friendly", he: "ידידותי" },
  short: { en: "Short", he: "קצר" },
};

export function WhatsAppTemplatesAdmin({ templates }: WhatsAppTemplatesAdminProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);

  // Form state
  const [formType, setFormType] = useState<WhatsAppTemplateType>("INVITE");
  const [formStyle, setFormStyle] = useState<WhatsAppTemplateStyle>("formal");
  const [formContentSid, setFormContentSid] = useState("");

  // Group templates by type
  const templatesByType = templates.reduce((acc, template) => {
    const type = template.type as WhatsAppTemplateType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {} as Record<WhatsAppTemplateType, WhatsAppTemplate[]>);

  // Get definition for a template type/style
  const getDefinition = (type: WhatsAppTemplateType, style: WhatsAppTemplateStyle) => {
    return ALL_WHATSAPP_TEMPLATE_DEFINITIONS.find(
      (def) => def.type === type && def.style === style
    );
  };

  // Check if a template exists in DB
  const getExistingTemplate = (type: WhatsAppTemplateType, style: WhatsAppTemplateStyle) => {
    return templates.find((t) => t.type === type && t.style === style);
  };

  const handleOpenDialog = (template?: WhatsAppTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormType(template.type as WhatsAppTemplateType);
      setFormStyle(template.style as WhatsAppTemplateStyle);
      setFormContentSid(template.contentSid);
    } else {
      setEditingTemplate(null);
      setFormType("INVITE");
      setFormStyle("formal");
      setFormContentSid("");
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formContentSid.trim()) {
      toast.error("Please enter a Content SID");
      return;
    }

    if (!formContentSid.startsWith("HX")) {
      toast.error("Content SID should start with 'HX'");
      return;
    }

    setIsLoading(true);

    try {
      const definition = getDefinition(formType, formStyle);
      if (!definition) {
        toast.error("Template definition not found");
        return;
      }

      const result = await upsertWhatsAppTemplate({
        type: formType,
        style: formStyle,
        nameHe: definition.nameHe,
        nameEn: definition.nameEn,
        contentSid: formContentSid.trim(),
        templateText: definition.twilioTemplateName,
        sortOrder: formStyle === "formal" ? 0 : formStyle === "friendly" ? 1 : 2,
      });

      if (result.success) {
        toast.success(editingTemplate ? "Template updated" : "Template added");
        setIsDialogOpen(false);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    setIsLoading(true);
    try {
      const result = await deleteWhatsAppTemplate(id);
      if (result.success) {
        toast.success("Template deleted");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp Templates
            </CardTitle>
            <CardDescription>
              Manage approved WhatsApp Content Templates from Twilio. Each template type
              can have 3 styles: Formal, Friendly, and Short.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {(Object.keys(TYPE_LABELS) as WhatsAppTemplateType[]).map((type) => (
            <div key={type} className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                {TYPE_LABELS[type].en}
                <span className="text-muted-foreground font-normal">
                  ({TYPE_LABELS[type].he})
                </span>
              </h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Style</TableHead>
                    <TableHead>Content SID</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(["formal", "friendly", "short"] as WhatsAppTemplateStyle[]).map(
                    (style) => {
                      const existing = getExistingTemplate(type, style);
                      const definition = getDefinition(type, style);

                      return (
                        <TableRow key={`${type}-${style}`}>
                          <TableCell className="font-medium">
                            {STYLE_LABELS[style].en}
                            <span className="text-xs text-muted-foreground block">
                              {STYLE_LABELS[style].he}
                            </span>
                          </TableCell>
                          <TableCell>
                            {existing ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {existing.contentSid}
                              </code>
                            ) : definition?.existingContentSid ? (
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-amber-700 dark:text-amber-300">
                                  {definition.existingContentSid}
                                </code>
                                <span className="text-xs text-muted-foreground">
                                  (from config)
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Not configured
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {existing?.isActive ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : definition?.existingContentSid ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Config
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <X className="h-3 w-3 mr-1" />
                                Missing
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setFormType(type);
                                  setFormStyle(style);
                                  setFormContentSid(
                                    existing?.contentSid ||
                                      definition?.existingContentSid ||
                                      ""
                                  );
                                  setEditingTemplate(existing || null);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {existing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(existing.id)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  )}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Add Template"}
              </DialogTitle>
              <DialogDescription>
                Enter the Twilio Content SID for this WhatsApp template. Content SIDs
                start with &quot;HX&quot;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select
                    value={formType}
                    onValueChange={(v) => setFormType(v as WhatsAppTemplateType)}
                    disabled={!!editingTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as WhatsAppTemplateType[]).map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {TYPE_LABELS[type].en}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select
                    value={formStyle}
                    onValueChange={(v) => setFormStyle(v as WhatsAppTemplateStyle)}
                    disabled={!!editingTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["formal", "friendly", "short"] as WhatsAppTemplateStyle[]).map(
                        (style) => (
                          <SelectItem key={style} value={style}>
                            {STYLE_LABELS[style].en}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentSid">Content SID</Label>
                <Input
                  id="contentSid"
                  value={formContentSid}
                  onChange={(e) => setFormContentSid(e.target.value)}
                  placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Twilio Console &gt; Content Template Builder
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {editingTemplate ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
