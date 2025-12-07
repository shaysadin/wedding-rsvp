"use client";

import { useState, useMemo, useEffect } from "react";
import { Guest, GuestRsvp, NotificationLog, RsvpStatus, NotificationType, NotificationStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteGuest, deleteGuests } from "@/actions/guests";
import { sendInvite, sendReminder, sendBulkInvites, sendBulkReminders } from "@/actions/notifications";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { EditGuestDialog } from "./edit-guest-dialog";
import { SendMessageDialog } from "./send-message-dialog";
import {
  GuestsFilterBar,
  type SideFilter,
  type GroupFilter,
  type MessageStatusFilter,
  type RsvpStatusFilter,
} from "./guests-filter-bar";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;
const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;

type GuestWithRsvp = Guest & {
  rsvp: GuestRsvp | null;
  notificationLogs: NotificationLog[];
};


interface GuestsTableProps {
  guests: GuestWithRsvp[];
  eventId: string;
  initialFilter?: string;
}

const statusColors: Record<RsvpStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500",
  ACCEPTED: "bg-green-500/10 text-green-500",
  DECLINED: "bg-red-500/10 text-red-500",
};

// Helper to get message status from notification logs
type MessageStatus = "not_sent" | "invite_sent" | "reminder_1" | "reminder_2_plus";

function getMessageStatus(notificationLogs: NotificationLog[]): MessageStatus {
  const sentLogs = notificationLogs.filter(log =>
    log.status === NotificationStatus.SENT || log.status === NotificationStatus.DELIVERED
  );

  const inviteSent = sentLogs.some(log => log.type === NotificationType.INVITE);
  const reminderCount = sentLogs.filter(log => log.type === NotificationType.REMINDER).length;

  if (!inviteSent && reminderCount === 0) {
    return "not_sent";
  }
  if (inviteSent && reminderCount === 0) {
    return "invite_sent";
  }
  if (reminderCount === 1) {
    return "reminder_1";
  }
  return "reminder_2_plus";
}

const messageStatusConfig: Record<MessageStatus, { label: string; className: string }> = {
  not_sent: { label: "notSent", className: "bg-gray-500/10 text-gray-500" },
  invite_sent: { label: "inviteSent", className: "bg-blue-500/10 text-blue-500" },
  reminder_1: { label: "reminder1", className: "bg-purple-500/10 text-purple-500" },
  reminder_2_plus: { label: "reminder2Plus", className: "bg-orange-500/10 text-orange-500" },
};

export function GuestsTable({ guests, eventId, initialFilter = "all" }: GuestsTableProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const tStatus = useTranslations("status");
  const tMsg = useTranslations("messageStatus");
  const locale = useLocale();
  const isRTL = locale === "he";
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkInviteLoading, setBulkInviteLoading] = useState(false);
  const [bulkReminderLoading, setBulkReminderLoading] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRsvp | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [messageStatusFilter, setMessageStatusFilter] = useState<MessageStatusFilter>("all");
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<RsvpStatusFilter>(
    initialFilter as RsvpStatusFilter || "all"
  );

  // Send message dialog state
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [sendMessageGuests, setSendMessageGuests] = useState<{
    ids: string[];
    names: string[];
    statuses: ("PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE")[];
  }>({ ids: [], names: [], statuses: [] });
  const [sendMessageMode, setSendMessageMode] = useState<"single" | "bulk">("single");

  // Sync rsvpStatusFilter when initialFilter prop changes (URL navigation)
  useEffect(() => {
    setRsvpStatusFilter(initialFilter as RsvpStatusFilter || "all");
  }, [initialFilter]);

  // Compute custom groups from guest list
  const customGroups = useMemo(() => {
    const groups = guests
      .map((g) => g.groupName)
      .filter((g): g is string => !!g && !PREDEFINED_GROUPS.includes(g as typeof PREDEFINED_GROUPS[number]));
    return [...new Set(groups)];
  }, [guests]);

  // Compute custom sides from guest list
  const customSides = useMemo(() => {
    const sides = guests
      .map((g) => g.side)
      .filter((s): s is string => !!s && !PREDEFINED_SIDES.includes(s as typeof PREDEFINED_SIDES[number]));
    return [...new Set(sides)];
  }, [guests]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sideFilter !== "all") count++;
    if (groupFilter !== "all") count++;
    if (messageStatusFilter !== "all") count++;
    if (rsvpStatusFilter !== "all") count++;
    return count;
  }, [sideFilter, groupFilter, messageStatusFilter, rsvpStatusFilter]);

  // Count guests who haven't received an invite
  const notSentCount = useMemo(() => {
    return guests.filter((guest) => getMessageStatus(guest.notificationLogs) === "not_sent").length;
  }, [guests]);

  // Count pending guests (for reminders)
  const pendingGuestsCount = useMemo(() => {
    return guests.filter((guest) => {
      const status = guest.rsvp?.status || "PENDING";
      return status === "PENDING";
    }).length;
  }, [guests]);

  // Clear all filters
  const clearFilters = () => {
    setSideFilter("all");
    setGroupFilter("all");
    setMessageStatusFilter("all");
    setRsvpStatusFilter("all");
  };

  // Filter guests based on search query and all filters
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Apply RSVP status filter
    if (rsvpStatusFilter !== "all") {
      filtered = filtered.filter((guest) => {
        const guestStatus = guest.rsvp?.status || "PENDING";
        return guestStatus.toLowerCase() === rsvpStatusFilter;
      });
    }

    // Apply side filter
    if (sideFilter !== "all") {
      filtered = filtered.filter((guest) => guest.side === sideFilter);
    }

    // Apply group filter
    if (groupFilter !== "all") {
      filtered = filtered.filter((guest) => guest.groupName === groupFilter);
    }

    // Apply message status filter
    if (messageStatusFilter !== "all") {
      filtered = filtered.filter((guest) => {
        const msgStatus = getMessageStatus(guest.notificationLogs);
        if (messageStatusFilter === "not_sent") {
          return msgStatus === "not_sent";
        }
        if (messageStatusFilter === "invite_sent") {
          return msgStatus === "invite_sent";
        }
        if (messageStatusFilter === "reminder_sent") {
          return msgStatus === "reminder_1" || msgStatus === "reminder_2_plus";
        }
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.name.toLowerCase().includes(query) ||
          guest.phoneNumber?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [guests, searchQuery, rsvpStatusFilter, sideFilter, groupFilter, messageStatusFilter]);

  const allSelected = filteredGuests.length > 0 && selectedIds.size === filteredGuests.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredGuests.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGuests.map((g) => g.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSendInvite = async (guestId: string) => {
    setLoading(guestId);
    const result = await sendInvite(guestId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("sent"));
    }
  };

  const handleSendReminder = async (guestId: string) => {
    setLoading(guestId);
    const result = await sendReminder(guestId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("sent"));
    }
  };

  const handleDelete = async (guestId: string) => {
    if (!confirm(tc("confirm"))) return;

    setLoading(guestId);
    const result = await deleteGuest(guestId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("deleted"));
    }
  };

  const handleCopyLink = async (guestSlug: string) => {
    const baseUrl = window.location.origin;
    const rsvpUrl = `${baseUrl}/rsvp/${guestSlug}`;

    try {
      await navigator.clipboard.writeText(rsvpUrl);
      toast.success(t("linkCopied"));
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = rsvpUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success(t("linkCopied"));
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t("confirmBulkDelete", { count: selectedIds.size }))) return;

    setBulkLoading(true);
    const result = await deleteGuests(Array.from(selectedIds));
    setBulkLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("bulkDeleteSuccess", { count: selectedIds.size }));
      setSelectedIds(new Set());
    }
  };

  // Bulk send invites to guests who haven't received an invite
  const handleBulkSendInvites = async () => {
    setBulkInviteLoading(true);
    const result = await sendBulkInvites(eventId);
    setBulkInviteLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      if (result.sent === 0) {
        toast.info(t("allGuestsInvited"));
      } else {
        toast.success(t("bulkInviteSuccess", { sent: result.sent ?? 0, total: result.total ?? 0 }));
      }
    }
  };

  // Bulk send reminders to pending guests
  const handleBulkSendReminders = async () => {
    setBulkReminderLoading(true);
    const result = await sendBulkReminders(eventId);
    setBulkReminderLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      if (result.sent === 0) {
        toast.info(t("noPendingGuests"));
      } else {
        toast.success(t("bulkReminderSuccess", { sent: result.sent ?? 0, total: result.total ?? 0 }));
      }
    }
  };

  // Open send message dialog for bulk
  const openBulkSendMessage = () => {
    if (selectedIds.size === 0) return;
    const selectedGuests = guests.filter((g) => selectedIds.has(g.id));
    setSendMessageGuests({
      ids: selectedGuests.map((g) => g.id),
      names: selectedGuests.map((g) => g.name),
      statuses: selectedGuests.map((g) => (g.rsvp?.status || "PENDING") as "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE"),
    });
    setSendMessageMode("bulk");
    setSendMessageOpen(true);
  };

  // Open send message dialog for single guest
  const openSingleSendMessage = (guest: GuestWithRsvp) => {
    setSendMessageGuests({
      ids: [guest.id],
      names: [guest.name],
      statuses: [(guest.rsvp?.status || "PENDING") as "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE"],
    });
    setSendMessageMode("single");
    setSendMessageOpen(true);
  };

  const handleSendMessageClose = (open: boolean) => {
    setSendMessageOpen(open);
    if (!open) {
      // Clear selection after dialog closes
      setSelectedIds(new Set());
    }
  };

  const handleBulkCopyLinks = async () => {
    if (selectedIds.size === 0) return;

    const baseUrl = window.location.origin;
    const links = guests
      .filter((g) => selectedIds.has(g.id))
      .map((g) => `${g.name}: ${baseUrl}/rsvp/${g.slug}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(links);
      toast.success(t("bulkCopySuccess", { count: selectedIds.size }));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  if (guests.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="users" />
        <EmptyPlaceholder.Title>{t("noGuests")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("addFirst")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      {/* Edit Guest Dialog */}
      {editingGuest && (
        <EditGuestDialog
          guest={editingGuest}
          open={!!editingGuest}
          onOpenChange={(open) => !open && setEditingGuest(null)}
        />
      )}

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={sendMessageOpen}
        onOpenChange={handleSendMessageClose}
        guestIds={sendMessageGuests.ids}
        guestNames={sendMessageGuests.names}
        guestStatuses={sendMessageGuests.statuses}
        eventId={eventId}
        mode={sendMessageMode}
      />

      {/* Search and Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Icons.search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tc("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Filter Bar */}
        <GuestsFilterBar
          sideFilter={sideFilter}
          setSideFilter={setSideFilter}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          messageStatusFilter={messageStatusFilter}
          setMessageStatusFilter={setMessageStatusFilter}
          rsvpStatusFilter={rsvpStatusFilter}
          setRsvpStatusFilter={setRsvpStatusFilter}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          customGroups={customGroups}
          customSides={customSides}
        />

        {/* Quick Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSendInvites}
            disabled={bulkInviteLoading || notSentCount === 0}
            className="gap-2"
          >
            {bulkInviteLoading ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.send className="h-4 w-4" />
            )}
            {t("sendToAllNotSent")}
            {notSentCount > 0 && (
              <Badge variant="secondary" className="ms-1">
                {notSentCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSendReminders}
            disabled={bulkReminderLoading || pendingGuestsCount === 0}
            className="gap-2"
          >
            {bulkReminderLoading ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.bell className="h-4 w-4" />
            )}
            {t("sendReminders")}
            {pendingGuestsCount > 0 && (
              <Badge variant="secondary" className="ms-1">
                {pendingGuestsCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {selectedIds.size}
            </div>
            <p className="text-sm font-medium">
              {t("selectedCount", { count: selectedIds.size })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={openBulkSendMessage}
              className="gap-2"
            >
              <Icons.messageSquare className="h-4 w-4" />
              {t("sendMessage")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCopyLinks}
              disabled={bulkLoading}
            >
              <Icons.copy className="me-2 h-4 w-4" />
              {t("copyLinks")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkLoading}
            >
              <Icons.trash className="me-2 h-4 w-4" />
              {t("deleteSelected")}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="w-full overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                  }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead className="text-center">{t("side")}</TableHead>
              <TableHead className="text-center">{t("group")}</TableHead>
              <TableHead className="text-center">{t("status")}</TableHead>
              <TableHead className="text-center">{t("messageSent")}</TableHead>
              <TableHead className="text-center">{t("guestCount")}</TableHead>
              <TableHead className="w-24">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {tc("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => {
                const status = guest.rsvp?.status || "PENDING";
                const isSelected = selectedIds.has(guest.id);
                const msgStatus = getMessageStatus(guest.notificationLogs);
                const msgConfig = messageStatusConfig[msgStatus];

                return (
                  <TableRow
                    key={guest.id}
                    className={isSelected ? "bg-muted/30" : undefined}
                  >
                    <TableCell className="w-12">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(guest.id)}
                        aria-label={`Select ${guest.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium hover:underline cursor-pointer text-start"
                        onClick={() => toggleSelect(guest.id)}
                      >
                        {guest.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-start">{guest.phoneNumber || "-"}</TableCell>
                    <TableCell className="text-center">
                      {guest.side ? (
                        <Badge variant="outline" className="text-xs">
                          {PREDEFINED_SIDES.includes(guest.side as typeof PREDEFINED_SIDES[number])
                            ? t(`sides.${guest.side}` as "sides.bride" | "sides.groom" | "sides.both")
                            : guest.side}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {guest.groupName ? (
                        <Badge variant="outline" className="text-xs">
                          {PREDEFINED_GROUPS.includes(guest.groupName as typeof PREDEFINED_GROUPS[number])
                            ? t(`groups.${guest.groupName}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
                            : guest.groupName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[status]} variant="secondary">
                        {tStatus(status.toLowerCase() as "pending" | "accepted" | "declined")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={msgConfig.className} variant="secondary">
                        {tMsg(msgConfig.label as "notSent" | "inviteSent" | "reminder1" | "reminder2Plus")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {status === "ACCEPTED" ? (
                        <span title={t("confirmedGuests")}>
                          {guest.rsvp?.guestCount || 1}
                        </span>
                      ) : (
                        <span className="text-muted-foreground" title={t("expectedGuests")}>
                          {guest.expectedGuests || 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSingleSendMessage(guest)}
                          disabled={loading === guest.id || !guest.phoneNumber}
                          title={guest.phoneNumber ? t("sendMessage") : t("noPhone")}
                        >
                          <Icons.send className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={loading === guest.id}>
                              {loading === guest.id ? (
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                              ) : (
                                <Icons.ellipsis className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            <DropdownMenuLabel>{tc("actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => setEditingGuest(guest)}>
                              <Icons.edit className="me-2 h-4 w-4" />
                              {t("edit")}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleCopyLink(guest.slug)}>
                              <Icons.copy className="me-2 h-4 w-4" />
                              {t("copyLink")}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => openSingleSendMessage(guest)}>
                              <Icons.messageSquare className="me-2 h-4 w-4" />
                              {t("sendMessage")}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(guest.id)}
                              className="text-destructive"
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
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
