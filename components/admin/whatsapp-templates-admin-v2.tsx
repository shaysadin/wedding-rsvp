"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Send,
  RefreshCw,
  Check,
  X,
  Clock,
  AlertCircle,
  Pause,
  FileText,
  Link2,
  Trash2,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icons } from "@/components/shared/icons";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";
import {
  submitTemplateToTwilio,
  checkTemplateApprovalStatus,
  syncAllPendingTemplates,
  deleteWhatsAppTemplate,
  resetStuckTemplate,
} from "@/actions/whatsapp-templates";
import { TemplateCreationDialogV3 } from "./templates/template-creation-dialog-v3";
import { AssignContentSidDialogV2 } from "./templates/assign-content-sid-dialog-v2";
import { EditPreviewTextDialog } from "./templates/edit-preview-text-dialog";
import { AllTemplatesManager } from "./templates/all-templates-manager";

interface WhatsAppTemplate {
  id: string;
  type: string;
  style: string;
  nameHe: string;
  nameEn: string;
  contentSid: string | null;
  templateText: string | null;
  previewText: string | null;
  previewTextHe: string | null;
  isActive: boolean;
  sortOrder: number;
  approvalStatus: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED";
  twilioTemplateName: string | null;
  templateBodyHe: string | null;
  templateBodyEn: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  contentType: string | null;
  category: string | null;
}

interface WhatsAppTemplatesAdminV2Props {
  templates: WhatsAppTemplate[];
}

// Note: TRANSPORTATION_INVITE removed - now handled as Style 3 of INVITE/REMINDER types
const TYPE_LABELS: Partial<Record<WhatsAppTemplateType, { en: string; he: string }>> = {
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

function ApprovalStatusBadge({ status }: { status: WhatsAppTemplate["approvalStatus"] }) {
  const config = {
    DRAFT: {
      icon: FileText,
      label: "Draft",
      className: "bg-gray-100 text-gray-700 border-gray-300",
    },
    PENDING: {
      icon: Clock,
      label: "Pending",
      className: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    APPROVED: {
      icon: Check,
      label: "Approved",
      className: "bg-green-100 text-green-700 border-green-300",
    },
    REJECTED: {
      icon: X,
      label: "Rejected",
      className: "bg-red-100 text-red-700 border-red-300",
    },
    PAUSED: {
      icon: Pause,
      label: "Paused",
      className: "bg-orange-100 text-orange-700 border-orange-300",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

export function WhatsAppTemplatesAdminV2({ templates }: WhatsAppTemplatesAdminV2Props) {
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isEditPreviewDialogOpen, setIsEditPreviewDialogOpen] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<WhatsAppTemplateType | undefined>();
  const [assignTargetStyle, setAssignTargetStyle] = useState<"style1" | "style2" | "style3" | undefined>();
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<WhatsAppTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Group templates by type
  const templatesByType = templates.reduce((acc, template) => {
    const type = template.type as WhatsAppTemplateType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {} as Record<WhatsAppTemplateType, WhatsAppTemplate[]>);

  const handleSubmitTemplate = async (templateId: string) => {
    setIsLoading(true);
    try {
      const result = await submitTemplateToTwilio(templateId);

      if (result.success) {
        toast.success("Template submitted to Twilio successfully!");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to submit template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async (templateId: string) => {
    setIsLoading(true);
    try {
      const result = await checkTemplateApprovalStatus(templateId);

      if (result.success) {
        if (result.changed) {
          toast.success(`Status updated: ${result.previousStatus} → ${result.status}`);
          window.location.reload();
        } else {
          toast.info(`Status unchanged: ${result.status}`);
        }
      } else {
        toast.error(result.error || "Failed to check status");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const result = await syncAllPendingTemplates();

      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to sync templates");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleResetStuckTemplate = async (templateId: string) => {
    if (!confirm("Reset this stuck template back to DRAFT? You'll be able to edit and resubmit it.")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetStuckTemplate(templateId);

      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to reset template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to remove this template assignment? This will not delete the template from Twilio.")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteWhatsAppTemplate(templateId);

      if (result.success) {
        toast.success("Template assignment removed successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to remove template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = templates.filter((t) => t.approvalStatus === "PENDING").length;
  const draftCount = templates.filter((t) => t.approvalStatus === "DRAFT").length;
  const approvedCount = templates.filter((t) => t.approvalStatus === "APPROVED").length;

  return (
    <>
      {/* All Templates Management Section */}
      <div className="mb-8">
        <AllTemplatesManager
          templates={templates}
          onAssignClick={(type, style) => {
            setAssignTargetType(type as WhatsAppTemplateType);
            setAssignTargetStyle(style as "style1" | "style2" | "style3");
            setIsAssignDialogOpen(true);
          }}
        />
      </div>

      {/* Template Assignment to Styles Section */}
      <Card className="overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Icons.messageCircle className="h-5 w-5 text-green-600" />
                Template Assignments
              </CardTitle>
              <CardDescription>
                Assign approved templates to specific message types and styles for your app.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleSyncAll}
                  disabled={syncingAll}
                  className="gap-2"
                >
                  {syncingAll ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Submit & Sync Pending ({pendingCount})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setAssignTargetType(undefined);
                  setAssignTargetStyle(undefined);
                  setIsAssignDialogOpen(true);
                }}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                Assign ContentSid
              </Button>
              <Button onClick={() => setIsCreationDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Drafts</div>
              <div className="text-2xl font-bold">{draftCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Approved</div>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            </Card>
          </div>

          {/* Templates by Type */}
          <div className="space-y-6">
            {(Object.keys(TYPE_LABELS) as WhatsAppTemplateType[]).map((type) => {
              const typeLabels = TYPE_LABELS[type];
              if (!typeLabels) return null; // Skip types without labels (e.g., TRANSPORTATION_INVITE)
              const typeTemplates = templatesByType[type] || [];

              return (
                <div key={type} className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {typeLabels.en}
                    <span className="text-muted-foreground font-normal">
                      ({typeLabels.he})
                    </span>
                  </h3>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Style</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead>Content SID</TableHead>
                        <TableHead className="w-[200px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(["style1", "style2", "style3"] as const).map((style) => {
                        const template = typeTemplates.find((t) => t.style === style);

                        const isTransportationStyle =
                          style === "style3" &&
                          (type === "INVITE" ||
                            type === "REMINDER" ||
                            type === "INTERACTIVE_INVITE" ||
                            type === "INTERACTIVE_REMINDER");

                        return (
                          <TableRow key={`${type}-${style}`}>
                            <TableCell className="font-medium">
                              Style {style.replace("style", "")}
                              {isTransportationStyle && (
                                <span className="text-muted-foreground font-normal text-xs ml-1">
                                  (+ Transportation)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {template ? (
                                <div className="space-y-1">
                                  <ApprovalStatusBadge status={template.approvalStatus} />
                                  {template.approvalStatus === "REJECTED" &&
                                    template.rejectionReason && (
                                      <div className="flex items-start gap-1 text-xs text-red-600">
                                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        <span>{template.rejectionReason}</span>
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Not Created
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {template?.contentSid ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {template.contentSid}
                                </code>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {template ? (
                                <div className="flex justify-end gap-2">
                                  {template.approvalStatus === "DRAFT" && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleSubmitTemplate(template.id)}
                                      disabled={isLoading}
                                      className="gap-2"
                                    >
                                      <Send className="h-4 w-4" />
                                      Submit
                                    </Button>
                                  )}

                                  {template.approvalStatus === "PENDING" && (
                                    <>
                                      {!template.contentSid ? (
                                        <>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleSubmitTemplate(template.id)}
                                            disabled={isLoading}
                                            className="gap-2"
                                          >
                                            <Send className="h-4 w-4" />
                                            Submit to Twilio
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleResetStuckTemplate(template.id)}
                                            disabled={isLoading}
                                            className="gap-2"
                                          >
                                            <RefreshCw className="h-4 w-4" />
                                            Reset to Draft
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCheckStatus(template.id)}
                                          disabled={isLoading}
                                          className="gap-2"
                                        >
                                          <RefreshCw className="h-4 w-4" />
                                          Check Status
                                        </Button>
                                      )}
                                    </>
                                  )}

                                  {template.approvalStatus === "APPROVED" && (
                                    <>
                                      <Badge variant="outline" className="bg-green-50">
                                        <Check className="h-3 w-3 mr-1" />
                                        Ready to Use
                                      </Badge>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setAssignTargetType(type);
                                          setAssignTargetStyle(style);
                                          setIsAssignDialogOpen(true);
                                        }}
                                        disabled={isLoading}
                                        className="gap-2"
                                      >
                                        <Edit className="h-4 w-4" />
                                        Change
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTemplateForPreview(template);
                                          setIsEditPreviewDialogOpen(true);
                                        }}
                                        disabled={isLoading}
                                        className="gap-2"
                                      >
                                        <FileText className="h-4 w-4" />
                                        Edit Preview
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveTemplate(template.id)}
                                        disabled={isLoading}
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove
                                      </Button>
                                    </>
                                  )}

                                  {/* Allow changing/removing for other statuses too */}
                                  {(template.approvalStatus === "REJECTED" ||
                                    template.approvalStatus === "PAUSED" ||
                                    template.approvalStatus === "DRAFT" ||
                                    template.approvalStatus === "PENDING") && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setAssignTargetType(type);
                                          setAssignTargetStyle(style);
                                          setIsAssignDialogOpen(true);
                                        }}
                                        disabled={isLoading}
                                        className="gap-2"
                                      >
                                        <Edit className="h-4 w-4" />
                                        Change
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTemplateForPreview(template);
                                          setIsEditPreviewDialogOpen(true);
                                        }}
                                        disabled={isLoading}
                                        className="gap-2"
                                      >
                                        <FileText className="h-4 w-4" />
                                        Edit Preview
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveTemplate(template.id)}
                                        disabled={isLoading}
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAssignTargetType(type);
                                    setAssignTargetStyle(style);
                                    setIsAssignDialogOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <Link2 className="h-4 w-4" />
                                  Assign
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Creation Dialog */}
      <TemplateCreationDialogV3
        open={isCreationDialogOpen}
        onOpenChange={setIsCreationDialogOpen}
        onSuccess={() => window.location.reload()}
      />

      {/* Assign ContentSid Dialog */}
      <AssignContentSidDialogV2
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        onSuccess={() => window.location.reload()}
        initialType={assignTargetType}
        initialStyle={assignTargetStyle}
      />

      {/* Edit Preview Text Dialog */}
      <EditPreviewTextDialog
        open={isEditPreviewDialogOpen}
        onOpenChange={setIsEditPreviewDialogOpen}
        template={selectedTemplateForPreview}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
