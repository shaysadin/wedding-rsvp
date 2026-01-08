"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { AutomationAction, AutomationTrigger } from "@prisma/client";
import { CheckCircle2, XCircle, Clock, Zap, ArrowRight } from "lucide-react";

import { simulateAutomationFlow, testAutomationWithGuest, getEventGuestsForTesting } from "@/actions/automation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
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

interface Guest {
  id: string;
  name: string;
  phone: string | null;
}

interface SimulationStep {
  step: number;
  type: "trigger" | "delay" | "action";
  title: string;
  description: string;
  status: "pending" | "simulated" | "executed" | "failed";
  result?: string;
}

interface SimulationResult {
  success: boolean;
  flowName: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  delayHours?: number | null;
  steps: SimulationStep[];
  channel: string;
  message: string;
}

interface TestAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  flowName: string;
  action: AutomationAction;
  trigger?: AutomationTrigger;
  delayHours?: number | null;
  customMessage?: string | null;
  eventId: string;
}

export function TestAutomationDialog({
  open,
  onOpenChange,
  flowId,
  flowName,
  action,
  trigger,
  delayHours,
  customMessage,
  eventId,
}: TestAutomationDialogProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [testMode, setTestMode] = useState<"phone" | "guest">("phone");
  const [testPhone, setTestPhone] = useState("");
  const [testName, setTestName] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter guests with phone numbers
  const guestsWithPhone = guests.filter((g) => g.phone);

  // Determine channel from action
  const channel = action.includes("SMS") ? "SMS" : "WhatsApp";

  // Load guests when dialog opens
  useEffect(() => {
    if (open && eventId) {
      setSimulationResult(null);
      setErrorMessage(null);
      setIsLoadingGuests(true);
      getEventGuestsForTesting(eventId)
        .then((result) => {
          if (result.guests) {
            setGuests(result.guests);
          }
        })
        .catch(() => {
          // Silently fail - guests list will be empty
        })
        .finally(() => {
          setIsLoadingGuests(false);
        });
    }
  }, [open, eventId]);

  const handleSimulate = async () => {
    setIsTesting(true);
    setSimulationResult(null);
    setErrorMessage(null);

    try {
      let result;

      if (testMode === "phone") {
        if (!testPhone) {
          toast.error(isRTL ? "נא להזין מספר טלפון" : "Please enter a phone number");
          setIsTesting(false);
          return;
        }
        result = await simulateAutomationFlow(flowId, testPhone, testName || undefined);
      } else {
        if (!selectedGuestId) {
          toast.error(isRTL ? "נא לבחור אורח" : "Please select a guest");
          setIsTesting(false);
          return;
        }
        // For guest mode, use testAutomationWithGuest
        const guestResult = await testAutomationWithGuest(flowId, selectedGuestId);
        if (guestResult.error) {
          setErrorMessage(guestResult.error);
          toast.error(guestResult.error);
          setIsTesting(false);
          return;
        }
        // Convert to simulation result format
        result = {
          success: guestResult.success,
          flowName,
          trigger: trigger || "NO_RESPONSE_WHATSAPP",
          action,
          delayHours,
          steps: [
            {
              step: 1,
              type: "trigger" as const,
              title: isRTL ? "טריגר" : "Trigger",
              description: isRTL ? "הטריגר הופעל" : "Trigger activated",
              status: "simulated" as const,
              result: isRTL ? "הטריגר הופעל (סימולציה)" : "Trigger activated (simulated)",
            },
            ...(delayHours ? [{
              step: 2,
              type: "delay" as const,
              title: isRTL ? "המתנה" : "Delay",
              description: isRTL ? `המתנה של ${delayHours} שעות` : `Wait ${delayHours} hours`,
              status: "simulated" as const,
              result: isRTL ? "דילגנו על ההמתנה בסימולציה" : "Delay skipped in simulation",
            }] : []),
            {
              step: delayHours ? 3 : 2,
              type: "action" as const,
              title: isRTL ? "פעולה" : "Action",
              description: isRTL ? "שליחת הודעה" : "Send message",
              status: guestResult.success ? "executed" as const : "failed" as const,
              result: guestResult.message,
            },
          ],
          channel: guestResult.channel || channel,
          message: guestResult.message || "",
        };
      }

      if (result.error) {
        setErrorMessage(result.error);
        toast.error(result.error);
      } else if (result.success !== undefined) {
        setSimulationResult(result as SimulationResult);
        if (result.success) {
          toast.success(isRTL ? "סימולציית האוטומציה הושלמה בהצלחה!" : "Automation simulation completed successfully!");
        } else {
          toast.error(result.message || (isRTL ? "הסימולציה נכשלה" : "Simulation failed"));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  const getStepIcon = (step: SimulationStep) => {
    switch (step.status) {
      case "executed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "simulated":
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepTypeIcon = (type: SimulationStep["type"]) => {
    switch (type) {
      case "trigger":
        return <Zap className="h-4 w-4" />;
      case "delay":
        return <Clock className="h-4 w-4" />;
      case "action":
        return <Icons.send className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.zap className="h-5 w-5 text-primary" />
            {isRTL ? "סימולציית אוטומציה" : "Automation Simulation"}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? `בדוק את האוטומציה "${flowName}" - סימולציה של כל התהליך כולל ההמתנה ושליחת ההודעה`
              : `Test "${flowName}" - simulate the full flow including delay and message sending`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Test Mode Selection */}
          <RadioGroup
            value={testMode}
            onValueChange={(value) => setTestMode(value as "phone" | "guest")}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="phone"
                id="phone-mode"
                className="peer sr-only"
              />
              <Label
                htmlFor="phone-mode"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  "peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                )}
              >
                <Icons.phone className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">
                  {isRTL ? "מספר טלפון" : "Phone Number"}
                </span>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="guest"
                id="guest-mode"
                className="peer sr-only"
              />
              <Label
                htmlFor="guest-mode"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  "peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                )}
              >
                <Icons.user className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">
                  {isRTL ? "אורח קיים" : "Existing Guest"}
                </span>
              </Label>
            </div>
          </RadioGroup>

          {/* Phone Number Input */}
          {testMode === "phone" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{isRTL ? "מספר טלפון לבדיקה" : "Test Phone Number"}</Label>
                <Input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder={isRTL ? "0501234567" : "+1234567890"}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? "הזן מספר טלפון (מספרים ישראליים יומרו אוטומטית)"
                    : "Enter phone number (Israeli numbers auto-convert)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "שם לבדיקה (אופציונלי)" : "Test Name (optional)"}</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder={isRTL ? "אורח בדיקה" : "Test Guest"}
                  dir="auto"
                />
              </div>
            </div>
          )}

          {/* Guest Selection */}
          {testMode === "guest" && (
            <div className="space-y-2">
              <Label>{isRTL ? "בחר אורח" : "Select Guest"}</Label>
              {guestsWithPhone.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {isRTL
                    ? "אין אורחים עם מספר טלפון"
                    : "No guests with phone numbers"}
                </div>
              ) : (
                <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={isRTL ? "בחר אורח..." : "Select a guest..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {guestsWithPhone.map((guest) => (
                        <SelectItem key={guest.id} value={guest.id}>
                          <span className="flex items-center gap-2">
                            <span>{guest.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({guest.phone})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Simulation Result - Step by Step */}
          {simulationResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {simulationResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={simulationResult.success ? "text-green-700" : "text-red-700"}>
                  {simulationResult.message}
                </span>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                {simulationResult.steps.map((step, index) => (
                  <div key={step.step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "rounded-full p-1.5",
                        step.status === "executed" && "bg-green-100 dark:bg-green-900/30",
                        step.status === "simulated" && "bg-blue-100 dark:bg-blue-900/30",
                        step.status === "failed" && "bg-red-100 dark:bg-red-900/30",
                        step.status === "pending" && "bg-gray-100 dark:bg-gray-800"
                      )}>
                        {getStepIcon(step)}
                      </div>
                      {index < simulationResult.steps.length - 1 && (
                        <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700 my-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded",
                          step.type === "trigger" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                          step.type === "delay" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                          step.type === "action" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        )}>
                          {getStepTypeIcon(step.type)}
                          {step.title}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      {step.result && (
                        <p className={cn(
                          "text-xs mt-1",
                          step.status === "executed" && "text-green-600",
                          step.status === "simulated" && "text-blue-600",
                          step.status === "failed" && "text-red-600"
                        )}>
                          {step.result}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !simulationResult && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {isRTL ? "הסימולציה נכשלה" : "Simulation Failed"}
                  </p>
                  <p className="text-xs mt-1 text-red-700 dark:text-red-300">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Channel Info */}
          {!simulationResult && !errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              {channel === "WhatsApp" ? (
                <Icons.messageCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Icons.messageSquare className="h-5 w-5 text-blue-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isRTL ? `ישלח דרך ${channel}` : `Will send via ${channel}`}
                </p>
                {delayHours && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? `לאחר המתנה של ${delayHours} שעות (ידלג בסימולציה)`
                      : `After ${delayHours} hour delay (skipped in simulation)`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "סגור" : "Close"}
          </Button>
          <Button
            onClick={handleSimulate}
            disabled={isTesting || (testMode === "phone" && !testPhone) || (testMode === "guest" && !selectedGuestId)}
          >
            {isTesting ? (
              <>
                <Icons.spinner className="h-4 w-4 animate-spin me-2" />
                {isRTL ? "מריץ סימולציה..." : "Running simulation..."}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 me-2" />
                {isRTL ? "הרץ סימולציה" : "Run Simulation"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
