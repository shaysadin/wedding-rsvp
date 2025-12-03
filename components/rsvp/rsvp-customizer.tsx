"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WeddingEvent, RsvpPageSettings, RsvpTemplate, BackgroundType, CardStyle } from "@prisma/client";

import {
  updateRsvpPageSettings,
  applyTemplateToEvent,
  saveSettingsAsTemplate,
} from "@/actions/rsvp-settings";
import { uploadBackgroundImage } from "@/actions/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import { RsvpFormPreview } from "./rsvp-form-preview";

interface RsvpCustomizerProps {
  eventId: string;
  event: WeddingEvent;
  initialSettings: RsvpPageSettings | null;
  templates: RsvpTemplate[];
  locale: string;
}

type SettingsState = Partial<RsvpPageSettings>;

const defaultSettings: SettingsState = {
  backgroundType: "COLOR",
  backgroundColor: "#f5f5f5",
  cardStyle: "ELEVATED",
  cardBorderRadius: 12,
  cardPadding: 24,
  cardMaxWidth: 448,
  showEventDetails: true,
  showGoogleMaps: true,
  showCalendar: true,
};

export function RsvpCustomizer({
  eventId,
  event,
  initialSettings,
  templates,
  locale,
}: RsvpCustomizerProps) {
  const t = useTranslations("rsvpSettings");
  const tc = useTranslations("common");
  const router = useRouter();
  const isRTL = locale === "he";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<SettingsState>(
    initialSettings || defaultSettings
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateRsvpPageSettings({
        eventId,
        ...settings,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההגדרות נשמרו בהצלחה" : "Settings saved successfully");
      }
    } catch (error) {
      toast.error(isRTL ? "אירעה שגיאה" : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const result = await applyTemplateToEvent(eventId, templateId);

      if (result.error) {
        toast.error(result.error);
      } else if (result.settings) {
        setSettings(result.settings);
        toast.success(isRTL ? "התבנית הוחלה בהצלחה" : "Template applied successfully");
      }
    } catch (error) {
      toast.error(isRTL ? "אירעה שגיאה" : "An error occurred");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(isRTL ? "נא להעלות קובץ תמונה" : "Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? "התמונה חייבת להיות עד 5MB" : "Image must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const result = await uploadBackgroundImage(base64);

        if (result.error) {
          toast.error(result.error);
        } else if (result.url) {
          updateSetting("backgroundImage", result.url);
          toast.success(isRTL ? "התמונה הועלתה בהצלחה" : "Image uploaded successfully");
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error(isRTL ? "שגיאה בקריאת הקובץ" : "Error reading file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(isRTL ? "שגיאה בהעלאת התמונה" : "Error uploading image");
      setIsUploading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(isRTL ? "נא להזין שם לתבנית" : "Please enter a template name");
      return;
    }

    setIsSavingTemplate(true);
    try {
      // First save current settings
      await updateRsvpPageSettings({
        eventId,
        ...settings,
      });

      // Then create template
      const result = await saveSettingsAsTemplate(
        eventId,
        templateName,
        templateDescription || undefined
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "התבנית נשמרה בהצלחה" : "Template saved successfully");
        setShowSaveTemplateDialog(false);
        setTemplateName("");
        setTemplateDescription("");
      }
    } catch (error) {
      toast.error(isRTL ? "אירעה שגיאה" : "An error occurred");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${locale}/dashboard/events/${eventId}`)}
          className="gap-2"
        >
          <Icons.chevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
          {isRTL ? "חזרה לאירוע" : "Back to Event"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
      {/* Settings Panel */}
      <div className="space-y-6">
        <Tabs defaultValue="background" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="background">{t("background")}</TabsTrigger>
            <TabsTrigger value="card">{t("cardStyle")}</TabsTrigger>
            <TabsTrigger value="content">{t("content")}</TabsTrigger>
            <TabsTrigger value="templates">{isRTL ? "תבניות" : "Templates"}</TabsTrigger>
          </TabsList>

          {/* Background Settings */}
          <TabsContent value="background" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("background")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Background Type */}
                <div className="space-y-2">
                  <Label>{isRTL ? "סוג רקע" : "Background Type"}</Label>
                  <Select
                    value={settings.backgroundType || "COLOR"}
                    onValueChange={(value) =>
                      updateSetting("backgroundType", value as BackgroundType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COLOR">{isRTL ? "צבע" : "Color"}</SelectItem>
                      <SelectItem value="IMAGE">{isRTL ? "תמונה" : "Image"}</SelectItem>
                      <SelectItem value="GRADIENT">{isRTL ? "גרדיאנט" : "Gradient"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Background Color */}
                {settings.backgroundType === "COLOR" && (
                  <div className="space-y-2">
                    <Label>{t("backgroundColor")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.backgroundColor || "#f5f5f5"}
                        onChange={(e) =>
                          updateSetting("backgroundColor", e.target.value)
                        }
                        className="h-10 w-14 cursor-pointer p-1"
                      />
                      <Input
                        value={settings.backgroundColor || "#f5f5f5"}
                        onChange={(e) =>
                          updateSetting("backgroundColor", e.target.value)
                        }
                        placeholder="#f5f5f5"
                      />
                    </div>
                  </div>
                )}

                {/* Background Image */}
                {settings.backgroundType === "IMAGE" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("backgroundImage")}</Label>

                      {/* Image Preview */}
                      {settings.backgroundImage && (
                        <div className="relative h-32 w-full overflow-hidden rounded-lg border">
                          <img
                            src={settings.backgroundImage}
                            alt="Background preview"
                            className="h-full w-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute end-2 top-2"
                            onClick={() => updateSetting("backgroundImage", "")}
                          >
                            <Icons.trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Upload Button */}
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex-1"
                        >
                          {isUploading ? (
                            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Icons.upload className="me-2 h-4 w-4" />
                          )}
                          {isRTL ? "העלה תמונה" : "Upload Image"}
                        </Button>
                      </div>

                      {/* Or enter URL */}
                      <div className="text-center text-sm text-muted-foreground">
                        {isRTL ? "או הזן קישור" : "or enter URL"}
                      </div>
                      <Input
                        value={settings.backgroundImage || ""}
                        onChange={(e) =>
                          updateSetting("backgroundImage", e.target.value)
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {isRTL ? "שכבת כיסוי" : "Overlay"}: {Math.round((settings.backgroundOverlay || 0) * 100)}%
                      </Label>
                      <Slider
                        value={[(settings.backgroundOverlay || 0) * 100]}
                        onValueChange={([value]) =>
                          updateSetting("backgroundOverlay", value / 100)
                        }
                        max={100}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {isRTL ? "טשטוש רקע" : "Background Blur"}: {settings.backgroundBlur || 0}px
                      </Label>
                      <Slider
                        value={[settings.backgroundBlur || 0]}
                        onValueChange={([value]) =>
                          updateSetting("backgroundBlur", value)
                        }
                        max={20}
                        step={1}
                      />
                    </div>
                  </>
                )}

                {/* Gradient */}
                {settings.backgroundType === "GRADIENT" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("primaryColor")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.primaryColor || "#667eea"}
                          onChange={(e) =>
                            updateSetting("primaryColor", e.target.value)
                          }
                          className="h-10 w-14 cursor-pointer p-1"
                        />
                        <Input
                          value={settings.primaryColor || "#667eea"}
                          onChange={(e) =>
                            updateSetting("primaryColor", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("secondaryColor")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.secondaryColor || "#764ba2"}
                          onChange={(e) =>
                            updateSetting("secondaryColor", e.target.value)
                          }
                          className="h-10 w-14 cursor-pointer p-1"
                        />
                        <Input
                          value={settings.secondaryColor || "#764ba2"}
                          onChange={(e) =>
                            updateSetting("secondaryColor", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Card Settings */}
          <TabsContent value="card" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("cardStyle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card Style */}
                <div className="space-y-2">
                  <Label>{isRTL ? "סגנון כרטיס" : "Card Style"}</Label>
                  <Select
                    value={settings.cardStyle || "ELEVATED"}
                    onValueChange={(value) =>
                      updateSetting("cardStyle", value as CardStyle)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">{t("flat")}</SelectItem>
                      <SelectItem value="ELEVATED">{t("elevated")}</SelectItem>
                      <SelectItem value="BORDERED">{t("bordered")}</SelectItem>
                      <SelectItem value="GLASS">{t("glass")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Card Background */}
                <div className="space-y-2">
                  <Label>{isRTL ? "צבע רקע כרטיס" : "Card Background"}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.cardBackground || "#ffffff"}
                      onChange={(e) =>
                        updateSetting("cardBackground", e.target.value)
                      }
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={settings.cardBackground || "#ffffff"}
                      onChange={(e) =>
                        updateSetting("cardBackground", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Label>{t("textColor")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.textColor || "#000000"}
                      onChange={(e) =>
                        updateSetting("textColor", e.target.value)
                      }
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={settings.textColor || "#000000"}
                      onChange={(e) =>
                        updateSetting("textColor", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Border Radius */}
                <div className="space-y-2">
                  <Label>
                    {isRTL ? "עיגול פינות" : "Border Radius"}: {settings.cardBorderRadius || 12}px
                  </Label>
                  <Slider
                    value={[settings.cardBorderRadius || 12]}
                    onValueChange={([value]) =>
                      updateSetting("cardBorderRadius", value)
                    }
                    max={32}
                    step={2}
                  />
                </div>

                {/* Padding */}
                <div className="space-y-2">
                  <Label>
                    {isRTL ? "ריווח פנימי" : "Padding"}: {settings.cardPadding || 24}px
                  </Label>
                  <Slider
                    value={[settings.cardPadding || 24]}
                    onValueChange={([value]) =>
                      updateSetting("cardPadding", value)
                    }
                    max={48}
                    step={4}
                  />
                </div>

                {/* Max Width */}
                <div className="space-y-2">
                  <Label>
                    {isRTL ? "רוחב מקסימלי" : "Max Width"}: {settings.cardMaxWidth || 448}px
                  </Label>
                  <Slider
                    value={[settings.cardMaxWidth || 448]}
                    onValueChange={([value]) =>
                      updateSetting("cardMaxWidth", value)
                    }
                    min={320}
                    max={600}
                    step={16}
                  />
                </div>

                {/* Card Opacity */}
                <div className="space-y-2">
                  <Label>
                    {isRTL ? "שקיפות כרטיס" : "Card Opacity"}: {Math.round((settings.cardOpacity ?? 1) * 100)}%
                  </Label>
                  <Slider
                    value={[(settings.cardOpacity ?? 1) * 100]}
                    onValueChange={([value]) =>
                      updateSetting("cardOpacity", value / 100)
                    }
                    min={50}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Card Blur (Backdrop) */}
                <div className="space-y-2">
                  <Label>
                    {isRTL ? "טשטוש כרטיס" : "Card Blur"}: {settings.cardBlur || 0}px
                  </Label>
                  <Slider
                    value={[settings.cardBlur || 0]}
                    onValueChange={([value]) =>
                      updateSetting("cardBlur", value)
                    }
                    max={20}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "טשטוש רקע מאחורי הכרטיס (אפקט זכוכית)"
                      : "Backdrop blur behind the card (glass effect)"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Settings */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("content")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Page Language */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{isRTL ? "שפת הדף" : "Page Language"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "בחר את השפה שבה יוצג דף האישור לאורחים" : "Choose the language for the RSVP page displayed to guests"}
                  </p>
                  <Select
                    value={settings.pageLocale || "he"}
                    onValueChange={(value) => updateSetting("pageLocale", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">עברית (RTL)</SelectItem>
                      <SelectItem value="en">English (LTR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4" />

                {/* Welcome Title */}
                <div className="space-y-2">
                  <Label>{t("welcomeTitle")}</Label>
                  <Input
                    value={settings.welcomeTitle || ""}
                    onChange={(e) =>
                      updateSetting("welcomeTitle", e.target.value)
                    }
                    placeholder={event.title}
                  />
                </div>

                {/* Welcome Message */}
                <div className="space-y-2">
                  <Label>{t("welcomeMessage")}</Label>
                  <Textarea
                    value={settings.welcomeMessage || ""}
                    onChange={(e) =>
                      updateSetting("welcomeMessage", e.target.value)
                    }
                    placeholder={isRTL ? "שלום, נשמח לדעת אם תוכלו להגיע" : "Hello, we'd love to know if you can attend"}
                    rows={3}
                  />
                </div>

                {/* Thank You Message */}
                <div className="space-y-2">
                  <Label>{t("thankYouMessage")}</Label>
                  <Textarea
                    value={settings.thankYouMessage || ""}
                    onChange={(e) =>
                      updateSetting("thankYouMessage", e.target.value)
                    }
                    placeholder={isRTL ? "תודה על התשובה!" : "Thank you for your response!"}
                    rows={2}
                  />
                </div>

                {/* Decline Message */}
                <div className="space-y-2">
                  <Label>{isRTL ? "הודעת סירוב" : "Decline Message"}</Label>
                  <Textarea
                    value={settings.declineMessage || ""}
                    onChange={(e) =>
                      updateSetting("declineMessage", e.target.value)
                    }
                    placeholder={isRTL ? "מקווים לראותכם בהזדמנות אחרת" : "Hope to see you another time"}
                    rows={2}
                  />
                </div>

                {/* Toggle Options */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label>{isRTL ? "הצג לוח שנה" : "Show Calendar"}</Label>
                    <Switch
                      checked={settings.showCalendar !== false}
                      onCheckedChange={(checked) =>
                        updateSetting("showCalendar", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{isRTL ? "הצג פרטי אירוע" : "Show Event Details"}</Label>
                    <Switch
                      checked={settings.showEventDetails !== false}
                      onCheckedChange={(checked) =>
                        updateSetting("showEventDetails", checked)
                      }
                    />
                  </div>
                </div>

                <div className="border-t pt-4" />

                {/* Navigation Links */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">{isRTL ? "קישורי ניווט" : "Navigation Links"}</Label>

                  {/* Google Maps */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Icons.mapPin className="h-4 w-4" />
                        Google Maps
                      </Label>
                      <Switch
                        checked={settings.showGoogleMaps !== false}
                        onCheckedChange={(checked) =>
                          updateSetting("showGoogleMaps", checked)
                        }
                      />
                    </div>
                    {settings.showGoogleMaps !== false && (
                      <Input
                        value={settings.googleMapsUrl || ""}
                        onChange={(e) => updateSetting("googleMapsUrl", e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="text-sm"
                        dir="ltr"
                      />
                    )}
                  </div>

                  {/* Waze */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Icons.mapPin className="h-4 w-4" />
                        Waze
                      </Label>
                      <Switch
                        checked={settings.showWaze !== false}
                        onCheckedChange={(checked) =>
                          updateSetting("showWaze", checked)
                        }
                      />
                    </div>
                    {settings.showWaze !== false && (
                      <Input
                        value={settings.wazeUrl || ""}
                        onChange={(e) => updateSetting("wazeUrl", e.target.value)}
                        placeholder="https://waze.com/ul/..."
                        className="text-sm"
                        dir="ltr"
                      />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "הזן קישורים ישירים לניווט. אם לא הוזן קישור, יופק קישור אוטומטי לפי כתובת האירוע."
                      : "Enter direct navigation links. If no link is provided, one will be auto-generated from the event address."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{isRTL ? "תבניות" : "Templates"}</span>
                  <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Icons.save className="me-2 h-4 w-4" />
                        {isRTL ? "שמור כתבנית" : "Save as Template"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{isRTL ? "שמור כתבנית" : "Save as Template"}</DialogTitle>
                        <DialogDescription>
                          {isRTL
                            ? "שמור את ההגדרות הנוכחיות כתבנית לשימוש עתידי"
                            : "Save current settings as a template for future use"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{isRTL ? "שם התבנית" : "Template Name"}</Label>
                          <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder={isRTL ? "התבנית שלי" : "My Template"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{isRTL ? "תיאור (אופציונלי)" : "Description (optional)"}</Label>
                          <Textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder={isRTL ? "תיאור קצר של התבנית" : "Brief description of the template"}
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowSaveTemplateDialog(false)}
                        >
                          {tc("cancel")}
                        </Button>
                        <Button
                          onClick={handleSaveAsTemplate}
                          disabled={isSavingTemplate}
                        >
                          {isSavingTemplate && (
                            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                          )}
                          {tc("save")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  {isRTL
                    ? "בחר תבנית להחלה על דף האישור"
                    : "Choose a template to apply to your RSVP page"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3">
                    {templates.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {isRTL ? "אין תבניות זמינות" : "No templates available"}
                      </p>
                    ) : (
                      templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                        >
                          <div>
                            <p className="font-medium">{template.name}</p>
                            {template.description && (
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            )}
                            {template.isSystem && (
                              <span className="text-xs text-primary">
                                {isRTL ? "תבנית מערכת" : "System Template"}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyTemplate(template.id)}
                          >
                            {isRTL ? "החל" : "Apply"}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
            <Icons.save className="me-2 h-4 w-4" />
            {t("saveChanges")}
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="sticky top-20">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icons.eye className="h-5 w-5" />
              {t("preview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border" style={{ height: "600px" }}>
              <RsvpFormPreview
                settings={settings as RsvpPageSettings}
                event={event}
                locale={settings.pageLocale || "he"}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
