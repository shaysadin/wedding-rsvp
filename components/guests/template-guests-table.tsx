"use client";

import { useState } from "react";
import { Guest, GuestRsvp, NotificationLog, RsvpStatus, NotificationType, NotificationStatus, VapiCallLog } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  StyledTable,
} from "@/components/template/ui/table";
import { Badge } from "@/components/template/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/shared/icons";
import { Pagination } from "@/components/template/tables/pagination";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;
const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;

export type GuestWithRsvp = Guest & {
  rsvp: GuestRsvp | null;
  notificationLogs: NotificationLog[];
  vapiCallLogs?: VapiCallLog[];
};

type MessageStatus = "not_sent" | "invite_sent" | "reminder_1" | "reminder_2_plus" | "called";

// Helper to get message status from notification logs and call logs
function getMessageStatus(notificationLogs: NotificationLog[], vapiCallLogs?: VapiCallLog[]): MessageStatus {
  const sentLogs = notificationLogs.filter(log =>
    log.status === NotificationStatus.SENT || log.status === NotificationStatus.DELIVERED
  );

  const completedCalls = (vapiCallLogs || []).filter(call =>
    call.status === "COMPLETED" || call.status === "NO_ANSWER" || call.status === "BUSY"
  );

  if (sentLogs.length === 0 && completedCalls.length === 0) {
    return "not_sent";
  }

  type Interaction = { type: "invite" | "reminder" | "call"; timestamp: Date };
  const interactions: Interaction[] = [];

  for (const log of sentLogs) {
    const timestamp = log.sentAt || log.createdAt;
    if (timestamp) {
      const isInvite = log.type === NotificationType.INVITE || log.type === NotificationType.INTERACTIVE_INVITE;
      const isReminder = log.type === NotificationType.REMINDER || log.type === NotificationType.INTERACTIVE_REMINDER;
      if (isInvite) {
        interactions.push({ type: "invite", timestamp: new Date(timestamp) });
      } else if (isReminder) {
        interactions.push({ type: "reminder", timestamp: new Date(timestamp) });
      }
    }
  }

  for (const call of completedCalls) {
    const timestamp = call.endedAt || call.startedAt || call.createdAt;
    if (timestamp) {
      interactions.push({ type: "call", timestamp: new Date(timestamp) });
    }
  }

  interactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const mostRecent = interactions[0];
  if (!mostRecent) return "not_sent";

  if (mostRecent.type === "call") return "called";
  if (mostRecent.type === "invite") return "invite_sent";

  const reminderCount = interactions.filter(i => i.type === "reminder").length;
  if (reminderCount === 1) return "reminder_1";
  return "reminder_2_plus";
}

const messageStatusConfig: Record<MessageStatus, { label: string; color: "light" | "info" | "primary" | "warning" | "success" }> = {
  not_sent: { label: "notSent", color: "light" },
  invite_sent: { label: "inviteSent", color: "info" },
  reminder_1: { label: "reminder1", color: "primary" },
  reminder_2_plus: { label: "reminder2Plus", color: "warning" },
  called: { label: "called", color: "success" },
};

const rsvpStatusConfig: Record<RsvpStatus, { color: "warning" | "success" | "error" | "info" }> = {
  PENDING: { color: "warning" },
  ACCEPTED: { color: "success" },
  DECLINED: { color: "error" },
  MAYBE: { color: "info" },
};

interface TemplateGuestsTableProps {
  guests: GuestWithRsvp[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEditGuest: (guest: GuestWithRsvp) => void;
  onSendMessage: (guest: GuestWithRsvp) => void;
  onCallGuest: (guest: GuestWithRsvp) => void;
  onCopyLink: (slug: string) => void;
  onDeleteGuest: (guest: GuestWithRsvp) => void;
  vapiAvailable: boolean;
  loadingGuestId: string | null;
  callingGuestId: string | null;
  pageSize?: number;
}

export function TemplateGuestsTable({
  guests,
  selectedIds,
  onSelectionChange,
  onEditGuest,
  onSendMessage,
  onCallGuest,
  onCopyLink,
  onDeleteGuest,
  vapiAvailable,
  loadingGuestId,
  callingGuestId,
  pageSize = 25,
}: TemplateGuestsTableProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");
  const tMsg = useTranslations("messageStatus");
  const locale = useLocale();
  const isRTL = locale === "he";

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(guests.length / pageSize);

  // Get paginated guests
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedGuests = guests.slice(startIndex, startIndex + pageSize);

  // Selection helpers
  const allSelected = paginatedGuests.length > 0 && paginatedGuests.every(g => selectedIds.has(g.id));
  const someSelected = paginatedGuests.some(g => selectedIds.has(g.id)) && !allSelected;

  const toggleSelectAll = () => {
    const newSet = new Set(selectedIds);
    if (allSelected) {
      // Deselect all visible
      paginatedGuests.forEach(g => newSet.delete(g.id));
    } else {
      // Select all visible
      paginatedGuests.forEach(g => newSet.add(g.id));
    }
    onSelectionChange(newSet);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (guests.length === 0) {
    return (
      <StyledTable>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.users className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{tc("noResults")}</p>
        </div>
      </StyledTable>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StyledTable>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="w-12 px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                    }}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {t("name")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {t("side")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {t("group")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {t("status")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {t("messageSent")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
                >
                  {t("guestCount")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
                >
                  {tc("actions")}
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedGuests.map((guest) => {
                const status = guest.rsvp?.status || "PENDING";
                const isSelected = selectedIds.has(guest.id);
                const msgStatus = getMessageStatus(guest.notificationLogs, guest.vapiCallLogs);
                const msgConfig = messageStatusConfig[msgStatus];
                const statusConfig = rsvpStatusConfig[status];

                return (
                  <TableRow
                    key={guest.id}
                    className={cn(
                      "transition-colors",
                      isSelected && "bg-brand-50/50 dark:bg-brand-500/10"
                    )}
                  >
                    <TableCell className="w-12 px-5 py-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(guest.id)}
                        aria-label={`Select ${guest.name}`}
                      />
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          <Icons.user className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="block font-medium text-gray-800 text-theme-sm dark:text-white/90 hover:text-brand-500 cursor-pointer text-start"
                            onClick={() => toggleSelect(guest.id)}
                          >
                            {guest.name}
                          </button>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400 font-mono">
                            {guest.phoneNumber || "-"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      {guest.side ? (
                        <Badge size="sm" color="light">
                          {PREDEFINED_SIDES.includes(guest.side as typeof PREDEFINED_SIDES[number])
                            ? t(`sides.${guest.side}` as "sides.bride" | "sides.groom" | "sides.both")
                            : guest.side}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-theme-sm">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      {guest.groupName ? (
                        <Badge size="sm" color="light">
                          {PREDEFINED_GROUPS.includes(guest.groupName as typeof PREDEFINED_GROUPS[number])
                            ? t(`groups.${guest.groupName}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
                            : guest.groupName}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-theme-sm">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={statusConfig.color}>
                        {tStatus(status.toLowerCase() as "pending" | "accepted" | "declined" | "maybe")}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={msgConfig.color}>
                        {tMsg(msgConfig.label as "notSent" | "inviteSent" | "reminder1" | "reminder2Plus" | "called")}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-center">
                      <span className="text-gray-700 text-theme-sm dark:text-gray-300">
                        {status === "ACCEPTED" ? (
                          <span title={t("confirmedGuests")}>
                            {guest.rsvp?.guestCount || 1}
                          </span>
                        ) : (
                          <span className="text-gray-400" title={t("expectedGuests")}>
                            {guest.expectedGuests || 1}
                          </span>
                        )}
                      </span>
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onSendMessage(guest)}
                          disabled={loadingGuestId === guest.id || !guest.phoneNumber}
                          title={guest.phoneNumber ? t("sendMessage") : t("noPhone")}
                        >
                          <Icons.send className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={loadingGuestId === guest.id}>
                              {loadingGuestId === guest.id ? (
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                              ) : (
                                <Icons.ellipsis className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            <DropdownMenuLabel>{tc("actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onEditGuest(guest)}>
                              <Icons.edit className="me-2 h-4 w-4" />
                              {t("edit")}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onCopyLink(guest.slug)}>
                              <Icons.copy className="me-2 h-4 w-4" />
                              {t("copyLink")}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onSendMessage(guest)}>
                              <Icons.messageSquare className="me-2 h-4 w-4" />
                              {t("sendMessage")}
                            </DropdownMenuItem>

                            {vapiAvailable && guest.phoneNumber && (
                              <DropdownMenuItem
                                onClick={() => onCallGuest(guest)}
                                disabled={callingGuestId === guest.id}
                              >
                                {callingGuestId === guest.id ? (
                                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Icons.phone className="me-2 h-4 w-4" />
                                )}
                                {t("callGuest")}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => onDeleteGuest(guest)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Icons.trash className="me-2 h-4 w-4" />
                              {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer with Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/[0.05] px-5 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("showingGuests", {
                from: startIndex + 1,
                to: Math.min(startIndex + pageSize, guests.length),
                total: guests.length,
              })}
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </StyledTable>
    </div>
  );
}
