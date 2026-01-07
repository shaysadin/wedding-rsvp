"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Plus, Sparkles, Info, Zap } from "lucide-react";
import { AutomationTrigger, AutomationAction } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FlowNode,
  FlowConnector,
  getTriggerOptions,
  getActionOptions,
  isDelayRequiredTrigger,
  getDelayOptionsForTrigger,
  isCustomMessageAction,
} from "./flow-node";
import { createCustomAutomationFlow, updateAutomationFlowMessage } from "@/actions/automation";
import { Icons } from "@/components/shared/icons";

interface FlowEditorDialogProps {
  eventId: string;
  existingTriggers: AutomationTrigger[];
  onSuccess: () => void;
  editMode?: {
    flowId: string;
    name: string;
    trigger: AutomationTrigger;
    action: AutomationAction;
    customMessage?: string | null;
    delayHours?: number | null;
  };
  children?: React.ReactNode;
}

const MESSAGE_VARIABLES = [
  { key: "{guestName}", label: { en: "Guest Name", he: "שם האורח" } },
  { key: "{eventDate}", label: { en: "Event Date", he: "תאריך האירוע" } },
  { key: "{eventTime}", label: { en: "Event Time", he: "שעת האירוע" } },
  { key: "{venue}", label: { en: "Venue", he: "מקום האירוע" } },
  { key: "{tableName}", label: { en: "Table Name", he: "שם השולחן" } },
  { key: "{rsvpLink}", label: { en: "RSVP Link", he: "קישור אישור הגעה" } },
];

export function FlowEditorDialog({
  eventId,
  existingTriggers,
  onSuccess,
  editMode,
  children,
}: FlowEditorDialogProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(editMode?.name || "");
  const [trigger, setTrigger] = useState<AutomationTrigger | "">(editMode?.trigger || "");
  const [action, setAction] = useState<AutomationAction | "">(editMode?.action || "");
  const [customMessage, setCustomMessage] = useState(editMode?.customMessage || "");
  const [delayHours, setDelayHours] = useState<number | undefined>(
    editMode?.delayHours ?? undefined
  );

  const triggerOptions = getTriggerOptions(locale);
  const requiresDelay = trigger !== "" && isDelayRequiredTrigger(trigger as AutomationTrigger);
  const delayOptions = trigger ? getDelayOptionsForTrigger(trigger as AutomationTrigger, locale) : [];
  const showCustomMessageEditor = action && isCustomMessageAction(action);
  const actionOptions = getActionOptions(locale);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(isRTL ? "נא להזין שם לאוטומציה" : "Please enter a name");
      return;
    }

    if (!trigger) {
      toast.error(isRTL ? "נא לבחור טריגר" : "Please select a trigger");
      return;
    }

    if (!action) {
      toast.error(isRTL ? "נא לבחור פעולה" : "Please select an action");
      return;
    }

    if (requiresDelay && !delayHours) {
      toast.error(isRTL ? "נא לבחור זמן השהייה" : "Please select a delay time");
      return;
    }

    if (showCustomMessageEditor && !customMessage.trim()) {
      toast.error(isRTL ? "נא להזין תוכן הודעה" : "Please enter a message content");
      return;
    }

    setIsLoading(true);

    try {
      if (editMode) {
        // Update existing flow's custom message
        const result = await updateAutomationFlowMessage(editMode.flowId, customMessage || null);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(isRTL ? "האוטומציה עודכנה" : "Automation updated");
          setOpen(false);
          onSuccess();
        }
      } else {
        // Create new flow
        const result = await createCustomAutomationFlow(eventId, {
          name: name.trim(),
          trigger,
          action,
          customMessage: customMessage || undefined,
          delayHours: delayHours,
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(isRTL ? "האוטומציה נוצרה בהצלחה" : "Automation created successfully");
          setOpen(false);
          resetForm();
          onSuccess();
        }
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה ביצירת האוטומציה" : "Failed to create automation");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    if (!editMode) {
      setName("");
      setTrigger("");
      setAction("");
      setCustomMessage("");
      setDelayHours(undefined);
    }
  };

  // Reset delay when trigger changes
  const handleTriggerChange = (value: AutomationTrigger) => {
    setTrigger(value);
    // Reset delay hours when switching to a different trigger
    if (!isDelayRequiredTrigger(value)) {
      setDelayHours(undefined);
    }
  };

  const insertVariable = (variable: string) => {
    setCustomMessage((prev) => prev + variable);
  };

  const isNewTriggerUsed = !editMode && !!trigger && existingTriggers.includes(trigger);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? "יצירת אוטומציה" : "Create Automation"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {editMode
              ? (isRTL ? "עריכת אוטומציה" : "Edit Automation")
              : (isRTL ? "יצירת אוטומציה חדשה" : "Create New Automation")}
          </DialogTitle>
          <DialogDescription className="text-start">
            {isRTL
              ? "הגדירו תהליך אוטומטי שיופעל כאשר תנאי מסוים מתקיים"
              : "Set up an automated flow that triggers when a condition is met"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Flow Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-start block">
              {isRTL ? "שם האוטומציה" : "Automation Name"}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRTL ? "לדוגמה: תזכורת יומית" : "e.g., Daily Reminder"}
              disabled={!!editMode}
              className="text-start"
            />
          </div>

          {/* Visual Flow Builder */}
          <div className="space-y-2">
            <Label className="text-start block">
              {isRTL ? "תהליך האוטומציה" : "Automation Flow"}
            </Label>
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-6">
              <div className="flex flex-col items-center space-y-2">
                {/* Trigger Node */}
                <div className="w-full max-w-sm">
                  <Select
                    value={trigger}
                    onValueChange={(value) => handleTriggerChange(value as AutomationTrigger)}
                    disabled={!!editMode}
                  >
                    <SelectTrigger className={cn(
                      "w-full h-auto p-0 border-0 bg-transparent",
                      !trigger && "border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4"
                    )}>
                      {trigger ? (
                        <FlowNode type="trigger" value={trigger} delayHours={delayHours} className="w-full" />
                      ) : (
                        <div className="flex items-center gap-3 text-blue-500">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium">
                            {isRTL ? "בחרו טריגר" : "Select Trigger"}
                          </span>
                        </div>
                      )}
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {triggerOptions.map((option) => {
                        const Icon = option.icon;
                        const isUsed = existingTriggers.includes(option.value);
                        return (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={isUsed && !editMode}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div className="flex flex-col items-start">
                                <span>{option.label}</span>
                                {option.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                )}
                              </div>
                              {isUsed && !editMode && (
                                <span className="text-xs text-muted-foreground">
                                  ({isRTL ? "קיים" : "exists"})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delay Time Selector - shows when trigger requires it */}
                {requiresDelay && (
                  <div className="w-full max-w-sm animate-in slide-in-from-top-2 duration-200">
                    <div className="rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/50">
                          <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          {isRTL ? "בחרו זמן השהייה" : "Select Delay Time"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {delayOptions.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={delayHours === option.value ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-auto py-2 text-xs transition-all",
                              delayHours === option.value && "ring-2 ring-orange-400 ring-offset-2"
                            )}
                            onClick={() => setDelayHours(option.value)}
                            disabled={!!editMode}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Connector */}
                {(trigger || action) && <FlowConnector isActive={!!trigger && !!action} />}

                {/* Action Node */}
                <div className="w-full max-w-sm">
                  <Select
                    value={action}
                    onValueChange={(value) => setAction(value as AutomationAction)}
                    disabled={!!editMode}
                  >
                    <SelectTrigger className={cn(
                      "w-full h-auto p-0 border-0 bg-transparent",
                      !action && "border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl p-4"
                    )}>
                      {action ? (
                        <FlowNode type="action" value={action} className="w-full" />
                      ) : (
                        <div className="flex items-center gap-3 text-green-500">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium">
                            {isRTL ? "בחרו פעולה" : "Select Action"}
                          </span>
                        </div>
                      )}
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {actionOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div className="flex flex-col items-start">
                                <span>{option.label}</span>
                                {option.description && (
                                  <span className="text-xs text-muted-foreground max-w-[250px] truncate">
                                    {option.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Warning if trigger already exists */}
          {isNewTriggerUsed && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-start">
                {isRTL
                  ? "טריגר זה כבר קיים. כל טריגר יכול להיות פעיל פעם אחת בלבד."
                  : "This trigger already exists. Each trigger can only be active once."}
              </AlertDescription>
            </Alert>
          )}

          {/* Custom Message - Required for custom actions, optional for template actions */}
          {action && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-start">
                  {showCustomMessageEditor
                    ? (isRTL ? "תוכן ההודעה *" : "Message Content *")
                    : (isRTL ? "הודעה מותאמת (אופציונלי)" : "Custom Message (Optional)")}
                </Label>
              </div>

              {showCustomMessageEditor && (
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                  <Info className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs text-orange-700 dark:text-orange-300 text-start">
                    {isRTL
                      ? "הודעה זו חובה כאשר נבחרה פעולה עם הודעה מותאמת אישית"
                      : "This message is required when using a custom message action"}
                  </AlertDescription>
                </Alert>
              )}

              {/* Variable buttons */}
              <div className="flex flex-wrap gap-1">
                {MESSAGE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => insertVariable(variable.key)}
                  >
                    {isRTL ? variable.label.he : variable.label.en}
                  </Button>
                ))}
              </div>

              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={isRTL
                  ? "שלום {guestName}, תודה על אישור ההגעה לאירוע שלנו ב{venue}!"
                  : "Hi {guestName}, thank you for confirming your attendance at {venue}!"}
                className={cn(
                  "min-h-[100px] resize-none text-start",
                  showCustomMessageEditor && "border-orange-300 focus:border-orange-400"
                )}
                dir={isRTL ? "rtl" : "ltr"}
              />

              {!showCustomMessageEditor && (
                <p className="text-xs text-muted-foreground text-start">
                  {isRTL
                    ? "השאירו ריק כדי להשתמש בהודעת ברירת המחדל"
                    : "Leave empty to use the default message template"}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            {isRTL ? "ביטול" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isNewTriggerUsed}
            className="gap-2"
          >
            {isLoading && <Icons.spinner className="h-4 w-4 animate-spin" />}
            {editMode
              ? (isRTL ? "שמור שינויים" : "Save Changes")
              : (isRTL ? "צור אוטומציה" : "Create Automation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
