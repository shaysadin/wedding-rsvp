"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Plus,
  Grid3X3,
  LayoutList,
  RefreshCw,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { VisualFlowCard } from "./visual-flow-card";
import { TemplateCard } from "./template-card";
import { FlowEditorDialog } from "./flow-editor-dialog";
import { FlowDetailDialog } from "./flow-detail-dialog";
import { SystemAutomationCards } from "./system-automation-card";
import { TestAutomationDialog } from "./test-automation-dialog";
import {
  updateAutomationFlowStatus,
  deleteAutomationFlow,
  createAutomationFlowFromTemplate,
} from "@/actions/automation";
import { AutomationFlowStatus, AutomationTrigger, AutomationAction } from "@prisma/client";
import { Icons } from "@/components/shared/icons";

interface FlowStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  skipped: number;
}

interface Flow {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  status: AutomationFlowStatus;
  templateId?: string | null;
  customMessage?: string | null;
  delayHours?: number | null;
  stats: FlowStats;
}

interface FlowTemplate {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  trigger: AutomationTrigger;
  action: AutomationAction;
}

interface AutomationDashboardProps {
  eventId: string;
  flows: Flow[];
  templates: FlowTemplate[];
  customMessages?: {
    rsvpConfirmedMessage?: string | null;
    rsvpDeclinedMessage?: string | null;
  };
  onRefresh: () => void;
}

export function AutomationDashboard({
  eventId,
  flows,
  templates,
  customMessages,
  onRefresh,
}: AutomationDashboardProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("flows");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [testFlowId, setTestFlowId] = useState<string | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  // Get list of existing triggers
  const existingTriggers = flows.map((f) => f.trigger);

  // Calculate stats
  const activeFlows = flows.filter((f) => f.status === "ACTIVE").length;
  const pausedFlows = flows.filter((f) => f.status === "PAUSED").length;
  const draftFlows = flows.filter((f) => f.status === "DRAFT").length;
  const totalMessages = flows.reduce((sum, f) => sum + f.stats.completed, 0);
  const pendingMessages = flows.reduce((sum, f) => sum + f.stats.pending, 0);
  const failedMessages = flows.reduce((sum, f) => sum + f.stats.failed, 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  };

  const handleActivate = async (flowId: string) => {
    setIsLoading(true);
    try {
      const result = await updateAutomationFlowStatus(flowId, "ACTIVE");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האוטומציה הופעלה" : "Automation activated");
        onRefresh();
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה בהפעלת האוטומציה" : "Failed to activate automation");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async (flowId: string) => {
    setIsLoading(true);
    try {
      const result = await updateAutomationFlowStatus(flowId, "PAUSED");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האוטומציה הושהתה" : "Automation paused");
        onRefresh();
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה בהשהיית האוטומציה" : "Failed to pause automation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (flowId: string) => {
    if (!confirm(isRTL ? "האם למחוק את האוטומציה?" : "Delete this automation?")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteAutomationFlow(flowId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האוטומציה נמחקה" : "Automation deleted");
        onRefresh();
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה במחיקת האוטומציה" : "Failed to delete automation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setLoadingTemplateId(templateId);
    try {
      const result = await createAutomationFlowFromTemplate(eventId, templateId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האוטומציה נוספה בהצלחה!" : "Automation added successfully!");
        setActiveTab("flows");
        onRefresh();
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה בהוספת האוטומציה" : "Failed to add automation");
    } finally {
      setLoadingTemplateId(null);
    }
  };

  const handleViewDetails = (flowId: string) => {
    setSelectedFlowId(flowId);
    setIsDetailOpen(true);
  };

  const handleDetailClose = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setSelectedFlowId(null);
    }
  };

  const handleTest = (flowId: string) => {
    setTestFlowId(flowId);
    setIsTestDialogOpen(true);
  };

  const handleTestDialogClose = (open: boolean) => {
    setIsTestDialogOpen(open);
    if (!open) {
      setTestFlowId(null);
    }
  };

  // Get the selected flow for testing
  const testFlow = testFlowId ? flows.find((f) => f.id === testFlowId) : null;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-start">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            {isRTL ? "אוטומציות" : "Automations"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL
              ? "הגדירו תהליכים אוטומטיים לשליחת הודעות לאורחים"
              : "Set up automated flows to send messages to your guests"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <FlowEditorDialog
            eventId={eventId}
            existingTriggers={existingTriggers}
            onSuccess={onRefresh}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-start">
                <p className="text-3xl font-bold">{activeFlows}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "פעילות" : "Active"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-500" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-start">
                <p className="text-3xl font-bold">{totalMessages}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "הודעות נשלחו" : "Messages Sent"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-start">
                <p className="text-3xl font-bold">{pendingMessages}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "ממתינות" : "Pending"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-red-500" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30">
                <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-start">
                <p className="text-3xl font-bold">{failedMessages}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "נכשלו" : "Failed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="flows" className="gap-2">
              <Zap className="h-4 w-4" />
              {isRTL ? "האוטומציות שלי" : "My Automations"}
              {flows.length > 0 && (
                <Badge variant="secondary" className="ms-1 h-5 px-1.5">
                  {flows.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isRTL ? "תבניות מוכנות" : "Templates"}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* My Automations Tab */}
        <TabsContent value="flows" className="mt-6 space-y-6">
          {/* System Automations - Always shown */}
          <SystemAutomationCards
            eventId={eventId}
            customMessages={customMessages}
            onUpdate={onRefresh}
          />

          {/* User's Custom Automations */}
          {flows.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 rounded-full bg-purple-100 p-6 dark:bg-purple-900/30">
                  <Sparkles className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  {isRTL ? "אין אוטומציות מותאמות אישית" : "No custom automations yet"}
                </h3>
                <p className="mb-6 max-w-md text-muted-foreground">
                  {isRTL
                    ? "אוטומציות המערכת פועלות באופן אוטומטי. הוסיפו אוטומציות נוספות לתזכורות, הודעות לפני האירוע ועוד."
                    : "System automations are already working. Add more automations for reminders, pre-event messages, and more."}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("templates")}>
                    <Grid3X3 className="h-4 w-4 me-2" />
                    {isRTL ? "בחר תבנית" : "Choose Template"}
                  </Button>
                  <FlowEditorDialog
                    eventId={eventId}
                    existingTriggers={existingTriggers}
                    onSuccess={onRefresh}
                  >
                    <Button>
                      <Plus className="h-4 w-4 me-2" />
                      {isRTL ? "צור מותאם אישית" : "Create Custom"}
                    </Button>
                  </FlowEditorDialog>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {isRTL ? "אוטומציות מותאמות אישית" : "Custom Automations"}
                </h3>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {flows.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {flows.map((flow) => (
                  <VisualFlowCard
                  key={flow.id}
                  flow={flow}
                  onActivate={handleActivate}
                  onPause={handlePause}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  onTest={handleTest}
                />
              ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-start">
              {isRTL ? "תבניות מוכנות לשימוש" : "Ready-to-use Templates"}
            </h2>
            <p className="text-sm text-muted-foreground text-start">
              {isRTL
                ? "בחרו מהתבניות המוכנות שלנו להפעלה מהירה. כל תבנית מתאימה למצב שימוש נפוץ."
                : "Choose from our ready-made templates for quick setup. Each template is optimized for a common use case."}
            </p>
          </div>

          {templates.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {isRTL
                    ? "אין תבניות זמינות. פנו למנהל המערכת."
                    : "No templates available. Contact your administrator."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isUsed={existingTriggers.includes(template.trigger)}
                  isLoading={loadingTemplateId === template.id}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          )}

          {/* Custom Flow CTA */}
          <Card className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Plus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-start">
                  <h3 className="font-semibold">
                    {isRTL ? "צרו אוטומציה מותאמת אישית" : "Create a Custom Automation"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "בנו תהליך ייחודי עם הטריגר והפעולה שתרצו"
                      : "Build a unique flow with your choice of trigger and action"}
                  </p>
                </div>
              </div>
              <FlowEditorDialog
                eventId={eventId}
                existingTriggers={existingTriggers}
                onSuccess={onRefresh}
              >
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {isRTL ? "התחל ליצור" : "Start Building"}
                </Button>
              </FlowEditorDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flow Detail Dialog */}
      {selectedFlowId && (
        <FlowDetailDialog
          flowId={selectedFlowId}
          existingTriggers={existingTriggers}
          open={isDetailOpen}
          onOpenChange={handleDetailClose}
          onUpdate={onRefresh}
        />
      )}

      {/* Test Automation Dialog */}
      {testFlow && (
        <TestAutomationDialog
          open={isTestDialogOpen}
          onOpenChange={handleTestDialogClose}
          flowId={testFlow.id}
          flowName={testFlow.name}
          action={testFlow.action}
          trigger={testFlow.trigger}
          delayHours={testFlow.delayHours}
          customMessage={testFlow.customMessage}
          eventId={eventId}
        />
      )}
    </div>
  );
}
