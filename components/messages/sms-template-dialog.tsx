"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createEventSmsTemplate,
  updateEventSmsTemplate,
} from "@/actions/sms-templates";
import {
  getSmsTemplatePreset,
  getSmsStyleDescription,
  type SmsTemplateType,
  type SmsTemplateStyle,
} from "@/config/sms-template-presets";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

interface SmsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  locale: string;
  template?: SmsTemplate | null;
  onSuccess: () => void;
}

const formSchema = z.object({
  type: z.enum(["INVITE", "REMINDER", "EVENT_DAY", "THANK_YOU"]),
  style: z.enum(["style1", "style2", "style3"]),
  nameHe: z.string().min(1, "Hebrew name is required"),
  nameEn: z.string().min(1, "English name is required"),
  messageBodyHe: z.string().min(1, "Hebrew message is required"),
  messageBodyEn: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SmsTemplateDialog({
  open,
  onOpenChange,
  eventId,
  locale,
  template,
  onSuccess,
}: SmsTemplateDialogProps) {
  const t = useTranslations();
  const isRTL = locale === "he";
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "INVITE",
      style: "style1",
      nameHe: "",
      nameEn: "",
      messageBodyHe: "",
      messageBodyEn: "",
    },
  });

  // Reset form when dialog opens/closes or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        form.reset({
          type: template.type as SmsTemplateType,
          style: template.style as SmsTemplateStyle,
          nameHe: template.nameHe,
          nameEn: template.nameEn,
          messageBodyHe: template.messageBodyHe,
          messageBodyEn: template.messageBodyEn || "",
        });
      } else {
        form.reset({
          type: "INVITE",
          style: "style1",
          nameHe: "",
          nameEn: "",
          messageBodyHe: "",
          messageBodyEn: "",
        });
      }
    }
  }, [open, template, form]);

  // Load preset when type/style changes (only for new templates)
  const loadPreset = () => {
    if (template) return; // Don't load preset when editing

    const type = form.getValues("type");
    const style = form.getValues("style");
    const preset = getSmsTemplatePreset(type, style);

    if (preset) {
      form.setValue("nameHe", preset.nameHe);
      form.setValue("nameEn", preset.nameEn);
      form.setValue("messageBodyHe", preset.messageBodyHe);
      form.setValue("messageBodyEn", preset.messageBodyEn);
      toast.success(isRTL ? "התבנית נטענה" : "Preset loaded");
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);

    try {
      let result;

      if (template) {
        // Update existing template
        result = await updateEventSmsTemplate({
          id: template.id,
          eventId,
          nameHe: values.nameHe,
          nameEn: values.nameEn,
          messageBodyHe: values.messageBodyHe,
          messageBodyEn: values.messageBodyEn || undefined,
        });
      } else {
        // Create new template
        result = await createEventSmsTemplate({
          eventId,
          type: values.type,
          style: values.style,
          nameHe: values.nameHe,
          nameEn: values.nameEn,
          messageBodyHe: values.messageBodyHe,
          messageBodyEn: values.messageBodyEn || undefined,
        });
      }

      if (result.success) {
        toast.success(
          template
            ? isRTL
              ? "התבנית עודכנה"
              : "Template updated"
            : isRTL
            ? "התבנית נוצרה"
            : "Template created"
        );
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה" : "Error");
    } finally {
      setLoading(false);
    }
  };

  // Type options
  const typeOptions = [
    { value: "INVITE", labelHe: "הזמנה", labelEn: "Invitation" },
    { value: "REMINDER", labelHe: "תזכורת", labelEn: "Reminder" },
    { value: "EVENT_DAY", labelHe: "יום האירוע", labelEn: "Event Day" },
    {
      value: "THANK_YOU",
      labelHe: "תודה (יום אחרי)",
      labelEn: "Thank You (Day After)",
    },
  ];

  // Style options with descriptions
  const styleOptions = [
    {
      value: "style1",
      ...getSmsStyleDescription("style1"),
    },
    {
      value: "style2",
      ...getSmsStyleDescription("style2"),
    },
    {
      value: "style3",
      ...getSmsStyleDescription("style3"),
    },
  ];

  // Available variables info
  const availableVariables = [
    { var: "{{1}}", desc: isRTL ? "שם האורח" : "Guest Name" },
    { var: "{{2}}", desc: isRTL ? "שם האירוע" : "Event Title" },
    { var: "{{3}}", desc: isRTL ? "שם המקום" : "Venue Name" },
    { var: "{{4}}", desc: isRTL ? "כתובת המקום" : "Venue Address" },
    { var: "{{5}}", desc: isRTL ? "תאריך האירוע" : "Event Date" },
    { var: "{{6}}", desc: isRTL ? "שעת האירוע" : "Event Time" },
    { var: "{{7}}", desc: isRTL ? "קישור ניווט" : "Navigation URL" },
    { var: "{{8}}", desc: isRTL ? "מספר שולחן" : "Table Number" },
    { var: "{{9}}", desc: isRTL ? "קישור הסעות" : "Transportation Link" },
    { var: "{{10}}", desc: isRTL ? "מספר צד" : "Side Number" },
    { var: "{{11}}", desc: isRTL ? "קישור RSVP" : "RSVP Link" },
    { var: "{{12}}", desc: isRTL ? "קישור מתנה דיגיטלית" : "Gift Payment URL" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>
            {template
              ? isRTL
                ? "עריכת תבנית SMS"
                : "Edit SMS Template"
              : isRTL
              ? "תבנית SMS חדשה"
              : "New SMS Template"}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? "צור או ערוך תבנית SMS מותאמת אישית לאירוע שלך"
              : "Create or edit a custom SMS template for your event"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isRTL ? "סוג ההודעה" : "Message Type"}
                    </FormLabel>
                    <Select
                      disabled={!!template || loading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {isRTL ? option.labelHe : option.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Style Selection */}
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRTL ? "סגנון" : "Style"}</FormLabel>
                    <Select
                      disabled={!!template || loading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {styleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {isRTL ? option.he : option.en} - {option.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isRTL
                        ? "לא ניתן לשנות את הסוג והסגנון לאחר היצירה"
                        : "Type and style cannot be changed after creation"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Load Preset Button */}
            {!template && (
              <Button
                type="button"
                variant="outline"
                onClick={loadPreset}
                disabled={loading}
              >
                {isRTL ? "טען תבנית ברירת מחדל" : "Load Default Preset"}
              </Button>
            )}

            <Separator />

            {/* Template Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameHe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRTL ? "שם בעברית" : "Hebrew Name"}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isRTL ? "שם באנגלית" : "English Name"}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Message Bodies */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="messageBodyHe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isRTL ? "תוכן ההודעה בעברית" : "Hebrew Message Body"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={loading}
                        rows={8}
                        className="font-mono"
                        dir="rtl"
                      />
                    </FormControl>
                    <FormDescription>
                      {isRTL
                        ? "השתמש במשתנים כמו {{1}}, {{2}} וכו'"
                        : "Use variables like {{1}}, {{2}}, etc."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="messageBodyEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isRTL ? "תוכן ההודעה באנגלית (אופציונלי)" : "English Message Body (Optional)"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={loading}
                        rows={8}
                        className="font-mono"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Available Variables */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {isRTL ? "משתנים זמינים:" : "Available Variables:"}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableVariables.map((v) => (
                      <div key={v.var} className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {v.var}
                        </Badge>
                        <span className="text-xs">{v.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {isRTL ? "ביטול" : "Cancel"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {template
                  ? isRTL
                    ? "עדכן"
                    : "Update"
                  : isRTL
                  ? "צור"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
