"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyTemplateToEvent,
  saveSettingsAsTemplate,
  updateRsvpPageSettings,
} from "@/actions/rsvp-settings";
import { uploadBackgroundImage } from "@/actions/upload";
import {
  BackgroundType,
  CardStyle,
  RsvpPageSettings,
  RsvpTemplate,
  WeddingEvent,
} from "@prisma/client";
import Color from "color";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronLeft,
  Eye,
  Image,
  LayoutGrid,
  MapPin,
  MousePointer,
  Palette,
  Save,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from "@/components/ui/color-picker";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";

import { DevicePreview } from "./device-preview";
import { RsvpFormPreview } from "./rsvp-form-preview";

interface RsvpCustomizerProps {
  eventId: string;
  event: WeddingEvent;
  initialSettings: RsvpPageSettings | null;
  templates: RsvpTemplate[];
  locale: string;
}

type SettingsState = Partial<RsvpPageSettings>;
type DateDisplayStyle = "CARD" | "CALENDAR" | "MINIMAL";
type TabValue = "style" | "layout" | "content" | "settings";

const tabs: {
  value: TabValue;
  icon: typeof Palette;
  labelEn: string;
  labelHe: string;
}[] = [
  { value: "style", icon: Palette, labelEn: "Style", labelHe: "עיצוב" },
  { value: "layout", icon: LayoutGrid, labelEn: "Layout", labelHe: "פריסה" },
  { value: "content", icon: Type, labelEn: "Content", labelHe: "תוכן" },
  {
    value: "settings",
    icon: Settings2,
    labelEn: "Settings",
    labelHe: "הגדרות",
  },
];

const defaultSettings: SettingsState = {
  // Mode
  advancedMode: false,
  // Background
  backgroundType: "IMAGE",
  backgroundColor: "#f5f5f5",
  // Colors (Simple)
  primaryColor: "#1a1a1a",
  secondaryColor: "#374151",
  accentColor: "#1a1a1a",
  // Card (Simple)
  cardStyle: "GLASS",
  cardOpacity: 0.95,
  cardBlur: 8,
  // Date Display (Simple)
  dateDisplayStyle: "CALENDAR" as DateDisplayStyle,
  showCountdown: true,
  // Visibility
  showGoogleMaps: true,
  showWaze: true,
  // Advanced Card Settings
  cardBorderRadius: 16,
  cardPadding: 24,
  cardMaxWidth: 600,
  cardBorderWidth: 0,
  cardBorderColor: "#e5e7eb",
  cardShadow: true,
  buttonShadow: true,
  pageLocale: "he",
};

// Compact Color Picker Component
function CompactColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  // Get display hex (without alpha for display)
  const displayHex = useMemo(() => {
    try {
      const color = Color(value);
      return color.hex();
    } catch {
      return value;
    }
  }, [value]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {displayHex}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-7 w-7 rounded-md border-2 border-border shadow-sm transition-all hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              style={{ backgroundColor: value }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <ColorPicker value={value} onChange={onChange} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Modern Slider with value display
function ModernSlider({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  unit = "px",
  isRTL = false,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  isRTL?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-7 w-16 text-center text-xs"
            min={min}
            max={max}
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full"
      />
    </div>
  );
}

// Option Pills Component
function OptionPills<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
            value === option
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

// Toggle Switch Row
function ToggleSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

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
    initialSettings || defaultSettings,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>("style");
  const layoutId = useId();

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
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
        toast.success(
          isRTL ? "ההגדרות נשמרו בהצלחה" : "Settings saved successfully",
        );
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
        toast.success(
          isRTL ? "התבנית הוחלה בהצלחה" : "Template applied successfully",
        );
        setShowTemplatesDialog(false);
      }
    } catch (error) {
      toast.error(isRTL ? "אירעה שגיאה" : "An error occurred");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error(
        isRTL
          ? "פורמט לא נתמך. נא להעלות קובץ JPEG, PNG, WebP או GIF"
          : "Unsupported format. Please upload JPEG, PNG, WebP or GIF",
      );
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(
        isRTL
          ? `התמונה גדולה מדי (${fileSizeMB}MB). הגודל המקסימלי הוא 5MB`
          : `Image is too large (${fileSizeMB}MB). Maximum size is 5MB`,
      );
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const result = await uploadBackgroundImage(base64);

          if (result.error) {
            // Show localized error messages
            if (result.error.includes("too large")) {
              toast.error(
                isRTL
                  ? "התמונה גדולה מדי. הגודל המקסימלי הוא 5MB"
                  : result.error,
              );
            } else if (result.error === "Unauthorized") {
              toast.error(
                isRTL
                  ? "אין הרשאה להעלות תמונות"
                  : "You don't have permission to upload images",
              );
            } else {
              toast.error(
                isRTL ? "שגיאה בהעלאת התמונה. נסה שוב" : result.error,
              );
            }
          } else if (result.url) {
            updateSetting("backgroundImage", result.url);
            toast.success(
              isRTL ? "התמונה הועלתה בהצלחה" : "Image uploaded successfully",
            );
          }
        } catch (uploadError: any) {
          console.error("Upload error:", uploadError);
          // Handle body size limit error
          if (uploadError.message?.includes("Body exceeded")) {
            toast.error(
              isRTL
                ? "התמונה גדולה מדי. הגודל המקסימלי הוא 5MB"
                : "Image is too large. Maximum size is 5MB",
            );
          } else {
            toast.error(
              isRTL ? "שגיאה בהעלאת התמונה. נסה שוב" : "Error uploading image. Please try again",
            );
          }
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error(
          isRTL ? "שגיאה בקריאת הקובץ. נסה שוב" : "Error reading file. Please try again",
        );
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(
        isRTL ? "שגיאה בהעלאת התמונה. נסה שוב" : "Error uploading image. Please try again",
      );
      setIsUploading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(
        isRTL ? "נא להזין שם לתבנית" : "Please enter a template name",
      );
      return;
    }

    setIsSavingTemplate(true);
    try {
      await updateRsvpPageSettings({ eventId, ...settings });
      const result = await saveSettingsAsTemplate(
        eventId,
        templateName,
        templateDescription || undefined,
        true, // isGlobal - makes it a system template available to all users
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isRTL ? "התבנית נשמרה בהצלחה" : "Template saved successfully",
        );
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

  // Labels
  const bgTypeLabels = {
    COLOR: isRTL ? "צבע" : "Color",
    IMAGE: isRTL ? "תמונה" : "Image",
    GRADIENT: isRTL ? "גרדיאנט" : "Gradient",
  } as Record<BackgroundType, string>;

  const cardStyleLabels = {
    FLAT: isRTL ? "שטוח" : "Flat",
    ELEVATED: isRTL ? "מורם" : "Elevated",
    BORDERED: isRTL ? "ממוסגר" : "Bordered",
    GLASS: isRTL ? "זכוכית" : "Glass",
  } as Record<CardStyle, string>;

  const dateStyleLabels = {
    CARD: isRTL ? "כרטיס" : "Card",
    CALENDAR: isRTL ? "לוח שנה" : "Calendar",
    MINIMAL: isRTL ? "מינימלי" : "Minimal",
  } as Record<DateDisplayStyle, string>;

  const buttonStyleLabels = {
    solid: isRTL ? "מלא" : "Solid",
    outline: isRTL ? "מסגרת" : "Outline",
    ghost: isRTL ? "שקוף" : "Ghost",
  };

  const buttonSizeLabels = {
    sm: "S",
    md: "M",
    lg: "L",
  };

  return (
    <div
      className="-mx-4 -mt-4 flex h-[calc(100vh_-_76px)] flex-col lg:-mx-8 xl:-mx-8"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              router.push(`/${locale}/dashboard/events/${eventId}`)
            }
          >
            <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">
              {isRTL ? "עיצוב דף האישור" : "Customize RSVP"}
            </h1>
            <p className="text-xs text-muted-foreground">{event.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={showTemplatesDialog}
            onOpenChange={setShowTemplatesDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Sparkles className="me-1.5 h-3.5 w-3.5" />
                {isRTL ? "תבניות" : "Templates"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {isRTL ? "בחר תבנית" : "Choose Template"}
                </DialogTitle>
                <DialogDescription>
                  {isRTL
                    ? "בחר תבנית מוכנה להחלה על דף האישור"
                    : "Select a ready-made template for your RSVP page"}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 p-1">
                  {templates.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      {isRTL ? "אין תבניות זמינות" : "No templates available"}
                    </p>
                  ) : (
                    templates.map((template) => (
                      <button
                        key={template.id}
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-start transition-colors hover:bg-accent"
                        onClick={() => handleApplyTemplate(template.id)}
                      >
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="line-clamp-1 text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          )}
                          {template.isSystem && (
                            <span className="text-xs text-primary">
                              {isRTL ? "תבנית מערכת" : "System"}
                            </span>
                          )}
                        </div>
                        <ChevronLeft
                          className={cn("h-4 w-4", !isRTL && "rotate-180")}
                        />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showSaveTemplateDialog}
            onOpenChange={setShowSaveTemplateDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Save className="me-1.5 h-3.5 w-3.5" />
                {isRTL ? "שמור" : "Save"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isRTL ? "שמור כתבנית" : "Save as Template"}
                </DialogTitle>
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
                  <Label>
                    {isRTL ? "תיאור (אופציונלי)" : "Description (optional)"}
                  </Label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder={isRTL ? "תיאור קצר" : "Brief description"}
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

          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-8"
          >
            {isSaving ? (
              <Icons.spinner className="me-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="me-1.5 h-3.5 w-3.5" />
            )}
            {t("saveChanges")}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
        {/* Settings Panel */}
        <div className="flex min-h-0 max-h-[89vh] flex-col border-e bg-background" dir={isRTL ? "rtl" : "ltr"}>
          {/* Animated Tabs */}
          <div className="shrink-0 border-b bg-muted/30">
            <div className="flex gap-1 p-1">
              {tabs
                .filter((tab) => {
                  // Hide Layout tab in simple mode
                  if (tab.value === "layout" && !settings.advancedMode) {
                    return false;
                  }
                  return true;
                })
                .map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={`${layoutId}-tab-bg`}
                        className="absolute inset-0 rounded-md bg-background shadow-sm"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.4,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {isRTL ? tab.labelHe : tab.labelEn}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content with Animation */}
          <div className="min-h-0 flex-1 overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            <ScrollArea className="h-full" dir={isRTL ? "rtl" : "ltr"}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5 p-4"
                >
                  {/* Style Tab */}
                  {activeTab === "style" && (
                    <>
                      {/* ===== SIMPLE MODE CONTROLS ===== */}

                      {/* Background */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Image className="h-4 w-4" />
                          {isRTL ? "רקע" : "Background"}
                        </h3>
                        <OptionPills
                          options={
                            ["COLOR", "IMAGE", "GRADIENT"] as BackgroundType[]
                          }
                          value={settings.backgroundType || "IMAGE"}
                          onChange={(value) =>
                            updateSetting("backgroundType", value)
                          }
                          labels={bgTypeLabels}
                        />

                        {settings.backgroundType === "COLOR" && (
                          <CompactColorPicker
                            label={isRTL ? "צבע רקע" : "Background Color"}
                            value={settings.backgroundColor || "#f5f5f5"}
                            onChange={(value) =>
                              updateSetting("backgroundColor", value)
                            }
                          />
                        )}

                        {settings.backgroundType === "IMAGE" && (
                          <div className="space-y-3">
                            {settings.backgroundImage ? (
                              <div className="relative h-32 w-full overflow-hidden rounded-lg border">
                                <img
                                  src={settings.backgroundImage}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute end-2 top-2 h-8 w-8"
                                  onClick={() =>
                                    updateSetting("backgroundImage", "")
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
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
                                  className="w-full"
                                >
                                  {isUploading ? (
                                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="me-2 h-4 w-4" />
                                  )}
                                  {isRTL ? "העלה תמונה" : "Upload Image"}
                                </Button>
                              </>
                            )}
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "שכבת כיסוי" : "Overlay"}
                              value={Math.round(
                                (settings.backgroundOverlay || 0) * 100,
                              )}
                              onChange={(v) =>
                                updateSetting("backgroundOverlay", v / 100)
                              }
                              max={100}
                              unit="%"
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "טשטוש" : "Blur"}
                              value={settings.backgroundBlur || 0}
                              onChange={(v) =>
                                updateSetting("backgroundBlur", v)
                              }
                              max={20}
                            />
                          </div>
                        )}

                        {settings.backgroundType === "GRADIENT" && (
                          <div className="space-y-3">
                            <CompactColorPicker
                              label={isRTL ? "צבע ראשי" : "Primary"}
                              value={settings.primaryColor || "#667eea"}
                              onChange={(value) =>
                                updateSetting("primaryColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "צבע משני" : "Secondary"}
                              value={settings.secondaryColor || "#764ba2"}
                              onChange={(value) =>
                                updateSetting("secondaryColor", value)
                              }
                            />
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Theme Color */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Palette className="h-4 w-4" />
                          {isRTL ? "צבע נושא" : "Theme Color"}
                        </h3>
                        <CompactColorPicker
                          label={isRTL ? "צבע הדגשה" : "Accent Color"}
                          value={settings.accentColor || "#1a1a1a"}
                          onChange={(value) => {
                            updateSetting("accentColor", value);
                            // Also update dateCardAccentColor to sync with theme
                            updateSetting("dateCardAccentColor", value);
                          }}
                        />
                      </div>

                      <Separator />

                      {/* Card Style (Simple) - Only background, opacity, blur */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Square className="h-4 w-4" />
                          {isRTL ? "כרטיס" : "Card"}
                        </h3>
                        <CompactColorPicker
                          label={isRTL ? "רקע כרטיס" : "Card Background"}
                          value={settings.cardBackground || "#ffffff"}
                          onChange={(value) =>
                            updateSetting("cardBackground", value)
                          }
                        />
                        <ModernSlider isRTL={isRTL}
                          label={isRTL ? "טשטוש" : "Blur"}
                          value={settings.cardBlur || 0}
                          onChange={(v) => updateSetting("cardBlur", v)}
                          max={20}
                        />
                        <CompactColorPicker
                          label={isRTL ? "צבע גבול" : "Border Color"}
                          value={settings.cardBorderColor || "#e5e7eb"}
                          onChange={(value) =>
                            updateSetting("cardBorderColor", value)
                          }
                        />
                        <ModernSlider isRTL={isRTL}
                          label={isRTL ? "עובי גבול" : "Border Width"}
                          value={settings.cardBorderWidth || 0}
                          onChange={(v) => updateSetting("cardBorderWidth", v)}
                          max={5}
                        />
                        <ToggleSwitch
                          label={isRTL ? "צל" : "Shadow"}
                          checked={settings.cardShadow !== false}
                          onCheckedChange={(checked) =>
                            updateSetting("cardShadow", checked)
                          }
                        />
                        <ModernSlider isRTL={isRTL}
                          label={isRTL ? "רוחב מקסימלי" : "Max Width"}
                          value={settings.cardMaxWidth || 600}
                          onChange={(v) => updateSetting("cardMaxWidth", v)}
                          min={320}
                          max={800}
                          step={10}
                          unit="px"
                        />
                      </div>

                      <Separator />

                      {/* Date Display Style */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Calendar className="h-4 w-4" />
                          {isRTL ? "תצוגת תאריך" : "Date Display"}
                        </h3>
                        <OptionPills
                          options={
                            [
                              "CARD",
                              "CALENDAR",
                              "MINIMAL",
                            ] as DateDisplayStyle[]
                          }
                          value={
                            (settings.dateDisplayStyle as DateDisplayStyle) ||
                            "CALENDAR"
                          }
                          onChange={(value) =>
                            updateSetting("dateDisplayStyle", value)
                          }
                          labels={dateStyleLabels}
                        />
                        <ToggleSwitch
                          label={isRTL ? "ספירה לאחור" : "Show Countdown"}
                          checked={settings.showCountdown !== false}
                          onCheckedChange={(checked) =>
                            updateSetting("showCountdown", checked)
                          }
                        />
                      </div>

                      <Separator />

                      {/* Visibility Toggles */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Eye className="h-4 w-4" />
                          {isRTL ? "תצוגה" : "Display"}
                        </h3>
                        <ToggleSwitch
                          label={isRTL ? "הצג שעה" : "Show Time"}
                          checked={settings.showTimeSection !== false}
                          onCheckedChange={(checked) =>
                            updateSetting("showTimeSection", checked)
                          }
                        />
                        <ToggleSwitch
                          label={isRTL ? "הצג כתובת" : "Show Address"}
                          checked={settings.showAddressSection !== false}
                          onCheckedChange={(checked) =>
                            updateSetting("showAddressSection", checked)
                          }
                        />
                        <ToggleSwitch
                          label="Google Maps"
                          checked={settings.showGoogleMaps !== false}
                          onCheckedChange={(checked) =>
                            updateSetting("showGoogleMaps", checked)
                          }
                        />
                        <ToggleSwitch
                          label="Waze"
                          checked={settings.showWaze !== false}
                          onCheckedChange={(checked) =>
                            updateSetting("showWaze", checked)
                          }
                        />
                      </div>

                      {/* ===== ADVANCED MODE CONTROLS ===== */}
                      {settings.advancedMode && (
                        <>
                          <Separator />

                          {/* Advanced: Card Detailed Settings */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium text-muted-foreground">
                              <Wand2 className="h-4 w-4" />
                              {isRTL ? "כרטיס - מתקדם" : "Card - Advanced"}
                            </h3>
                            <CompactColorPicker
                              label={isRTL ? "רקע כרטיס" : "Card Background"}
                              value={settings.cardBackground || "#ffffff"}
                              onChange={(value) =>
                                updateSetting("cardBackground", value)
                              }
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "עיגול פינות" : "Border Radius"}
                              value={settings.cardBorderRadius || 16}
                              onChange={(v) => updateSetting("cardBorderRadius", v)}
                              max={32}
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "ריווח פנימי" : "Padding"}
                              value={settings.cardPadding || 24}
                              onChange={(v) => updateSetting("cardPadding", v)}
                              max={48}
                            />
                          </div>

                          <Separator />

                          {/* Advanced: Text Colors */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium text-muted-foreground">
                              <Type className="h-4 w-4" />
                              {isRTL ? "צבעי טקסט - מתקדם" : "Text Colors - Advanced"}
                            </h3>
                            <CompactColorPicker
                              label={isRTL ? "טקסט ראשי" : "Text Color"}
                              value={settings.textColor || "#000000"}
                              onChange={(value) =>
                                updateSetting("textColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "טקסט משני" : "Subtitle Color"}
                              value={settings.subtitleTextColor || "#666666"}
                              onChange={(value) =>
                                updateSetting("subtitleTextColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "תוויות" : "Label Color"}
                              value={settings.labelTextColor || "#374151"}
                              onChange={(value) =>
                                updateSetting("labelTextColor", value)
                              }
                            />
                          </div>

                          <Separator />

                          {/* Advanced: Input Fields */}
                          <div className="space-y-4">
                            <h3 className="font-medium text-muted-foreground">
                              {isRTL ? "שדות קלט - מתקדם" : "Input Fields - Advanced"}
                            </h3>
                            <CompactColorPicker
                              label={isRTL ? "רקע" : "Background"}
                              value={settings.inputBackgroundColor || "#ffffff"}
                              onChange={(value) =>
                                updateSetting("inputBackgroundColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "טקסט" : "Text"}
                              value={settings.inputTextColor || "#000000"}
                              onChange={(value) =>
                                updateSetting("inputTextColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "מסגרת" : "Border"}
                              value={settings.inputBorderColor || "#e5e7eb"}
                              onChange={(value) =>
                                updateSetting("inputBorderColor", value)
                              }
                            />
                          </div>

                          <Separator />

                          {/* Advanced: Guest Counter */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {isRTL ? "בורר אורחים - מתקדם" : "Guest Counter - Advanced"}
                            </h3>
                            <CompactColorPicker
                              label={isRTL ? "רקע" : "Background"}
                              value={settings.guestCounterBackground || "#ffffff"}
                              onChange={(value) =>
                                updateSetting("guestCounterBackground", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "טקסט" : "Text"}
                              value={settings.guestCounterTextColor || "#000000"}
                              onChange={(value) =>
                                updateSetting("guestCounterTextColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "כפתורים" : "Buttons"}
                              value={settings.guestCounterAccent || "#6366f1"}
                              onChange={(value) =>
                                updateSetting("guestCounterAccent", value)
                              }
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Layout Tab - Only shown in Advanced Mode */}
                  {activeTab === "layout" && (
                    <>
                      {!settings.advancedMode ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Wand2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
                          <h3 className="mb-2 font-medium">
                            {isRTL ? "מצב מתקדם נדרש" : "Advanced Mode Required"}
                          </h3>
                          <p className="mb-4 text-sm text-muted-foreground">
                            {isRTL
                              ? "הפעל מצב מתקדם בהגדרות כדי לגשת לאפשרויות פריסה מפורטות"
                              : "Enable Advanced Mode in Settings to access detailed layout options"}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab("settings")}
                          >
                            {isRTL ? "עבור להגדרות" : "Go to Settings"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Date Card Styling */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium">
                              <Calendar className="h-4 w-4" />
                              {isRTL ? "כרטיס תאריך" : "Date Card"}
                            </h3>
                            <CompactColorPicker
                              label={isRTL ? "רקע" : "Background"}
                              value={settings.dateCardBackground || "#667eea"}
                              onChange={(value) =>
                                updateSetting("dateCardBackground", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "טקסט" : "Text"}
                              value={settings.dateCardTextColor || "#ffffff"}
                              onChange={(value) =>
                                updateSetting("dateCardTextColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "הדגשה" : "Accent"}
                              value={settings.dateCardAccentColor || "#ffffff"}
                              onChange={(value) =>
                                updateSetting("dateCardAccentColor", value)
                              }
                            />
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "עיגול פינות" : "Border Radius"}
                              value={settings.dateCardBorderRadius || 12}
                              onChange={(v) =>
                                updateSetting("dateCardBorderRadius", v)
                              }
                              max={32}
                            />
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "ריווח פנימי" : "Padding"}
                              value={settings.dateCardPadding || 16}
                              onChange={(v) =>
                                updateSetting("dateCardPadding", v)
                              }
                              max={48}
                            />
                            <ToggleSwitch
                              label={isRTL ? "צל" : "Shadow"}
                              checked={settings.dateCardShadow !== false}
                              onCheckedChange={(checked) =>
                                updateSetting("dateCardShadow", checked)
                              }
                            />

                            {/* Date Font Sizes */}
                            <div className="mt-2 border-t pt-3">
                              <Label className="text-xs font-medium text-muted-foreground">
                                {isRTL ? "גודל טקסט תאריך" : "Date Font Sizes"}
                              </Label>
                            </div>
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "יום" : "Day"}
                              value={settings.dateDayFontSize || 48}
                              onChange={(v) =>
                                updateSetting("dateDayFontSize", v)
                              }
                              min={24}
                              max={72}
                            />
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "חודש" : "Month"}
                              value={settings.dateMonthFontSize || 14}
                              onChange={(v) =>
                                updateSetting("dateMonthFontSize", v)
                              }
                              min={10}
                              max={24}
                            />
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "שנה" : "Year"}
                              value={settings.dateYearFontSize || 14}
                              onChange={(v) =>
                                updateSetting("dateYearFontSize", v)
                              }
                              min={10}
                              max={24}
                            />
                          </div>

                          <Separator />

                          {/* Time Section Styling */}
                          {settings.showTimeSection !== false && (
                            <>
                              <div className="space-y-4">
                                <h3 className="font-medium">
                                  {isRTL ? "אזור שעה" : "Time Section"}
                                </h3>
                                <CompactColorPicker
                                  label={isRTL ? "רקע" : "Background"}
                                  value={settings.timeSectionBackground || "#f3f4f6"}
                                  onChange={(value) =>
                                    updateSetting("timeSectionBackground", value)
                                  }
                                />
                                <CompactColorPicker
                                  label={isRTL ? "טקסט" : "Text"}
                                  value={settings.timeSectionTextColor || "#374151"}
                                  onChange={(value) =>
                                    updateSetting("timeSectionTextColor", value)
                                  }
                                />
                                <ModernSlider
                                  isRTL={isRTL}
                                  label={isRTL ? "עיגול פינות" : "Border Radius"}
                                  value={settings.timeSectionBorderRadius || 8}
                                  onChange={(v) =>
                                    updateSetting("timeSectionBorderRadius", v)
                                  }
                                  max={24}
                                />
                                <ModernSlider
                                  isRTL={isRTL}
                                  label={isRTL ? "גודל טקסט" : "Font Size"}
                                  value={settings.timeFontSize || 14}
                                  onChange={(v) =>
                                    updateSetting("timeFontSize", v)
                                  }
                                  min={10}
                                  max={24}
                                />
                              </div>
                              <Separator />
                            </>
                          )}

                          {/* Address Section Styling */}
                          {settings.showAddressSection !== false && (
                            <>
                              <div className="space-y-4">
                                <h3 className="font-medium">
                                  {isRTL ? "אזור כתובת" : "Address Section"}
                                </h3>
                                <CompactColorPicker
                                  label={isRTL ? "רקע" : "Background"}
                                  value={settings.addressSectionBackground || "#f3f4f6"}
                                  onChange={(value) =>
                                    updateSetting("addressSectionBackground", value)
                                  }
                                />
                                <CompactColorPicker
                                  label={isRTL ? "טקסט" : "Text"}
                                  value={settings.addressSectionTextColor || "#374151"}
                                  onChange={(value) =>
                                    updateSetting("addressSectionTextColor", value)
                                  }
                                />
                                <ModernSlider
                                  isRTL={isRTL}
                                  label={isRTL ? "עיגול פינות" : "Border Radius"}
                                  value={settings.addressSectionBorderRadius || 8}
                                  onChange={(v) =>
                                    updateSetting("addressSectionBorderRadius", v)
                                  }
                                  max={24}
                                />
                                <ModernSlider
                                  isRTL={isRTL}
                                  label={isRTL ? "גודל טקסט" : "Font Size"}
                                  value={settings.addressFontSize || 12}
                                  onChange={(v) =>
                                    updateSetting("addressFontSize", v)
                                  }
                                  min={10}
                                  max={20}
                                />
                              </div>
                              <Separator />
                            </>
                          )}

                          {/* Countdown Section Styling */}
                          {settings.showCountdown !== false && (
                            <>
                              <div className="space-y-4">
                                <h3 className="font-medium">
                                  {isRTL ? "ספירה לאחור" : "Countdown Section"}
                                </h3>
                                <CompactColorPicker
                                  label={isRTL ? "רקע אזור" : "Section Background"}
                                  value={settings.countdownSectionBackground || "transparent"}
                                  onChange={(value) =>
                                    updateSetting("countdownSectionBackground", value)
                                  }
                                />
                                <CompactColorPicker
                                  label={isRTL ? "רקע קופסאות" : "Box Background"}
                                  value={settings.countdownBoxBackground || "#f3f4f6"}
                                  onChange={(value) =>
                                    updateSetting("countdownBoxBackground", value)
                                  }
                                />
                                <CompactColorPicker
                                  label={isRTL ? "מספרים" : "Numbers"}
                                  value={settings.countdownBoxTextColor || "#111827"}
                                  onChange={(value) =>
                                    updateSetting("countdownBoxTextColor", value)
                                  }
                                />
                                <CompactColorPicker
                                  label={isRTL ? "תוויות" : "Labels"}
                                  value={settings.countdownLabelColor || "#6b7280"}
                                  onChange={(value) =>
                                    updateSetting("countdownLabelColor", value)
                                  }
                                />
                                <ModernSlider
                                  isRTL={isRTL}
                                  label={isRTL ? "עיגול פינות" : "Border Radius"}
                                  value={settings.countdownSectionBorderRadius || 8}
                                  onChange={(v) =>
                                    updateSetting("countdownSectionBorderRadius", v)
                                  }
                                  max={24}
                                />
                                <ModernSlider
                                  isRTL={isRTL}
                                  label={isRTL ? "גודל מספרים" : "Number Size"}
                                  value={settings.countdownNumberFontSize || 24}
                                  onChange={(v) =>
                                    updateSetting("countdownNumberFontSize", v)
                                  }
                                  min={16}
                                  max={48}
                                />
                              </div>
                              <Separator />
                            </>
                          )}

                          {/* RSVP Question Section */}
                          <div className="space-y-4">
                            <h3 className="font-medium">
                              {isRTL ? "שאלת אישור הגעה" : "RSVP Question"}
                            </h3>
                            <CompactColorPicker
                              label={isRTL ? "רקע אזור" : "Section Background"}
                              value={settings.questionSectionBackground || "transparent"}
                              onChange={(value) =>
                                updateSetting("questionSectionBackground", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "צבע שאלה" : "Question Text"}
                              value={settings.questionTextColor || "#374151"}
                              onChange={(value) =>
                                updateSetting("questionTextColor", value)
                              }
                            />
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "עיגול פינות" : "Border Radius"}
                              value={settings.questionSectionBorderRadius || 8}
                              onChange={(v) =>
                                updateSetting("questionSectionBorderRadius", v)
                              }
                              max={24}
                            />
                            <ModernSlider
                              isRTL={isRTL}
                              label={isRTL ? "גודל טקסט" : "Font Size"}
                              value={settings.questionFontSize || 14}
                              onChange={(v) =>
                                updateSetting("questionFontSize", v)
                              }
                              min={10}
                              max={24}
                            />

                            {/* Accept/Decline Buttons */}
                            <div className="mt-2 border-t pt-3">
                              <Label className="text-xs font-medium text-muted-foreground">
                                {isRTL ? "כפתור אישור" : "Accept Button"}
                              </Label>
                            </div>
                            <CompactColorPicker
                              label={isRTL ? "צבע" : "Color"}
                              value={settings.acceptButtonColor || "#22c55e"}
                              onChange={(value) =>
                                updateSetting("acceptButtonColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "טקסט" : "Text"}
                              value={settings.acceptButtonTextColor || "#166534"}
                              onChange={(value) =>
                                updateSetting("acceptButtonTextColor", value)
                              }
                            />

                            <div className="mt-2 border-t pt-3">
                              <Label className="text-xs font-medium text-muted-foreground">
                                {isRTL ? "כפתור סירוב" : "Decline Button"}
                              </Label>
                            </div>
                            <CompactColorPicker
                              label={isRTL ? "צבע" : "Color"}
                              value={settings.declineButtonColor || "#ef4444"}
                              onChange={(value) =>
                                updateSetting("declineButtonColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "טקסט" : "Text"}
                              value={settings.declineButtonTextColor || "#991b1b"}
                              onChange={(value) =>
                                updateSetting("declineButtonTextColor", value)
                              }
                            />
                          </div>

                          <Separator />

                          {/* Button Style */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium">
                              <MousePointer className="h-4 w-4" />
                              {isRTL ? "כפתור שליחה" : "Submit Button"}
                            </h3>
                            <div className="space-y-2">
                              <Label className="text-sm">
                                {isRTL ? "סגנון" : "Style"}
                              </Label>
                              <OptionPills
                                options={["solid", "outline", "ghost"]}
                                value={(settings.buttonStyle as string) || "solid"}
                                onChange={(value) =>
                                  updateSetting("buttonStyle", value)
                                }
                                labels={buttonStyleLabels}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">
                                {isRTL ? "גודל" : "Size"}
                              </Label>
                              <OptionPills
                                options={["sm", "md", "lg"]}
                                value={(settings.buttonSize as string) || "md"}
                                onChange={(value) =>
                                  updateSetting("buttonSize", value)
                                }
                                labels={buttonSizeLabels}
                              />
                            </div>
                            <CompactColorPicker
                              label={isRTL ? "צבע רקע" : "Background"}
                              value={settings.buttonColor || "#000000"}
                              onChange={(value) =>
                                updateSetting("buttonColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "צבע טקסט" : "Text"}
                              value={settings.buttonTextColor || "#ffffff"}
                              onChange={(value) =>
                                updateSetting("buttonTextColor", value)
                              }
                            />
                            <CompactColorPicker
                              label={isRTL ? "מסגרת" : "Border"}
                              value={settings.buttonBorderColor || "#000000"}
                              onChange={(value) =>
                                updateSetting("buttonBorderColor", value)
                              }
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "עיגול פינות" : "Border Radius"}
                              value={settings.buttonBorderRadius || 8}
                              onChange={(v) =>
                                updateSetting("buttonBorderRadius", v)
                              }
                              max={24}
                            />
                            <ToggleSwitch
                              label={isRTL ? "צל" : "Shadow"}
                              checked={settings.buttonShadow !== false}
                              onCheckedChange={(checked) =>
                                updateSetting("buttonShadow", checked)
                              }
                            />
                          </div>

                          <Separator />

                          {/* Navigation URLs */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium">
                              <MapPin className="h-4 w-4" />
                              {isRTL ? "כתובות ניווט" : "Navigation URLs"}
                            </h3>
                            {settings.showGoogleMaps !== false && (
                              <div className="space-y-2">
                                <Label className="text-sm">Google Maps URL</Label>
                                <Input
                                  value={settings.googleMapsUrl || ""}
                                  onChange={(e) =>
                                    updateSetting("googleMapsUrl", e.target.value)
                                  }
                                  placeholder="https://maps.google.com/..."
                                  className="text-sm"
                                  dir="ltr"
                                />
                              </div>
                            )}
                            {settings.showWaze !== false && (
                              <div className="space-y-2">
                                <Label className="text-sm">Waze URL</Label>
                                <Input
                                  value={settings.wazeUrl || ""}
                                  onChange={(e) =>
                                    updateSetting("wazeUrl", e.target.value)
                                  }
                                  placeholder="https://waze.com/ul/..."
                                  className="text-sm"
                                  dir="ltr"
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Content Tab */}
                  {activeTab === "content" && (
                    <>
                      {/* Text Content */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Type className="h-4 w-4" />
                          {isRTL ? "טקסטים" : "Text Content"}
                        </h3>
                        <div className="space-y-2">
                          <Label>{isRTL ? "כותרת" : "Title"}</Label>
                          <Input
                            value={settings.welcomeTitle || ""}
                            onChange={(e) =>
                              updateSetting("welcomeTitle", e.target.value)
                            }
                            placeholder={event.title}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            {isRTL ? "הודעת ברוכים הבאים" : "Welcome Message"}
                          </Label>
                          <Textarea
                            value={settings.welcomeMessage || ""}
                            onChange={(e) =>
                              updateSetting("welcomeMessage", e.target.value)
                            }
                            placeholder={
                              isRTL
                                ? "שלום, נשמח לדעת אם תוכלו להגיע"
                                : "Hello, we'd love to know if you can attend"
                            }
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            {isRTL ? "הודעת תודה" : "Thank You Message"}
                          </Label>
                          <Textarea
                            value={settings.thankYouMessage || ""}
                            onChange={(e) =>
                              updateSetting("thankYouMessage", e.target.value)
                            }
                            placeholder={
                              isRTL
                                ? "תודה על התשובה!"
                                : "Thank you for your response!"
                            }
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            {isRTL ? "הודעת סירוב" : "Decline Message"}
                          </Label>
                          <Textarea
                            value={settings.declineMessage || ""}
                            onChange={(e) =>
                              updateSetting("declineMessage", e.target.value)
                            }
                            placeholder={
                              isRTL
                                ? "מקווים לראותכם בהזדמנות אחרת"
                                : "Hope to see you another time"
                            }
                            rows={2}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Navigation URLs */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <MapPin className="h-4 w-4" />
                          {isRTL ? "קישורי ניווט" : "Navigation Links"}
                        </h3>
                        {settings.showGoogleMaps !== false && (
                          <div className="space-y-2">
                            <Label className="text-sm">Google Maps URL</Label>
                            <Input
                              value={settings.googleMapsUrl || ""}
                              onChange={(e) =>
                                updateSetting("googleMapsUrl", e.target.value)
                              }
                              placeholder="https://maps.google.com/..."
                              className="text-sm"
                              dir="ltr"
                            />
                          </div>
                        )}
                        {settings.showWaze !== false && (
                          <div className="space-y-2">
                            <Label className="text-sm">Waze URL</Label>
                            <Input
                              value={settings.wazeUrl || ""}
                              onChange={(e) =>
                                updateSetting("wazeUrl", e.target.value)
                              }
                              placeholder="https://waze.com/ul/..."
                              className="text-sm"
                              dir="ltr"
                            />
                          </div>
                        )}
                        {settings.showGoogleMaps === false && settings.showWaze === false && (
                          <p className="text-sm text-muted-foreground">
                            {isRTL
                              ? "הפעל כפתורי ניווט בלשונית עיצוב כדי להוסיף קישורים"
                              : "Enable navigation buttons in Style tab to add links"}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Settings Tab */}
                  {activeTab === "settings" && (
                    <>
                      {/* Advanced Mode Toggle */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                          <div className="space-y-1">
                            <h3 className="flex items-center gap-2 font-medium">
                              <Wand2 className="h-4 w-4" />
                              {isRTL ? "מצב מתקדם" : "Advanced Mode"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {isRTL
                                ? "הפעל אפשרויות עיצוב מפורטות לכל רכיב"
                                : "Enable detailed styling options for every element"}
                            </p>
                          </div>
                          <Switch
                            checked={settings.advancedMode === true}
                            onCheckedChange={(checked) =>
                              updateSetting("advancedMode", checked)
                            }
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-medium">
                          {isRTL ? "שפה" : "Language"}
                        </h3>
                        <Select
                          value={settings.pageLocale || "he"}
                          onValueChange={(value) =>
                            updateSetting("pageLocale", value)
                          }
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

                      <Separator />

                      {/* Font Selection */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Type className="h-4 w-4" />
                          {isRTL ? "גופן" : "Font"}
                        </h3>
                        <Select
                          value={settings.fontFamily || "default"}
                          onValueChange={(value) =>
                            updateSetting("fontFamily", value === "default" ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isRTL ? "ברירת מחדל" : "Default"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">
                              {isRTL ? "ברירת מחדל" : "Default"}
                            </SelectItem>
                            <SelectItem value="'Heebo', sans-serif">
                              Heebo
                            </SelectItem>
                            <SelectItem value="'Assistant', sans-serif">
                              Assistant
                            </SelectItem>
                            <SelectItem value="'Rubik', sans-serif">
                              Rubik
                            </SelectItem>
                            <SelectItem value="'Open Sans', sans-serif">
                              Open Sans
                            </SelectItem>
                            <SelectItem value="'Noto Sans Hebrew', sans-serif">
                              Noto Sans Hebrew
                            </SelectItem>
                            <SelectItem value="'Frank Ruhl Libre', serif">
                              Frank Ruhl Libre
                            </SelectItem>
                            <SelectItem value="'David Libre', serif">
                              David Libre
                            </SelectItem>
                            <SelectItem value="'Amatic SC', cursive">
                              Amatic SC
                            </SelectItem>
                            <SelectItem value="'Dancing Script', cursive">
                              Dancing Script
                            </SelectItem>
                            <SelectItem value="'Playfair Display', serif">
                              Playfair Display
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Advanced: Card Width */}
                      {settings.advancedMode && (
                        <>
                          <Separator />

                          <div className="space-y-4">
                            <h3 className="font-medium text-muted-foreground">
                              {isRTL ? "רוחב כרטיס" : "Card Width"}
                            </h3>
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "רוחב מקסימלי" : "Max Width"}
                              value={settings.cardMaxWidth || 600}
                              onChange={(v) => updateSetting("cardMaxWidth", v)}
                              min={320}
                              max={800}
                              step={10}
                              unit="px"
                            />
                          </div>

                          <Separator />

                          {/* Font Sizes */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-medium text-muted-foreground">
                              <Type className="h-4 w-4" />
                              {isRTL ? "גודל טקסט" : "Font Sizes"}
                            </h3>
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "כותרת" : "Title"}
                              value={settings.titleFontSize || 28}
                              onChange={(v) => updateSetting("titleFontSize", v)}
                              min={18}
                              max={48}
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "תת-כותרת" : "Subtitle"}
                              value={settings.subtitleFontSize || 16}
                              onChange={(v) => updateSetting("subtitleFontSize", v)}
                              min={12}
                              max={24}
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "תוויות" : "Labels"}
                              value={settings.labelFontSize || 14}
                              onChange={(v) => updateSetting("labelFontSize", v)}
                              min={10}
                              max={20}
                            />
                            <ModernSlider isRTL={isRTL}
                              label={isRTL ? "כפתור" : "Button"}
                              value={settings.buttonFontSize || 16}
                              onChange={(v) => updateSetting("buttonFontSize", v)}
                              min={12}
                              max={24}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </ScrollArea>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="hidden min-h-0 flex-col bg-muted/20 lg:flex">
          <DevicePreview previewUrl={`/rsvp/${event.id}`} isRTL={isRTL}>
            <RsvpFormPreview
              settings={settings as RsvpPageSettings}
              event={event}
              locale={settings.pageLocale || "he"}
            />
          </DevicePreview>
        </div>
      </div>
    </div>
  );
}
