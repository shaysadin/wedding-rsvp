"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Sparkles,
  Settings,
  History,
  MessageSquare,
  Save,
  X,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  ChevronRight,
  Edit3,
  Eye,
  RotateCcw,
  Ban,
} from "lucide-react";
import { AutomationTrigger, AutomationAction, AutomationFlowStatus, AutomationExecutionStatus } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { FlowNode, FlowConnector, getTriggerOptions, getActionOptions } from "./flow-node";
import {
  getAutomationFlow,
  updateAutomationFlow,
  updateAutomationFlowStatus,
  deleteAutomationFlow,
  retryFailedExecutions,
  cancelPendingExecutions,
  runExecutionNow,
} from "@/actions/automation";
import { Icons } from "@/components/shared/icons";

interface FlowDetailDialogProps {
  flowId: string;
  existingTriggers: AutomationTrigger[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface ExecutionItem {
  id: string;
  status: AutomationExecutionStatus;
  scheduledFor: Date | null;
  executedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  guest: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
}

interface FlowData {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  status: AutomationFlowStatus;
  customMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  weddingEvent: {
    id: string;
    title: string;
    dateTime: Date;
    location: string;
    venue: string | null;
  };
  template: { name: string; nameHe: string } | null;
  executions: ExecutionItem[];
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
  };
}

const MESSAGE_VARIABLES = [
  { key: "{guestName}", label: { en: "Guest Name", he: "שם האורח" }, example: "John" },
  { key: "{eventDate}", label: { en: "Event Date", he: "תאריך האירוע" }, example: "Jan 15, 2024" },
  { key: "{eventTime}", label: { en: "Event Time", he: "שעת האירוע" }, example: "18:00" },
  { key: "{venue}", label: { en: "Venue", he: "מקום האירוע" }, example: "Grand Hall" },
  { key: "{tableName}", label: { en: "Table Name", he: "שם השולחן" }, example: "Table 5" },
  { key: "{rsvpLink}", label: { en: "RSVP Link", he: "קישור אישור" }, example: "https://..." },
];

const EXECUTION_STATUS_CONFIG: Record<AutomationExecutionStatus, {
  label: { en: string; he: string };
  icon: typeof Clock;
  color: string;
}> = {
  PENDING: { label: { en: "Pending", he: "ממתין" }, icon: Clock, color: "text-amber-500" },
  PROCESSING: { label: { en: "Processing", he: "בביצוע" }, icon: RefreshCw, color: "text-blue-500" },
  COMPLETED: { label: { en: "Completed", he: "הושלם" }, icon: CheckCircle, color: "text-green-500" },
  FAILED: { label: { en: "Failed", he: "נכשל" }, icon: XCircle, color: "text-red-500" },
  SKIPPED: { label: { en: "Skipped", he: "דולג" }, icon: AlertTriangle, color: "text-gray-400" },
};

export function FlowDetailDialog({
  flowId,
  existingTriggers,
  open,
  onOpenChange,
  onUpdate,
}: FlowDetailDialogProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [flow, setFlow] = useState<FlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTrigger, setEditTrigger] = useState<AutomationTrigger | "">("");
  const [editAction, setEditAction] = useState<AutomationAction | "">("");
  const [editMessage, setEditMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [runningExecutionId, setRunningExecutionId] = useState<string | null>(null);

  const triggerOptions = getTriggerOptions(locale);
  const actionOptions = getActionOptions(locale);

  const loadFlow = useCallback(async () => {
    if (!flowId) return;

    setIsLoading(true);
    try {
      const result = await getAutomationFlow(flowId);
      if (result.error) {
        toast.error(result.error);
        onOpenChange(false);
      } else if (result.flow) {
        setFlow(result.flow as unknown as FlowData);
        setEditName(result.flow.name);
        setEditTrigger(result.flow.trigger);
        setEditAction(result.flow.action);
        setEditMessage(result.flow.customMessage || "");
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת הנתונים" : "Failed to load flow");
    } finally {
      setIsLoading(false);
    }
  }, [flowId, isRTL, onOpenChange]);

  useEffect(() => {
    if (open && flowId) {
      loadFlow();
    }
  }, [open, flowId, loadFlow]);

  const handleSave = async () => {
    if (!flow) return;

    setIsSaving(true);
    try {
      const result = await updateAutomationFlow(flow.id, {
        name: editName,
        trigger: editTrigger as AutomationTrigger,
        action: editAction as AutomationAction,
        customMessage: editMessage || null,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "השינויים נשמרו" : "Changes saved");
        setIsEditing(false);
        loadFlow();
        onUpdate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בשמירת השינויים" : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: AutomationFlowStatus) => {
    if (!flow) return;

    try {
      const result = await updateAutomationFlowStatus(flow.id, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          newStatus === "ACTIVE"
            ? (isRTL ? "האוטומציה הופעלה" : "Automation activated")
            : (isRTL ? "האוטומציה הושהתה" : "Automation paused")
        );
        loadFlow();
        onUpdate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון הסטטוס" : "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!flow) return;

    try {
      const result = await deleteAutomationFlow(flow.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האוטומציה נמחקה" : "Automation deleted");
        onOpenChange(false);
        onUpdate();
      }
    } catch {
      toast.error(isRTL ? "שגיאה במחיקת האוטומציה" : "Failed to delete automation");
    }
  };

  const handleRetryFailed = async () => {
    if (!flow) return;

    try {
      const result = await retryFailedExecutions(flow.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isRTL
            ? `${result.retriedCount} הרצות הועברו לניסיון חוזר`
            : `${result.retriedCount} executions queued for retry`
        );
        loadFlow();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בניסיון חוזר" : "Failed to retry executions");
    }
  };

  const handleCancelPending = async () => {
    if (!flow) return;

    try {
      const result = await cancelPendingExecutions(flow.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isRTL
            ? `${result.cancelledCount} הרצות בוטלו`
            : `${result.cancelledCount} executions cancelled`
        );
        loadFlow();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בביטול ההרצות" : "Failed to cancel executions");
    }
  };

  const handleRunNow = async (executionId: string) => {
    setRunningExecutionId(executionId);
    try {
      const result = await runExecutionNow(executionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "הפעולה בוצעה בהצלחה" : "Action executed successfully");
        loadFlow();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהרצת הפעולה" : "Failed to run action");
    } finally {
      setRunningExecutionId(null);
    }
  };

  const insertVariable = (variable: string) => {
    setEditMessage((prev) => prev + variable);
  };

  const getMessagePreview = () => {
    let preview = editMessage || (isRTL
      ? "שלום {guestName}, תודה על אישור ההגעה לאירוע ב{venue}!"
      : "Hi {guestName}, thank you for confirming your attendance at {venue}!");

    MESSAGE_VARIABLES.forEach((v) => {
      preview = preview.replace(new RegExp(v.key.replace(/[{}]/g, "\\$&"), "g"), v.example);
    });

    return preview;
  };

  const isTriggerUsed = (trigger: AutomationTrigger) => {
    return existingTriggers.includes(trigger) && trigger !== flow?.trigger;
  };

  if (isLoading || !flow) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={isRTL ? "left" : "right"} className="w-full sm:max-w-2xl">
          <div className="flex h-full items-center justify-center">
            <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const successRate = flow.stats.total > 0
    ? Math.round((flow.stats.completed / flow.stats.total) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRTL ? "left" : "right"} className="w-full sm:max-w-2xl p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 text-start">
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-lg font-semibold"
                      />
                    ) : (
                      flow.name
                    )}
                  </SheetTitle>
                  <SheetDescription>
                    {flow.weddingEvent.title}
                  </SheetDescription>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={flow.status === "ACTIVE" ? "default" : "secondary"}
                    className={cn(
                      "gap-1.5",
                      flow.status === "ACTIVE" && "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    {flow.status === "ACTIVE" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                    )}
                    {flow.status === "ACTIVE"
                      ? (isRTL ? "פעיל" : "Active")
                      : flow.status === "PAUSED"
                      ? (isRTL ? "מושהה" : "Paused")
                      : flow.status === "DRAFT"
                      ? (isRTL ? "טיוטה" : "Draft")
                      : (isRTL ? "בארכיון" : "Archived")}
                  </Badge>
                </div>
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-6">
              <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Settings className="h-4 w-4 me-2" />
                  {isRTL ? "הגדרות" : "Settings"}
                </TabsTrigger>
                <TabsTrigger
                  value="message"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <MessageSquare className="h-4 w-4 me-2" />
                  {isRTL ? "הודעה" : "Message"}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <History className="h-4 w-4 me-2" />
                  {isRTL ? "היסטוריה" : "History"}
                  {flow.stats.total > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {flow.stats.total}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0 p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                      <p className="text-2xl font-bold">{flow.stats.pending}</p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "ממתין" : "Pending"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                      <p className="text-2xl font-bold">{flow.stats.completed}</p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "הושלם" : "Sent"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
                      <p className="text-2xl font-bold">{flow.stats.failed}</p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "נכשל" : "Failed"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                      <p className="text-2xl font-bold">{flow.stats.skipped}</p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "דולג" : "Skipped"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Success Rate */}
                {flow.stats.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {isRTL ? "אחוז הצלחה" : "Success Rate"}
                      </span>
                      <span className="font-medium">{successRate}%</span>
                    </div>
                    <Progress value={successRate} className="h-2" />
                  </div>
                )}

                <Separator />

                {/* Flow Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {isRTL ? "הגדרות התהליך" : "Flow Configuration"}
                    </h3>
                    {!isEditing ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit3 className="h-4 w-4 me-2" />
                        {isRTL ? "עריכה" : "Edit"}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4 me-2" />
                          {isRTL ? "ביטול" : "Cancel"}
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? (
                            <Icons.spinner className="h-4 w-4 me-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 me-2" />
                          )}
                          {isRTL ? "שמור" : "Save"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Visual Flow */}
                  <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-6">
                    <div className="flex flex-col items-center space-y-2">
                      {isEditing ? (
                        <>
                          {/* Trigger Selector */}
                          <div className="w-full max-w-sm">
                            <Label className="text-xs text-muted-foreground mb-2 block">
                              {isRTL ? "כשקורה (טריגר)" : "When (Trigger)"}
                            </Label>
                            <Select
                              value={editTrigger}
                              onValueChange={(value) => setEditTrigger(value as AutomationTrigger)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {triggerOptions.map((option) => {
                                  const Icon = option.icon;
                                  const isUsed = isTriggerUsed(option.value);
                                  return (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                      disabled={isUsed}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        <span>{option.label}</span>
                                        {isUsed && (
                                          <span className="text-xs text-muted-foreground">
                                            ({isRTL ? "בשימוש" : "in use"})
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <FlowConnector />

                          {/* Action Selector */}
                          <div className="w-full max-w-sm">
                            <Label className="text-xs text-muted-foreground mb-2 block">
                              {isRTL ? "בצע (פעולה)" : "Then (Action)"}
                            </Label>
                            <Select
                              value={editAction}
                              onValueChange={(value) => setEditAction(value as AutomationAction)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {actionOptions.map((option) => {
                                  const Icon = option.icon;
                                  return (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        <span>{option.label}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <>
                          <FlowNode type="trigger" value={flow.trigger} isActive={flow.status === "ACTIVE"} />
                          <FlowConnector isActive={flow.status === "ACTIVE"} />
                          <FlowNode type="action" value={flow.action} isActive={flow.status === "ACTIVE"} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    {isRTL ? "פעולות מהירות" : "Quick Actions"}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {flow.status === "ACTIVE" ? (
                      <Button variant="outline" onClick={() => handleStatusChange("PAUSED")}>
                        <Pause className="h-4 w-4 me-2" />
                        {isRTL ? "השהה" : "Pause"}
                      </Button>
                    ) : (
                      <Button onClick={() => handleStatusChange("ACTIVE")}>
                        <Play className="h-4 w-4 me-2" />
                        {isRTL ? "הפעל" : "Activate"}
                      </Button>
                    )}

                    {flow.stats.failed > 0 && (
                      <Button variant="outline" onClick={handleRetryFailed}>
                        <RotateCcw className="h-4 w-4 me-2" />
                        {isRTL ? `נסה שוב (${flow.stats.failed})` : `Retry Failed (${flow.stats.failed})`}
                      </Button>
                    )}

                    {flow.stats.pending > 0 && (
                      <Button variant="outline" onClick={handleCancelPending}>
                        <Ban className="h-4 w-4 me-2" />
                        {isRTL ? `בטל ממתינים (${flow.stats.pending})` : `Cancel Pending (${flow.stats.pending})`}
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 me-2" />
                          {isRTL ? "מחק" : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {isRTL ? "מחיקת אוטומציה" : "Delete Automation"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isRTL
                              ? "האם אתה בטוח שברצונך למחוק את האוטומציה הזו? פעולה זו לא ניתנת לביטול."
                              : "Are you sure you want to delete this automation? This action cannot be undone."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>
                            {isRTL ? "מחק" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </TabsContent>

              {/* Message Tab */}
              <TabsContent value="message" className="m-0 p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {isRTL ? "תוכן ההודעה" : "Message Content"}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="h-4 w-4 me-2" />
                      {showPreview
                        ? (isRTL ? "הסתר תצוגה מקדימה" : "Hide Preview")
                        : (isRTL ? "תצוגה מקדימה" : "Preview")}
                    </Button>
                  </div>

                  {/* Variables */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {isRTL ? "משתנים זמינים (לחץ להוספה)" : "Available Variables (click to insert)"}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
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
                  </div>

                  {/* Message Editor */}
                  <div className="space-y-2">
                    <Label>{isRTL ? "הודעה מותאמת אישית" : "Custom Message"}</Label>
                    <Textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      placeholder={isRTL
                        ? "שלום {guestName}, תודה על אישור ההגעה לאירוע שלנו ב{venue}!"
                        : "Hi {guestName}, thank you for confirming your attendance at {venue}!"}
                      className="min-h-[150px] resize-none text-start"
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? "השאירו ריק לשימוש בהודעת ברירת המחדל"
                        : "Leave empty to use the default message"}
                    </p>
                  </div>

                  {/* Preview */}
                  {showPreview && (
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {isRTL ? "תצוגה מקדימה" : "Message Preview"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg bg-background p-4 text-sm whitespace-pre-wrap text-start">
                          {getMessagePreview()}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Save Button */}
                  <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? (
                      <Icons.spinner className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 me-2" />
                    )}
                    {isRTL ? "שמור הודעה" : "Save Message"}
                  </Button>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="m-0 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {isRTL ? "היסטוריית הרצות" : "Execution History"}
                  </h3>
                  <Button variant="outline" size="sm" onClick={loadFlow}>
                    <RefreshCw className="h-4 w-4 me-2" />
                    {isRTL ? "רענן" : "Refresh"}
                  </Button>
                </div>

                {flow.executions.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {isRTL
                          ? "אין הרצות עדיין. הפעילו את האוטומציה כדי להתחיל."
                          : "No executions yet. Activate the automation to get started."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {flow.executions.map((execution) => {
                      const statusConfig = EXECUTION_STATUS_CONFIG[execution.status];
                      const StatusIcon = statusConfig.icon;
                      const isRunning = runningExecutionId === execution.id;
                      const canRunNow = execution.status === "PENDING" || execution.status === "FAILED";
                      const hasError = !!execution.errorMessage;
                      const hasRetries = execution.retryCount > 0;

                      return (
                        <Card key={execution.id} className={cn(
                          hasError && execution.status === "PENDING" && "border-amber-500/50 bg-amber-500/5"
                        )}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              {/* Left side - Guest info */}
                              <div className="flex items-start gap-3">
                                <StatusIcon className={cn("h-5 w-5 mt-0.5", statusConfig.color)} />
                                <div className="text-start">
                                  <p className="font-medium flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {execution.guest.name}
                                  </p>
                                  {execution.guest.phoneNumber && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {execution.guest.phoneNumber}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right side - Status and actions */}
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  {hasRetries && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                                      {isRTL ? `ניסיון ${execution.retryCount + 1}` : `Retry #${execution.retryCount}`}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className={statusConfig.color}>
                                    {isRTL ? statusConfig.label.he : statusConfig.label.en}
                                  </Badge>
                                </div>

                                {execution.executedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(execution.executedAt).toLocaleString(
                                      isRTL ? "he-IL" : "en-US",
                                      { dateStyle: "short", timeStyle: "short" }
                                    )}
                                  </p>
                                )}
                                {execution.scheduledFor && execution.status === "PENDING" && (
                                  <p className="text-xs text-muted-foreground">
                                    {isRTL ? "מתוכנן ל: " : "Scheduled: "}
                                    {new Date(execution.scheduledFor).toLocaleString(
                                      isRTL ? "he-IL" : "en-US",
                                      { dateStyle: "short", timeStyle: "short" }
                                    )}
                                  </p>
                                )}

                                {/* Run Now button for pending/failed */}
                                {canRunNow && (
                                  <Button
                                    size="sm"
                                    variant={execution.status === "FAILED" ? "destructive" : "outline"}
                                    className="h-7 text-xs"
                                    onClick={() => handleRunNow(execution.id)}
                                    disabled={isRunning}
                                  >
                                    {isRunning ? (
                                      <Icons.spinner className="h-3 w-3 animate-spin me-1" />
                                    ) : (
                                      <Play className="h-3 w-3 me-1" />
                                    )}
                                    {isRTL ? "הרץ עכשיו" : "Run Now"}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Error message - full width below */}
                            {hasError && (
                              <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-start">
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  <span className="font-medium">{isRTL ? "שגיאה: " : "Error: "}</span>
                                  {execution.errorMessage}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
