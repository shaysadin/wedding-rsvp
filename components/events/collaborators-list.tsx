"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Crown, UserMinus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  getEventCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
} from "@/actions/collaborators";
import { CollaboratorRole } from "@prisma/client";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Collaborator {
  id: string;
  role: CollaboratorRole;
  user: User;
  acceptedAt: Date | null;
}

interface CollaboratorsListProps {
  eventId: string;
  currentUserId: string;
  isOwner: boolean;
  className?: string;
}

export function CollaboratorsList({
  eventId,
  currentUserId,
  isOwner,
  className,
}: CollaboratorsListProps) {
  const t = useTranslations("collaboration");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [owner, setOwner] = useState<User | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadCollaborators();
  }, [eventId]);

  const loadCollaborators = async () => {
    setIsLoading(true);
    try {
      const result = await getEventCollaborators(eventId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        setOwner(result.owner);
        setCollaborators(result.collaborators);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת משתפים" : "Failed to load collaborators");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: CollaboratorRole) => {
    setUpdatingId(collaboratorId);
    try {
      const result = await updateCollaboratorRole(collaboratorId, newRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "התפקיד עודכן" : "Role updated");
        loadCollaborators();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון תפקיד" : "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    try {
      const result = await removeCollaborator(collaboratorId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "המשתף הוסר" : "Collaborator removed");
        loadCollaborators();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהסרת משתף" : "Failed to remove collaborator");
    } finally {
      setRemovingId(null);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!owner && collaborators.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {t("noCollaborators")}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Owner */}
      {owner && (
        <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
          <Avatar className="h-10 w-10">
            <AvatarImage src={owner.image || undefined} alt={owner.name || owner.email} />
            <AvatarFallback>{getInitials(owner.name, owner.email)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{owner.name || owner.email}</p>
            {owner.name && (
              <p className="text-sm text-muted-foreground truncate">{owner.email}</p>
            )}
          </div>
          <Badge variant="secondary" className="gap-1 shrink-0">
            <Crown className="h-3 w-3" />
            {t("owner")}
          </Badge>
        </div>
      )}

      {/* Collaborators */}
      {collaborators.map((collab) => {
        const isCurrentUser = collab.user.id === currentUserId;

        return (
          <div
            key={collab.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={collab.user.image || undefined}
                alt={collab.user.name || collab.user.email}
              />
              <AvatarFallback>
                {getInitials(collab.user.name, collab.user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {collab.user.name || collab.user.email}
                {isCurrentUser && (
                  <span className="text-muted-foreground text-sm ms-1">
                    ({isRTL ? "את/ה" : "you"})
                  </span>
                )}
              </p>
              {collab.user.name && (
                <p className="text-sm text-muted-foreground truncate">
                  {collab.user.email}
                </p>
              )}
            </div>

            {/* Role selector (only owner can change) */}
            {isOwner && !isCurrentUser ? (
              <Select
                value={collab.role}
                onValueChange={(value) =>
                  handleRoleChange(collab.id, value as CollaboratorRole)
                }
                disabled={updatingId === collab.id}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">{t("roles.editor")}</SelectItem>
                  <SelectItem value="VIEWER">{t("roles.viewer")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline">
                {collab.role === "EDITOR" ? t("roles.editor") : t("roles.viewer")}
              </Badge>
            )}

            {/* Remove button */}
            {(isOwner || isCurrentUser) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={removingId === collab.id}
                  >
                    {removingId === collab.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isCurrentUser
                        ? isRTL
                          ? "עזוב אירוע"
                          : "Leave Event"
                        : isRTL
                          ? "הסר משתף"
                          : "Remove Collaborator"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isCurrentUser
                        ? isRTL
                          ? "האם אתה בטוח שברצונך לעזוב את האירוע? לא תוכל לגשת אליו יותר."
                          : "Are you sure you want to leave this event? You will no longer have access."
                        : isRTL
                          ? `האם אתה בטוח שברצונך להסיר את ${collab.user.name || collab.user.email} מהאירוע?`
                          : `Are you sure you want to remove ${collab.user.name || collab.user.email} from this event?`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {isRTL ? "ביטול" : "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(collab.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isCurrentUser
                        ? isRTL
                          ? "עזוב"
                          : "Leave"
                        : t("removeCollaborator")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      })}
    </div>
  );
}
