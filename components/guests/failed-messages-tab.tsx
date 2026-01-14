"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { NotificationType, NotificationChannel, NotificationStatus } from "@prisma/client";

import { retryFailedNotification } from "@/actions/notifications";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { cn } from "@/lib/utils";

export interface FailedNotification {
  id: string;
  guestId: string;
  guestName: string;
  guestPhone: string | null;
  guestSlug: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  errorCode: number | null;
  errorMessage: string | null;
  twilioStatus: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

interface FailedMessagesTabProps {
  notifications: FailedNotification[];
  eventId: string;
  onRefresh: () => void;
}

export function FailedMessagesTab({
  notifications,
  eventId,
  onRefresh,
}: FailedMessagesTabProps) {
  const t = useTranslations("failedMessages");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [errorFilter, setErrorFilter] = useState<string>("all");

  // Get unique error codes for filter
  const errorCodes = useMemo(() => {
    const codes = new Set<number>();
    notifications.forEach((n) => {
      if (n.errorCode) codes.add(n.errorCode);
    });
    return Array.from(codes).sort();
  }, [notifications]);

  // Filter notifications by error code
  const filteredNotifications = useMemo(() => {
    if (errorFilter === "all") return notifications;
    const code = parseInt(errorFilter, 10);
    return notifications.filter((n) => n.errorCode === code);
  }, [notifications, errorFilter]);

  // Get localized error message
  const getErrorMessage = (errorCode: number | null, errorMessage: string | null): string => {
    if (!errorCode) return errorMessage || t("errorCodes.unknown");

    // Try to get translated error message
    const translatedKey = `errorCodes.${errorCode}`;
    const translated = t.raw(translatedKey);

    // If translation exists (not the key itself), use it
    if (translated !== translatedKey) {
      return translated as string;
    }

    // Fall back to error message or unknown
    return errorMessage || t("errorCodes.unknown");
  };

  // Get localized message type
  const getMessageType = (type: NotificationType): string => {
    const translatedKey = `messageTypes.${type}`;
    const translated = t.raw(translatedKey);
    return translated !== translatedKey ? (translated as string) : type;
  };

  // Format date
  const formatDate = (date: Date | null): string => {
    if (!date) return "-";
    return new Date(date).toLocaleString(locale === "he" ? "he-IL" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Handle retry
  const handleRetry = async (notificationId: string) => {
    setRetryingIds((prev) => new Set([...prev, notificationId]));

    try {
      const result = await retryFailedNotification(notificationId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("retrySuccess"));
        onRefresh();
      }
    } catch (error) {
      toast.error(t("retryFailed"));
    } finally {
      setRetryingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  if (notifications.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="check" />
        <EmptyPlaceholder.Title>{t("noFailedMessages")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("allMessagesDelivered")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <span className="text-sm text-muted-foreground">{t("filterByError")}:</span>
          <Select value={errorFilter} onValueChange={setErrorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allErrors")}</SelectItem>
              {errorCodes.map((code) => (
                <SelectItem key={code} value={code.toString()}>
                  {code} - {getErrorMessage(code, null)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Badge variant="secondary">
          {t("count", { count: filteredNotifications.length })}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(isRTL && "text-right")}>{t("guestName")}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{t("phone")}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{t("messageType")}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{t("errorCode")}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{t("errorReason")}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{t("sentAt")}</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell className="font-medium">{notification.guestName}</TableCell>
                <TableCell className="font-mono text-sm">
                  {notification.guestPhone || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getMessageType(notification.type)}</Badge>
                </TableCell>
                <TableCell>
                  {notification.errorCode ? (
                    <Badge variant="destructive">{notification.errorCode}</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={notification.errorMessage || undefined}>
                  {getErrorMessage(notification.errorCode, notification.errorMessage)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(notification.sentAt || notification.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetry(notification.id)}
                    disabled={retryingIds.has(notification.id)}
                  >
                    {retryingIds.has(notification.id) ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.refresh className="h-4 w-4" />
                    )}
                    <span className={cn("ml-2", isRTL && "mr-2 ml-0")}>
                      {retryingIds.has(notification.id) ? t("retrying") : t("retry")}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
