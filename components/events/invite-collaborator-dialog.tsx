"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { UserPlus, Link2, Mail, Copy, Check, Loader2, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createEventInvitationLink, sendEventInvitation } from "@/actions/invitations";
import { CollaboratorRole } from "@prisma/client";
import { CollaboratorsList } from "./collaborators-list";

interface InviteCollaboratorDialogProps {
  eventId: string;
  currentUserId?: string;
  className?: string;
}

export function InviteCollaboratorDialog({
  eventId,
  currentUserId,
  className,
}: InviteCollaboratorDialogProps) {
  const t = useTranslations("collaboration");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"invite" | "manage">("invite");
  const [inviteMode, setInviteMode] = useState<"link" | "email">("link");
  const [role, setRole] = useState<CollaboratorRole>("EDITOR");
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      const result = await createEventInvitationLink(eventId, role);
      if (result.error) {
        toast.error(result.error);
      } else if (result.inviteLink) {
        setInviteLink(result.inviteLink);
      }
    } catch {
      toast.error(isRTL ? "שגיאה ביצירת קישור" : "Failed to create link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error(isRTL ? "שגיאה בהעתקה" : "Failed to copy");
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast.error(isRTL ? "נא להזין כתובת אימייל" : "Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendEventInvitation(eventId, email, role);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההזמנה נשלחה בהצלחה" : "Invitation sent successfully");
        setEmail("");
      }
    } catch {
      toast.error(isRTL ? "שגיאה בשליחת ההזמנה" : "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setInviteLink(null);
      setEmail("");
      setIsCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("invite")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("inviteTitle")}</DialogTitle>
          <DialogDescription>{t("inviteDescription")}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "invite" | "manage")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-2">
              <UserPlus className="h-4 w-4" />
              {isRTL ? "הזמן" : "Invite"}
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <Users className="h-4 w-4" />
              {t("collaborators")}
            </TabsTrigger>
          </TabsList>

          {/* Invite Tab */}
          <TabsContent value="invite" className="space-y-4 mt-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>{isRTL ? "תפקיד" : "Role"}</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as CollaboratorRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">
                    {t("roles.editor")} - {isRTL ? "יכול לערוך" : "Can edit"}
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    {t("roles.viewer")} - {isRTL ? "צפייה בלבד" : "Read-only"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invite Mode Toggle */}
            <div className="flex gap-2 rounded-lg border p-1 bg-muted/30">
              <Button
                variant={inviteMode === "link" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setInviteMode("link")}
              >
                <Link2 className="h-4 w-4" />
                {isRTL ? "קישור" : "Link"}
              </Button>
              <Button
                variant={inviteMode === "email" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setInviteMode("email")}
              >
                <Mail className="h-4 w-4" />
                {isRTL ? "אימייל" : "Email"}
              </Button>
            </div>

            {/* Link Mode */}
            {inviteMode === "link" && (
              <div className="space-y-4">
                {!inviteLink ? (
                  <Button
                    onClick={handleGenerateLink}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="me-2 h-4 w-4" />
                    )}
                    {isRTL ? "צור קישור הזמנה" : "Generate Invite Link"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyLink}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? "הקישור בתוקף ל-7 ימים"
                        : "This link is valid for 7 days"}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCopyLink}
                    >
                      {isCopied ? (
                        <>
                          <Check className="me-2 h-4 w-4 text-green-500" />
                          {t("linkCopied")}
                        </>
                      ) : (
                        <>
                          <Copy className="me-2 h-4 w-4" />
                          {t("copyLink")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Email Mode */}
            {inviteMode === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{isRTL ? "כתובת אימייל" : "Email Address"}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={isLoading || !email}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="me-2 h-4 w-4" />
                  )}
                  {t("sendEmail")}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Manage Collaborators Tab */}
          <TabsContent value="manage" className="mt-4">
            <ScrollArea className="max-h-[300px] pe-4">
              <CollaboratorsList
                eventId={eventId}
                currentUserId={currentUserId || ""}
                isOwner={true}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
