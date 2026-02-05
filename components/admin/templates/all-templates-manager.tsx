"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Send,
  RefreshCw,
  Check,
  X,
  Clock,
  Pause,
  Link2,
  Trash2,
  FileText,
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
import {
  submitTemplateToTwilio,
  checkTemplateApprovalStatus,
  deleteWhatsAppTemplate,
  resetStuckTemplate,
  syncAllPendingTemplates,
  syncTemplateContentTypesFromTwilio,
} from "@/actions/whatsapp-templates";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WhatsAppTemplate {
  id: string | null;
  type: string | null;
  style: string | null;
  nameHe: string;
  nameEn: string;
  contentSid: string | null;
  twilioTemplateName: string | null;
  templateBodyHe: string | null;
  previewText: string | null;
  previewTextHe: string | null;
  isActive: boolean;
  approvalStatus: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED";
  contentType: string | null;
  category: string | null;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  isAssigned?: boolean;
}

interface AllTemplatesManagerProps {
  templates: WhatsAppTemplate[];
  onAssignClick: (type: string | null, style: string | null) => void;
}

export function AllTemplatesManager({ templates, onAssignClick }: AllTemplatesManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [fixingContentTypes, setFixingContentTypes] = useState(false);

  const handleSubmit = async (templateId: string) => {
    setIsLoading(true);
    setLoadingTemplateId(templateId);
    try {
      const result = await submitTemplateToTwilio(templateId);

      if (result.success) {
        toast.success("Template submitted successfully!");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to submit template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingTemplateId(null);
    }
  };

  const handleCheckStatus = async (templateId: string) => {
    setIsLoading(true);
    setLoadingTemplateId(templateId);
    try {
      const result = await checkTemplateApprovalStatus(templateId);

      if (result.success) {
        if (result.changed) {
          toast.success(`Status updated to: ${result.status}`);
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
      setLoadingTemplateId(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template? This will set it as inactive.")) {
      return;
    }

    setIsLoading(true);
    setLoadingTemplateId(templateId);
    try {
      const result = await deleteWhatsAppTemplate(templateId);

      if (result.success) {
        toast.success("Template deleted successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setLoadingTemplateId(null);
    }
  };

  const handleResetStuck = async (templateId: string) => {
    if (!confirm("Reset this stuck template back to DRAFT?")) {
      return;
    }

    setIsLoading(true);
    setLoadingTemplateId(templateId);
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
      setLoadingTemplateId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-green-50">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-red-50">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "PAUSED":
        return (
          <Badge variant="outline" className="bg-gray-50">
            <Pause className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline" className="bg-blue-50">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const handleSyncContentTypes = async () => {
    if (!confirm("Sync content types from Twilio? This will fetch the actual content type for each template from Twilio.")) {
      return;
    }

    setFixingContentTypes(true);
    try {
      const result = await syncTemplateContentTypesFromTwilio();

      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to sync content types");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setFixingContentTypes(false);
    }
  };

  const activeTemplates = templates.filter((t) => t.isActive);
  const draftCount = activeTemplates.filter((t) => t.approvalStatus === "DRAFT").length;
  const pendingCount = activeTemplates.filter((t) => t.approvalStatus === "PENDING").length;
  const approvedCount = activeTemplates.filter((t) => t.approvalStatus === "APPROVED").length;
  const rejectedCount = activeTemplates.filter((t) => t.approvalStatus === "REJECTED").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All WhatsApp Templates</CardTitle>
            <CardDescription>
              Total: {activeTemplates.length} | Draft: {draftCount} | Pending: {pendingCount} | Approved: {approvedCount} | Rejected: {rejectedCount}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleSyncContentTypes}
              disabled={fixingContentTypes}
              className="gap-2"
            >
              {fixingContentTypes ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Content Types
            </Button>
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
                Submit & Sync All Pending ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>ContentSid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                activeTemplates.map((template) => (
                  <TableRow key={template.contentSid || template.id}>
                    <TableCell className="font-medium">
                      {template.nameHe || template.twilioTemplateName || "Unnamed"}
                    </TableCell>
                    <TableCell>
                      {template.isAssigned && template.type && template.style ? (
                        <Badge variant="outline" className="bg-green-50">
                          {template.type} - {template.style}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          Not assigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(template.approvalStatus)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {template.contentType || <span className="text-amber-600">Not set</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {template.contentSid ? (
                        <span className="font-mono">{template.contentSid.substring(0, 10)}...</span>
                      ) : (
                        "Not submitted"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Draft: Submit to Twilio (only for locally created templates) */}
                        {template.id && template.approvalStatus === "DRAFT" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSubmit(template.id!)}
                            disabled={isLoading && loadingTemplateId === template.id}
                          >
                            {isLoading && loadingTemplateId === template.id ? (
                              <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Pending without contentSid: Submit or Reset */}
                        {template.id && template.approvalStatus === "PENDING" && !template.contentSid && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSubmit(template.id!)}
                              disabled={isLoading && loadingTemplateId === template.id}
                            >
                              {isLoading && loadingTemplateId === template.id ? (
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetStuck(template.id!)}
                              disabled={isLoading && loadingTemplateId === template.id}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* Pending with contentSid: Check Status */}
                        {template.id && template.approvalStatus === "PENDING" && template.contentSid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckStatus(template.id!)}
                            disabled={isLoading && loadingTemplateId === template.id}
                          >
                            {isLoading && loadingTemplateId === template.id ? (
                              <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Approved: Always show Assign button */}
                        {template.approvalStatus === "APPROVED" && (
                          <Button
                            variant={template.isAssigned ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              // For unassigned templates, let user choose type/style
                              // For assigned, allow reassignment
                              if (!template.isAssigned) {
                                // Open assign dialog without pre-filled type/style
                                onAssignClick(null, null);
                              } else {
                                onAssignClick(template.type!, template.style!);
                              }
                            }}
                            title={template.isAssigned ? "Reassign or view assignment" : "Assign to message type"}
                          >
                            <Link2 className="h-4 w-4" />
                            {!template.isAssigned && <span className="ml-1 text-xs">Assign</span>}
                          </Button>
                        )}

                        {/* Delete - only for assigned templates */}
                        {template.id && template.isAssigned && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id!)}
                            disabled={isLoading && loadingTemplateId === template.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Remove assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
