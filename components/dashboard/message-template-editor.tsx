"use client";

import { useState, useTransition } from "react";
import { MessageTemplate, NotificationType } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { upsertTemplate } from "@/actions/message-templates";

interface MessageTemplateEditorProps {
  template: MessageTemplate;
  eventId: string;
  placeholders: { key: string; description: string }[];
  onClose: () => void;
}

export function MessageTemplateEditor({
  template,
  eventId,
  placeholders,
  onClose,
}: MessageTemplateEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(template.title);
  const [message, setMessage] = useState(template.message);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    startTransition(async () => {
      const result = await upsertTemplate(eventId, {
        type: template.type,
        locale: template.locale,
        title: title.trim(),
        message: message.trim(),
        isAcceptedVariant: template.isAcceptedVariant,
        isActive: template.isActive,
      });

      if (result.success) {
        toast.success("Template saved successfully");
        onClose();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    });
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById("template-message") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + placeholder + message.slice(end);
      setMessage(newMessage);

      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      setMessage(message + placeholder);
    }
  };

  // Generate preview with sample data
  const generatePreview = () => {
    return message
      .replace(/\{\{guestName\}\}/g, "John Doe")
      .replace(/\{\{eventTitle\}\}/g, "Sarah & Michael's Wedding")
      .replace(/\{\{rsvpLink\}\}/g, "https://example.com/rsvp/abc123")
      .replace(/\{\{eventDate\}\}/g, "January 15, 2025")
      .replace(/\{\{eventTime\}\}/g, "5:00 PM")
      .replace(/\{\{eventLocation\}\}/g, "The Grand Ballroom, 123 Main St")
      .replace(/\{\{eventVenue\}\}/g, "The Grand Ballroom");
  };

  return (
    <div className="space-y-6">
      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor="template-title">Message Title</Label>
        <Input
          id="template-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter message title..."
        />
        <p className="text-xs text-muted-foreground">
          This is used for internal reference and notification headers
        </p>
      </div>

      {/* Placeholders */}
      <div className="space-y-2">
        <Label>Insert Placeholder</Label>
        <div className="flex flex-wrap gap-2">
          {placeholders.map((p) => (
            <Badge
              key={p.key}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => insertPlaceholder(p.key)}
              title={p.description}
            >
              <Icons.add className="mr-1 h-3 w-3" />
              {p.key}
            </Badge>
          ))}
        </div>
      </div>

      {/* Message Textarea */}
      <div className="space-y-2">
        <Label htmlFor="template-message">Message Content</Label>
        <Textarea
          id="template-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Character count: {message.length}
        </p>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="whitespace-pre-wrap text-sm">{generatePreview()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icons.save className="me-2 h-4 w-4" />
              Save Template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
