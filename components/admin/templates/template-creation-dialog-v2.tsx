"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";
import { createWhatsAppTemplateContent } from "@/actions/whatsapp-templates";
import { ButtonConfigEditor } from "./button-config-editor";
import { VariableHelper } from "./variable-helper";
import { TemplateValidator } from "./template-validator";
import { Card } from "@/components/ui/card";

const TEMPLATE_TYPES: { value: WhatsAppTemplateType; label: string; labelHe: string }[] = [
  { value: "INVITE", label: "Standard Invite", labelHe: "הזמנה רגילה" },
  { value: "REMINDER", label: "Standard Reminder", labelHe: "תזכורת רגילה" },
  { value: "INTERACTIVE_INVITE", label: "Interactive Invite", labelHe: "הזמנה אינטראקטיבית" },
  { value: "INTERACTIVE_REMINDER", label: "Interactive Reminder", labelHe: "תזכורת אינטראקטיבית" },
  { value: "IMAGE_INVITE", label: "Image Invite", labelHe: "הזמנה עם תמונה" },
  { value: "CONFIRMATION", label: "Confirmation", labelHe: "אישור RSVP" },
  { value: "EVENT_DAY", label: "Event Day", labelHe: "יום האירוע" },
  { value: "THANK_YOU", label: "Thank You", labelHe: "תודה" },
  { value: "TABLE_ASSIGNMENT", label: "Table Assignment", labelHe: "שיבוץ שולחן" },
  { value: "GUEST_COUNT_LIST", label: "Guest Count List", labelHe: "ספירת אורחים" },
];

interface TemplateCreationDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateCreationDialogV2({
  open,
  onOpenChange,
  onSuccess,
}: TemplateCreationDialogV2Props) {
  const [isLoading, setIsLoading] = useState(false);

  // Form state - Hebrew only
  const [type, setType] = useState<WhatsAppTemplateType>("INVITE");
  const [style, setStyle] = useState<"style1" | "style2" | "style3">("style1");
  const [nameHe, setNameHe] = useState("");
  const [twilioTemplateName, setTwilioTemplateName] = useState("");
  const [templateBodyHe, setTemplateBodyHe] = useState("");
  const [previewTextHe, setPreviewTextHe] = useState("");

  // Button configuration (for interactive templates) - Hebrew only
  const [buttons, setButtons] = useState<
    Array<{ id: string; titleHe: string }>
  >([
    { id: "yes", titleHe: "כן, מגיע" },
    { id: "no", titleHe: "לא מגיע" },
    { id: "maybe", titleHe: "אולי" },
  ]);

  const isInteractive =
    type === "INTERACTIVE_INVITE" ||
    type === "INTERACTIVE_REMINDER" ||
    type === "IMAGE_INVITE";

  // Auto-generate Twilio template name
  const generateTwilioName = () => {
    const typeLower = type.toLowerCase();
    const styleSuffix = style.replace("style", "");
    return `wedinex_${typeLower}_${styleSuffix}_he`;
  };

  // Auto-generate complete template with professional messages
  const handleAutoGenerateComplete = () => {
    // Set name and Twilio name
    setNameHe(`סגנון ${style.replace("style", "")}`);
    setTwilioTemplateName(generateTwilioName());

    // Generate message based on type and style
    const message = generateTemplateMessage(type, style);
    setTemplateBodyHe(message.body);
    setPreviewTextHe(message.preview);
  };

  // Auto-fill suggestion (simple version)
  const handleAutoGenerate = () => {
    if (!nameHe) {
      setNameHe(`סגנון ${style.replace("style", "")}`);
    }
    if (!twilioTemplateName) {
      setTwilioTemplateName(generateTwilioName());
    }
  };

  // Generate professional template messages using the new 8-variable system
  const generateTemplateMessage = (
    templateType: WhatsAppTemplateType,
    templateStyle: "style1" | "style2" | "style3"
  ): { body: string; preview: string } => {
    switch (templateType) {
      case "INVITE":
        if (templateStyle === "style1") {
          return {
            body: `היי {{1}} 👋

אנחנו ממש מתרגשים להזמין אותך לחגוג איתנו את {{2}}!

נשמח מאוד לראות אותך שם 💙

לאישור הגעה ופרטים נוספים:
{{7}}

מחכים לך בשמחה!`,
            preview: "הזמנה מינימלית וחמה"
          };
        } else if (templateStyle === "style2") {
          return {
            body: `שלום {{1}} 🎉

מוזמנים לחגוג איתנו את {{2}}!

📍 היכן? {{3}}, {{4}}

📅 מתי? {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לאישור הגעה כדי שנוכל לתכנן בשבילך את הערב המושלם.

מצפים לראותכם! 💫`,
            preview: "הזמנה מפורטת עם מידע מלא"
          };
        } else {
          return {
            body: `שלום {{1}} 🚌

מוזמנים לחגוג איתנו את {{2}}!

📍 המקום: {{3}}, {{4}}

📅 התאריך: {{5}} בשעה {{6}}

🚌 דאגנו לכם להסעות נוחות!
כל הפרטים וזמני האיסוף כאן:
{{7}}

נשמח לאישור הגעה ולבחירת הסעה נוחה עבורך.

בואו לחגוג איתנו! 🎊`,
            preview: "הזמנה עם דגש על הסעות"
          };
        }

      case "REMINDER":
        if (templateStyle === "style1") {
          return {
            body: `היי {{1}} ⏰

רק רצינו להזכיר - {{2}} כבר ממש קרוב!

עדיין מחכים לאישור ההגעה שלך 💙

לחצו כאן:
{{7}}

נתראה בקרוב!`,
            preview: "תזכורת מינימלית וחמה"
          };
        } else if (templateStyle === "style2") {
          return {
            body: `שלום {{1}} 📢

תזכורת חמה - {{2}} כבר ממש מתקרב!

📍 המקום: {{3}}, {{4}}

📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

אם עדיין לא אישרת הגעה, נשמח שתעשה זאת עכשיו כדי שנוכל לדאוג לכל הפרטים בשבילך.

מצפים לראותכם! ✨`,
            preview: "תזכורת מפורטת עם מידע מלא"
          };
        } else {
          return {
            body: `שלום {{1}} 🚌

{{2}} ממש בפתח!

📍 איפה: {{3}}, {{4}}

📅 מתי: {{5}} בשעה {{6}}

🚌 עדיין יש מקום בהסעות!
כל הפרטים וזמני איסוף:
{{7}}

אל תפספסו - אשרו הגעה ושמרו מקום בהסעה.

בואו לחגוג איתנו! 🎉`,
            preview: "תזכורת עם דגש על הסעות"
          };
        }

      case "INTERACTIVE_INVITE":
        if (templateStyle === "style1") {
          return {
            body: `היי {{1}} 🎊

אנחנו ממש שמחים להזמין אותך ל{{2}}!

נשמח לאישור הגעה מהיר:

לפרטים מלאים:
{{7}}`,
            preview: "הזמנה אינטראקטיבית מינימלית"
          };
        } else if (templateStyle === "style2") {
          return {
            body: `שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 פרטים מלאים וניווט:
{{7}}

מה תגידו?`,
            preview: "הזמנה אינטראקטיבית מפורטת"
          };
        } else {
          return {
            body: `שלום {{1}} 🚌

מוזמנים ל{{2}}!

📍 המקום: {{3}}, {{4}}
📅 התאריך: {{5}} בשעה {{6}}

🚌 דאגנו להסעות נוחות!
כל הפרטים:
{{7}}

ספרו לנו:`,
            preview: "הזמנה אינטראקטיבית עם הסעות"
          };
        }

      case "INTERACTIVE_REMINDER":
        if (templateStyle === "style1") {
          return {
            body: `היי {{1}} ⏰

תזכורת חמה - {{2}} ממש מתקרב!

עדיין מחכים לאישור הגעה 💙

לחצו כאן:
{{7}}

מה המצב?`,
            preview: "תזכורת אינטראקטיבית מינימלית"
          };
        } else if (templateStyle === "style2") {
          return {
            body: `שלום {{1}} 📢

{{2}} כבר ממש קרוב!

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט ופרטים נוספים:
{{7}}

נשמח לאישור סופי:`,
            preview: "תזכורת אינטראקטיבית מפורטת"
          };
        } else {
          return {
            body: `היי {{1}} 🚌

{{2}} ממש בפתח!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🚌 עדיין יש מקום בהסעות!
כל הפרטים:
{{7}}

ספרו לנו:`,
            preview: "תזכורת אינטראקטיבית עם הסעות"
          };
        }

      case "IMAGE_INVITE":
        return {
          body: `היי {{1}} 💌

שמחים להזמין אותך לחגוג איתנו את {{2}}!

לאישור הגעה וכל הפרטים:
{{7}}

מצפים לראותך! ✨`,
          preview: "הזמנה עם תמונה"
        };

      case "CONFIRMATION":
        return {
          body: `תודה רבה {{1}}! 🎉

קיבלנו את אישור ההגעה שלך ל{{2}}.

אנחנו ממש מתרגשים לחגוג איתך! 💙

כל פרטי האירוע ונתונים נוספים כאן:
{{7}}

נתראה בקרוב בשמחה! ✨`,
          preview: "אישור RSVP"
        };

      case "EVENT_DAY":
        return {
          body: `בוקר טוב {{1}}! ☀️

היום הגדול הגיע - {{2}} היום! 🎊

📍 איפה: {{3}}, {{4}}
🕐 שעה: {{6}}
🪑 השולחן שלך: מספר {{8}}

🗺 ניווט מהיר למקום:
{{7}}

מצפים לראותך בקרוב ולחגוג ביחד! 💫`,
          preview: "הודעת יום האירוע"
        };

      case "THANK_YOU":
        return {
          body: `שלום {{1}} 💙

תודה ענקית שחגגת איתנו את {{2}}!

הנוכחות שלך עשתה את הערב מיוחד ובלתי נשכח 💫

נשמח לשמוע איך היה לך ולקבל פידבק:
{{7}}

בברכה והוקרה רבה,
תודה שהיית חלק מהשמחה שלנו! 🎊`,
          preview: "הודעת תודה"
        };

      case "TABLE_ASSIGNMENT":
        return {
          body: `שלום {{1}} 🪑

שובצת לשולחן באירוע {{2}}!

🪑 השולחן שלך: מספר {{8}}

📍 המקום: {{3}}, {{4}}

🕐 שעת הגעה מומלצת: {{6}}

🗺 ניווט נוח למקום:
{{7}}

נתראה שם! 🎉`,
          preview: "שיבוץ לשולחן"
        };

      case "GUEST_COUNT_LIST":
        return {
          body: `שלום {{1}} 👥

כמה אנשים יגיעו איתך ל{{2}}?

נשמח לקבל את המספר המדויק כדי שנוכל להכין את הכל בשבילכם 💙

לפרטים נוספים:
{{7}}

תודה! 🙏`,
          preview: "בקשת מספר אורחים"
        };

      default:
        return {
          body: `שלום {{1}},\n\nהודעה בנוגע ל{{2}}.\n\nלפרטים נוספים: {{7}}`,
          preview: "תבנית כללית"
        };
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!nameHe.trim()) {
      toast.error("נא להזין שם תבנית");
      return;
    }

    if (!twilioTemplateName.trim()) {
      toast.error("נא להזין שם Twilio");
      return;
    }

    if (!templateBodyHe.trim()) {
      toast.error("נא להזין את תוכן ההודעה");
      return;
    }

    // Validate character limits (WhatsApp limit: 1024 characters)
    if (templateBodyHe.length > 1024) {
      toast.error("תוכן ההודעה חורג מ-1024 תווים");
      return;
    }

    // Validate buttons for interactive templates
    if (isInteractive && buttons.length > 0) {
      for (const btn of buttons) {
        if (!btn.titleHe.trim()) {
          toast.error("כל הכפתורים חייבים להכיל טקסט");
          return;
        }
        if (btn.titleHe.length > 20) {
          toast.error(`כפתור "${btn.titleHe}" חורג מ-20 תווים`);
          return;
        }
      }

      if (buttons.length > 3) {
        toast.error("מקסימום 3 כפתורים מותרים");
        return;
      }
    }

    setIsLoading(true);

    try {
      const result = await createWhatsAppTemplateContent({
        type,
        style,
        nameHe,
        nameEn: nameHe, // Use same name for English (required by schema but not used)
        twilioTemplateName,
        templateBodyHe,
        templateBodyEn: templateBodyHe, // Use same body for English (required by schema but not used)
        variables: getDefaultVariables(),
        buttonsConfig: isInteractive ? buttons.map(b => ({
          ...b,
          titleEn: b.titleHe, // Use same text for English (required by schema but not used)
        })) : undefined,
        previewText: previewTextHe || templateBodyHe.substring(0, 100),
        previewTextHe: previewTextHe || templateBodyHe.substring(0, 100),
      });

      if (result.success) {
        toast.success("התבנית נוצרה בהצלחה!");
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      } else {
        toast.error(result.error || "שגיאה ביצירת התבנית");
      }
    } catch (error) {
      toast.error("שגיאה ביצירת התבנית");
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultVariables = () => {
    // Standard 8-variable system - consistent across all templates
    return {
      "1": "שם האורח/ת",
      "2": "שם האירוע",
      "3": "שם המקום",
      "4": "כתובת מלאה",
      "5": "תאריך",
      "6": "שעה",
      "7": "קישור דינמי",
      "8": "מספר שולחן",
    };
  };

  const resetForm = () => {
    setNameHe("");
    setTwilioTemplateName("");
    setTemplateBodyHe("");
    setPreviewTextHe("");
    setButtons([
      { id: "yes", titleHe: "כן, מגיע" },
      { id: "no", titleHe: "לא מגיע" },
      { id: "maybe", titleHe: "אולי" },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="!w-[90vw] !max-w-[1400px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            יצירת תבנית WhatsApp
          </DialogTitle>
          <DialogDescription>
            צור תבנית הודעת WhatsApp חדשה. לאחר היצירה, תוכל לשלוח אותה לאישור של Twilio ו-WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4" dir="rtl">
          {/* Template Type and Style */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>סוג תבנית</Label>
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
              <Label>סגנון</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style1">סגנון 1</SelectItem>
                  <SelectItem value="style2">סגנון 2</SelectItem>
                  <SelectItem value="style3">
                    {(type === "INVITE" || type === "REMINDER" || type === "INTERACTIVE_INVITE" || type === "INTERACTIVE_REMINDER")
                      ? "סגנון 3 (+ הסעות)"
                      : "סגנון 3"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="default"
                onClick={handleAutoGenerateComplete}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="h-4 w-4" />
                צור הודעה מקצועית
              </Button>
            </div>
          </div>

          {/* Template Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameHe">שם התבנית (עברית)</Label>
              <Input
                id="nameHe"
                value={nameHe}
                onChange={(e) => setNameHe(e.target.value)}
                placeholder="סגנון 1"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilioTemplateName">
                שם Twilio
                <span className="text-xs text-muted-foreground mr-2">
                  (אנגלית, אותיות קטנות, קו תחתון)
                </span>
              </Label>
              <Input
                id="twilioTemplateName"
                value={twilioTemplateName}
                onChange={(e) => setTwilioTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="wedinex_invite_1_he"
                dir="ltr"
              />
            </div>
          </div>

          {/* Variable Helper */}
          <VariableHelper templateType={type} style={style} />

          {/* Template Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="templateBodyHe">
                תוכן ההודעה (עברית)
              </Label>
              <span className={`text-sm ${templateBodyHe.length > 1024 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {templateBodyHe.length}/1024 תווים
              </span>
            </div>
            <Textarea
              id="templateBodyHe"
              value={templateBodyHe}
              onChange={(e) => setTemplateBodyHe(e.target.value)}
              placeholder="שלום {{1}}, הוזמנת לאירוע {{2}} בתאריך {{3}}..."
              rows={8}
              className="font-mono text-sm"
              dir="rtl"
            />
            <p className="text-xs text-muted-foreground">
              משתנים זמינים: {`{{1}}`} שם אורח, {`{{2}}`} שם אירוע, {`{{3}}`} שם מקום, {`{{4}}`} כתובת, {`{{5}}`} תאריך, {`{{6}}`} שעה, {`{{7}}`} קישור, {`{{8}}`} מספר שולחן.
              לחץ &quot;צור הודעה מקצועית&quot; לדוגמה מלאה.
            </p>
          </div>

          {/* Preview Text (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="previewTextHe">
              טקסט תצוגה מקדימה
              <span className="text-xs text-muted-foreground mr-2">(אופציונלי - יופיע בממשק הבחירה)</span>
            </Label>
            <Input
              id="previewTextHe"
              value={previewTextHe}
              onChange={(e) => setPreviewTextHe(e.target.value)}
              placeholder="הזמנה רשמית לאירוע..."
              dir="rtl"
            />
          </div>

          {/* Button Configuration for Interactive Templates */}
          {isInteractive && (
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-3">כפתורים אינטראקטיביים</h3>
              <ButtonConfigEditor
                buttons={buttons}
                onChange={setButtons}
                hebrewOnly={true}
              />
            </Card>
          )}

          {/* Validation and Preview Section */}
          {templateBodyHe && (
            <TemplateValidator
              templateBody={templateBodyHe}
              buttons={isInteractive ? buttons : []}
              locale="he"
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
            צור תבנית
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
