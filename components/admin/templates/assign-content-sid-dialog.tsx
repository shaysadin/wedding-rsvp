"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link2, Search, Check, RefreshCw, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";
import {
  fetchTwilioApprovedTemplates,
  assignTwilioContentSid,
} from "@/actions/whatsapp-templates";

interface AssignContentSidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialType?: WhatsAppTemplateType;
  initialStyle?: "style1" | "style2" | "style3";
}

interface TwilioTemplate {
  sid: string;
  friendlyName: string;
  language: string;
  dateCreated: string;
  dateUpdated: string;
  previewText: string;
  contentType: string;
}

const TEMPLATE_TYPES: { value: WhatsAppTemplateType; label: string }[] = [
  { value: "INVITE", label: "Standard Invite" },
  { value: "REMINDER", label: "Standard Reminder" },
  { value: "INTERACTIVE_INVITE", label: "Interactive Invite" },
  { value: "INTERACTIVE_REMINDER", label: "Interactive Reminder" },
  { value: "IMAGE_INVITE", label: "Image Invite" },
  { value: "TRANSPORTATION_INVITE", label: "Transportation Invite" },
  { value: "CONFIRMATION", label: "Confirmation" },
  { value: "EVENT_DAY", label: "Event Day" },
  { value: "THANK_YOU", label: "Thank You" },
  { value: "TABLE_ASSIGNMENT", label: "Table Assignment" },
  { value: "GUEST_COUNT_LIST", label: "Guest Count List" },
];

export function AssignContentSidDialog({
  open,
  onOpenChange,
  onSuccess,
  initialType,
  initialStyle,
}: AssignContentSidDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TwilioTemplate | null>(null);

  // Form state
  const [type, setType] = useState<WhatsAppTemplateType>(initialType || "INVITE");
  const [style, setStyle] = useState<"style1" | "style2" | "style3">(
    initialStyle || "style1"
  );

  // Fetch templates when dialog opens
  useEffect(() => {
    if (open) {
      handleFetchTemplates();
    }
  }, [open]);

  const handleFetchTemplates = async () => {
    setIsFetching(true);
    try {
      const result = await fetchTwilioApprovedTemplates();

      if (result.success) {
        setTemplates(result.templates as TwilioTemplate[]);
        toast.success(`Found ${result.templates.length} approved templates`);
      } else {
        toast.error(result.error || "Failed to fetch templates");
        setTemplates([]);
      }
    } catch (error) {
      toast.error("An error occurred while fetching templates");
      setTemplates([]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsLoading(true);

    try {
      const result = await assignTwilioContentSid({
        type,
        style,
        contentSid: selectedTemplate.sid,
        friendlyName: selectedTemplate.friendlyName,
        previewText: selectedTemplate.previewText,
      });

      if (result.success) {
        toast.success(result.message || "Template assigned successfully!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to assign template");
      }
    } catch (error) {
      toast.error("An error occurred while assigning the template");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates based on search
  const filteredTemplates = templates.filter(
    (template) =>
      template.friendlyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.sid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.previewText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Assign Existing Twilio Template
          </DialogTitle>
          <DialogDescription>
            Select an approved template from Twilio and assign it to a template type and
            style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign to Template Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as WhatsAppTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign to Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style1">Style 1</SelectItem>
                  <SelectItem value="style2">Style 2</SelectItem>
                  <SelectItem value="style3">Style 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search and Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, SID, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFetchTemplates}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] pr-4">
              {isFetching ? (
                <div className="flex items-center justify-center py-12">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>
                    {searchQuery
                      ? "No templates match your search"
                      : "No approved templates found"}
                  </p>
                  <Button
                    variant="link"
                    onClick={handleFetchTemplates}
                    className="mt-2"
                  >
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.sid}
                      className={`p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedTemplate?.sid === template.sid
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.friendlyName}</h4>
                              {selectedTemplate?.sid === template.sid && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <code className="text-xs text-muted-foreground">
                              {template.sid}
                            </code>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {template.language.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.contentType.replace("twilio/", "")}
                            </Badge>
                          </div>
                        </div>

                        {template.previewText && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.previewText}...
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {new Date(template.dateCreated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Template Info */}
          {selectedTemplate && (
            <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Selected Template</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplate.friendlyName} → {type} (Style {style.replace("style", "")})
                  </p>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  {selectedTemplate.sid}
                </Badge>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || !selectedTemplate}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Assign Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
