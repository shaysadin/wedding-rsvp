"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link2, Search, Check, RefreshCw, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";
import {
  fetchTwilioApprovedTemplates,
  assignTwilioContentSid,
} from "@/actions/whatsapp-templates";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AssignContentSidDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialType?: WhatsAppTemplateType;
  initialStyle?: "style1" | "style2" | "style3";
}

interface TwilioTemplate {
  sid: string;
  friendlyName: string;
  language: string;
  dateCreated: string;
  dateUpdated: string;
  previewText: string;
  fullBody: string; // Full template body
  contentType: string;
}

// Note: TRANSPORTATION_INVITE removed - now handled as Style 3 of INVITE/REMINDER types
const TEMPLATE_TYPES: { value: WhatsAppTemplateType; labelHe: string }[] = [
  { value: "INVITE", labelHe: "הזמנה רגילה" },
  { value: "REMINDER", labelHe: "תזכורת רגילה" },
  { value: "INTERACTIVE_INVITE", labelHe: "הזמנה אינטראקטיבית" },
  { value: "INTERACTIVE_REMINDER", labelHe: "תזכורת אינטראקטיבית" },
  { value: "IMAGE_INVITE", labelHe: "הזמנה עם תמונה" },
  { value: "CONFIRMATION", labelHe: "אישור RSVP" },
  { value: "EVENT_DAY", labelHe: "יום האירוע" },
  { value: "THANK_YOU", labelHe: "תודה" },
  { value: "TABLE_ASSIGNMENT", labelHe: "שיבוץ שולחן" },
];

export function AssignContentSidDialogV2({
  open,
  onOpenChange,
  onSuccess,
  initialType,
  initialStyle,
}: AssignContentSidDialogV2Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TwilioTemplate | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<TwilioTemplate | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<WhatsAppTemplateType>(initialType || "INVITE");
  const [style, setStyle] = useState<"style1" | "style2" | "style3">(
    initialStyle || "style1"
  );

  // Update form when initialType/initialStyle changes
  useEffect(() => {
    if (initialType) setType(initialType);
    if (initialStyle) setStyle(initialStyle);
  }, [initialType, initialStyle]);

  // Fetch templates when dialog opens
  useEffect(() => {
    if (open) {
      handleFetchTemplates();
    } else {
      // Reset on close
      setSelectedTemplate(null);
      setSearchQuery("");
      setFetchError(null);
    }
  }, [open]);

  const handleFetchTemplates = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      console.log("[AssignContentSidDialog] Fetching templates...");
      const result = await fetchTwilioApprovedTemplates();
      console.log("[AssignContentSidDialog] Result:", result);

      if (result.success) {
        setTemplates(result.templates as TwilioTemplate[]);
        if (result.templates.length === 0) {
          setFetchError("לא נמצאו תבניות ב-Twilio. צור תבניות חדשות דרך ה-Twilio Console או השתמש ביצירת תבנית מהממשק שלנו.");
        } else {
          toast.success(`נמצאו ${result.templates.length} תבניות`);
        }
      } else {
        console.error("[AssignContentSidDialog] Fetch error:", result.error);
        toast.error(result.error || "שגיאה בטעינת התבניות");
        setFetchError(result.error || "שגיאה בטעינת התבניות מ-Twilio. בדוק את הגדרות Twilio API.");
        setTemplates([]);
      }
    } catch (error) {
      console.error("[AssignContentSidDialog] Exception:", error);
      toast.error("שגיאה בטעינת התבניות");
      setFetchError("שגיאה בטעינת התבניות. בדוק את הגדרות Twilio והרשאות API.");
      setTemplates([]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTemplate) {
      toast.error("נא לבחור תבנית");
      return;
    }

    setIsLoading(true);

    try {
      const result = await assignTwilioContentSid({
        type,
        style,
        contentSid: selectedTemplate.sid,
        friendlyName: selectedTemplate.friendlyName,
        previewText: selectedTemplate.previewText,
      });

      if (result.success) {
        toast.success(result.message || "התבנית שויכה בהצלחה!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "שגיאה בשיוך התבנית");
      }
    } catch (error) {
      toast.error("שגיאה בשיוך התבנית");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates based on search
  const filteredTemplates = templates.filter(
    (template) =>
      template.friendlyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.sid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.previewText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const previewTemplate = hoveredTemplate || selectedTemplate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="!w-[95vw] !max-w-[1600px] max-h-[90vh] overflow-hidden flex flex-col"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            שיוך תבנית קיימת מ-Twilio
          </DialogTitle>
          <DialogDescription>
            בחר תבנית מאושרת מ-Twilio ושייך אותה לסוג תבנית וסגנון.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-8 p-2">
          {/* Left Column: Template Selection */}
          <div className="space-y-4 flex flex-col overflow-hidden pl-2">
            {/* Target Selection */}
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שייך לסוג תבנית</Label>
              <Select value={type} onValueChange={(v) => setType(v as WhatsAppTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.labelHe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>שייך לסגנון</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style1">סגנון 1</SelectItem>
                  <SelectItem value="style2">סגנון 2</SelectItem>
                  <SelectItem value="style3">סגנון 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search and Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש תבניות לפי שם, SID, או תוכן..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                dir="rtl"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFetchTemplates}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Fetch Error Alert */}
          {fetchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}

            {/* Template List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[500px] pr-4">
              {isFetching ? (
                <div className="flex items-center justify-center py-12">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="mr-3 text-muted-foreground">טוען תבניות...</span>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>
                    {searchQuery
                      ? "לא נמצאו תבניות התואמות לחיפוש"
                      : "לא נמצאו תבניות מאושרות"}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      onClick={handleFetchTemplates}
                      className="mt-2"
                    >
                      רענן
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.sid}
                      className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                        selectedTemplate?.sid === template.sid
                          ? "border-primary bg-primary/5 shadow-md"
                          : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                      onMouseEnter={() => setHoveredTemplate(template)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{template.friendlyName}</h4>
                              {selectedTemplate?.sid === template.sid && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <code className="text-xs text-muted-foreground" dir="ltr">
                              {template.sid}
                            </code>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30">
                              {template.language.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.contentType.replace("twilio/", "")}
                            </Badge>
                          </div>
                        </div>

                        {template.previewText && (
                          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                            {template.previewText}...
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            נוצר: {new Date(template.dateCreated).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}</div>
              )}
              </ScrollArea>
            </div>

            {/* Selected Template Info */}
            {selectedTemplate && (
              <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">תבנית נבחרה</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTemplate.friendlyName} → {TEMPLATE_TYPES.find(t => t.value === type)?.labelHe} (סגנון {style.replace("style", "")})
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-gray-800" dir="ltr">
                    {selectedTemplate.sid}
                  </Badge>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Live Preview */}
          <div className="flex flex-col space-y-4 border-r pr-6 border-border overflow-hidden">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">תצוגה מקדימה</h3>
              <p className="text-xs text-muted-foreground">
                {previewTemplate ? "עבור על תבנית או בחר אותה לראות תצוגה מקדימה" : "בחר תבנית לתצוגה מקדימה"}
              </p>
            </div>

            {previewTemplate ? (
              <div className="flex-1 overflow-auto">
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900">
                  {/* WhatsApp-style preview */}
                  <div className="space-y-4">
                    {/* Template Header */}
                    <div className="pb-3 border-b border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                          W
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{previewTemplate.friendlyName}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{previewTemplate.sid}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 text-xs">
                          {previewTemplate.language.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {previewTemplate.contentType.replace("twilio/", "")}
                        </Badge>
                      </div>
                    </div>

                    {/* Message Bubble */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border">
                      <div className="space-y-2">
                        {previewTemplate.fullBody || previewTemplate.previewText ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed break-words" dir="rtl">
                            {previewTemplate.fullBody || previewTemplate.previewText}
                          </p>
                        ) : (
                          <div className="text-center py-4">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                            <p className="text-sm text-muted-foreground">
                              תוכן התבנית לא זמין
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ייתכן שהתבנית טרם הועלתה במלואה לטוויליו
                            </p>
                          </div>
                        )}

                        {/* Show if it's a quick-reply template */}
                        {previewTemplate.contentType === "twilio/quick-reply" && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <p className="text-xs text-muted-foreground mb-2">כפתורים אינטראקטיביים:</p>
                            <div className="space-y-1">
                              <div className="p-2 text-center border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                                כפתור 1
                              </div>
                              <div className="p-2 text-center border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                                כפתור 2
                              </div>
                              <div className="p-2 text-center border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                                כפתור 3
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show if it's a list-picker template */}
                        {previewTemplate.contentType === "twilio/list-picker" && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              <span className="text-sm">רשימת אפשרויות</span>
                            </div>
                          </div>
                        )}

                        {/* Show if it's a card template */}
                        {(previewTemplate.contentType === "twilio/card" || previewTemplate.contentType === "twilio/carousel") && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="p-3 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                <span className="text-sm font-medium">
                                  {previewTemplate.contentType === "twilio/carousel" ? "תבנית קרוסלה" : "תבנית כרטיס"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                כולל תמונות, כפתורים ותוכן עשיר
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="mt-3 flex justify-end">
                        <span className="text-xs text-muted-foreground">
                          {new Date(previewTemplate.dateCreated).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-green-200 dark:border-green-800">
                      <p><strong>נוצר:</strong> {new Date(previewTemplate.dateCreated).toLocaleString('he-IL')}</p>
                      <p><strong>עודכן:</strong> {new Date(previewTemplate.dateUpdated).toLocaleString('he-IL')}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8 text-muted-foreground">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">בחר או עבור על תבנית לראות תצוגה מקדימה</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || !selectedTemplate}>
            {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
            שייך תבנית
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
