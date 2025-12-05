"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sendBulkInvites, sendBulkReminders } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface BulkActionsBarProps {
  eventId: string;
  pendingCount: number;
}

export function BulkActionsBar({ eventId, pendingCount }: BulkActionsBarProps) {
  const t = useTranslations("guests");
  const te = useTranslations("errors");
  const [isLoading, setIsLoading] = useState<"invites" | "reminders" | null>(null);

  const handleSendInvites = async () => {
    setIsLoading("invites");

    try {
      const result = await sendBulkInvites(eventId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.sent || result.sent === 0) {
        toast.info(t("noInvitesToSend"));
      } else {
        toast.success(t("sentInvites", { count: result.sent }));
      }
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(null);
    }
  };

  const handleSendReminders = async () => {
    if (pendingCount === 0) {
      toast.info(t("noPendingToRemind"));
      return;
    }

    setIsLoading("reminders");

    try {
      const result = await sendBulkReminders(eventId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.sent || result.sent === 0) {
        toast.info(t("noPendingToRemind"));
      } else {
        toast.success(t("sentReminders", { count: result.sent }));
      }
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-4">
        <Button
          variant="outline"
          onClick={handleSendInvites}
          disabled={isLoading !== null}
        >
          {isLoading === "invites" ? (
            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.send className="me-2 h-4 w-4" />
          )}
          {t("sendAllInvites")}
        </Button>

        <Button
          variant="outline"
          onClick={handleSendReminders}
          disabled={isLoading !== null || pendingCount === 0}
        >
          {isLoading === "reminders" ? (
            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.bell className="me-2 h-4 w-4" />
          )}
          {t("sendAllPending")} ({pendingCount})
        </Button>
      </CardContent>
    </Card>
  );
}
