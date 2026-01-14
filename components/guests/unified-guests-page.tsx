"use client";

import { useState, useMemo, useEffect } from "react";
import { Guest, GuestRsvp, NotificationLog, VapiCallLog, NotificationStatus, NotificationType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteGuest, deleteGuests } from "@/actions/guests";
import { getVapiAvailability } from "@/actions/vapi/settings";

// Template UI Components
import { Badge } from "@/components/template/ui/badge";

// shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Custom Components
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { GuestsStatusTabs, type RsvpStatusFilter } from "./guests-status-tabs";
import { TemplateGuestsTable, type GuestWithRsvp } from "./template-guests-table";
import { VoiceCallDialog } from "./voice-call-dialog";
import { GuestsFilterBar, type SideFilter, type GroupFilter, type MessageStatusFilter } from "./guests-filter-bar";
import { AddGuestDialog } from "./add-guest-dialog";
import { EditGuestDialog } from "./edit-guest-dialog";
import { BulkAddGuestsDialog } from "./bulk-add-guests-dialog";
import { ImportGuestsDialog } from "./import-guests-dialog";
import { SendMessageDialog } from "./send-message-dialog";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;
const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;

// Helper to get message status
type MessageStatus = "not_sent" | "invite_sent" | "reminder_1" | "reminder_2_plus" | "called";

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

interface UnifiedGuestsPageProps {
  guests: GuestWithRsvp[];
  eventId: string;
  initialFilter?: string;
  invitationImageUrl?: string | null;
}

export function UnifiedGuestsPage({
  guests,
  eventId,
  initialFilter = "all",
  invitationImageUrl,
}: UnifiedGuestsPageProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const tStatus = useTranslations("status");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter states
  const [statusFilter, setStatusFilter] = useState<RsvpStatusFilter>(initialFilter as RsvpStatusFilter || "all");
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [messageStatusFilter, setMessageStatusFilter] = useState<MessageStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [editingGuest, setEditingGuest] = useState<GuestWithRsvp | null>(null);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [sendMessageGuests, setSendMessageGuests] = useState<{
    ids: string[];
    names: string[];
    statuses: ("PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE")[];
  }>({ ids: [], names: [], statuses: [] });
  const [sendMessageMode, setSendMessageMode] = useState<"single" | "bulk">("single");

  // Voice call dialog state
  const [voiceCallOpen, setVoiceCallOpen] = useState(false);
  const [voiceCallMode, setVoiceCallMode] = useState<"single" | "bulk">("single");
  const [voiceCallGuest, setVoiceCallGuest] = useState<GuestWithRsvp | null>(null);
  const [voiceCallGuests, setVoiceCallGuests] = useState<GuestWithRsvp[]>([]);

  // Loading states
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [callingGuestId, setCallingGuestId] = useState<string | null>(null);
  const [vapiAvailable, setVapiAvailable] = useState(false);

  // Check VAPI availability on mount
  useEffect(() => {
    getVapiAvailability().then((result) => {
      if (result.success && result.available) {
        setVapiAvailable(true);
      }
    });
  }, []);

  // Sync statusFilter when initialFilter prop changes (URL navigation)
  useEffect(() => {
    setStatusFilter(initialFilter as RsvpStatusFilter || "all");
  }, [initialFilter]);

  // Compute custom groups and sides
  const customGroups = useMemo(() => {
    const groups = guests
      .map((g) => g.groupName)
      .filter((g): g is string => !!g && !PREDEFINED_GROUPS.includes(g as typeof PREDEFINED_GROUPS[number]));
    return [...new Set(groups)];
  }, [guests]);

  const customSides = useMemo(() => {
    const sides = guests
      .map((g) => g.side)
      .filter((s): s is string => !!s && !PREDEFINED_SIDES.includes(s as typeof PREDEFINED_SIDES[number]));
    return [...new Set(sides)];
  }, [guests]);

  // Count guests by RSVP status
  const statusCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, accepted: 0, declined: 0 };
    for (const guest of guests) {
      counts.all++;
      const status = (guest.rsvp?.status || "PENDING").toLowerCase();
      if (status === "pending") counts.pending++;
      else if (status === "accepted") counts.accepted++;
      else if (status === "declined") counts.declined++;
    }
    return counts;
  }, [guests]);

  // Count active filters (excluding status tabs)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sideFilter !== "all") count++;
    if (groupFilter !== "all") count++;
    if (messageStatusFilter !== "all") count++;
    return count;
  }, [sideFilter, groupFilter, messageStatusFilter]);

  // Count guests who haven't received an invite
  const notSentCount = useMemo(() => {
    return guests.filter((guest) => getMessageStatus(guest.notificationLogs, guest.vapiCallLogs) === "not_sent").length;
  }, [guests]);

  // Count pending guests (for reminders)
  const pendingGuestsCount = useMemo(() => {
    return guests.filter((guest) => {
      const status = guest.rsvp?.status || "PENDING";
      return status === "PENDING";
    }).length;
  }, [guests]);

  // Pending guests with phone for calling
  const pendingGuestsWithPhone = useMemo(() => {
    return guests.filter((guest) => {
      const status = guest.rsvp?.status || "PENDING";
      return status === "PENDING" && guest.phoneNumber;
    });
  }, [guests]);

  // Clear additional filters (not status tabs)
  const clearFilters = () => {
    setSideFilter("all");
    setGroupFilter("all");
    setMessageStatusFilter("all");
  };

  // Filter guests
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Apply RSVP status filter (from tabs)
    if (statusFilter !== "all") {
      filtered = filtered.filter((guest) => {
        const guestStatus = guest.rsvp?.status || "PENDING";
        return guestStatus.toLowerCase() === statusFilter;
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
        const msgStatus = getMessageStatus(guest.notificationLogs, guest.vapiCallLogs);
        if (messageStatusFilter === "not_sent") return msgStatus === "not_sent";
        if (messageStatusFilter === "invite_sent") return msgStatus === "invite_sent";
        if (messageStatusFilter === "reminder_sent") return msgStatus === "reminder_1" || msgStatus === "reminder_2_plus";
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
  }, [guests, searchQuery, statusFilter, sideFilter, groupFilter, messageStatusFilter]);

  // Get selected guests with phone numbers
  const selectedGuestsWithPhone = useMemo(() => {
    return guests.filter((g) => selectedIds.has(g.id) && g.phoneNumber);
  }, [guests, selectedIds]);

  // Actions
  const handleEditGuest = (guest: GuestWithRsvp) => {
    setEditingGuest(guest);
  };

  const handleSendMessage = (guest: GuestWithRsvp) => {
    setSendMessageGuests({
      ids: [guest.id],
      names: [guest.name],
      statuses: [(guest.rsvp?.status || "PENDING") as "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE"],
    });
    setSendMessageMode("single");
    setSendMessageOpen(true);
  };

  const handleCallGuest = (guest: GuestWithRsvp) => {
    setVoiceCallGuest(guest);
    setVoiceCallMode("single");
    setVoiceCallOpen(true);
  };

  const handleCopyLink = async (slug: string) => {
    const baseUrl = window.location.origin;
    const rsvpUrl = `${baseUrl}/rsvp/${slug}`;

    try {
      await navigator.clipboard.writeText(rsvpUrl);
      toast.success(t("linkCopied"));
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = rsvpUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success(t("linkCopied"));
    }
  };

  const handleDeleteGuest = async (guest: GuestWithRsvp) => {
    if (!confirm(tc("confirm"))) return;

    setLoading(guest.id);
    const result = await deleteGuest(guest.id);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("deleted"));
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

  const handleBulkSendMessage = () => {
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

  const handleBulkCall = () => {
    if (selectedGuestsWithPhone.length === 0) return;
    setVoiceCallGuests(selectedGuestsWithPhone);
    setVoiceCallMode("bulk");
    setVoiceCallOpen(true);
  };

  // Call all pending guests with phone
  const handleCallPendingGuests = () => {
    if (pendingGuestsWithPhone.length === 0) return;
    setVoiceCallGuests(pendingGuestsWithPhone);
    setVoiceCallMode("bulk");
    setVoiceCallOpen(true);
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

  // Quick actions for not sent / pending guests
  const handleSelectNotSentGuests = () => {
    const notSentGuests = guests.filter((guest) => getMessageStatus(guest.notificationLogs, guest.vapiCallLogs) === "not_sent");
    if (notSentGuests.length === 0) return;

    setSelectedIds(new Set(notSentGuests.map((g) => g.id)));
    setSendMessageGuests({
      ids: notSentGuests.map((g) => g.id),
      names: notSentGuests.map((g) => g.name),
      statuses: notSentGuests.map((g) => (g.rsvp?.status || "PENDING") as "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE"),
    });
    setSendMessageMode("bulk");
    setSendMessageOpen(true);
  };

  const handleSelectPendingGuests = () => {
    const pendingGuests = guests.filter((guest) => {
      const status = guest.rsvp?.status || "PENDING";
      return status === "PENDING";
    });
    if (pendingGuests.length === 0) return;

    setSelectedIds(new Set(pendingGuests.map((g) => g.id)));
    setSendMessageGuests({
      ids: pendingGuests.map((g) => g.id),
      names: pendingGuests.map((g) => g.name),
      statuses: pendingGuests.map((g) => (g.rsvp?.status || "PENDING") as "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE"),
    });
    setSendMessageMode("bulk");
    setSendMessageOpen(true);
  };

  const handleSendMessageClose = (open: boolean) => {
    setSendMessageOpen(open);
    if (!open) {
      setSelectedIds(new Set());
    }
  };

  const handleVoiceCallComplete = () => {
    setVoiceCallGuest(null);
    setVoiceCallGuests([]);
    setSelectedIds(new Set());
    // Trigger data refresh
    window.dispatchEvent(new CustomEvent("voice-agent-data-changed"));
  };

  // Overview stats configuration (simple label + value, no icons)
  const overviewStats = [
    {
      key: "total",
      label: t("guestCount"),
      value: statusCounts.all,
    },
    {
      key: "pending",
      label: tStatus("pending"),
      value: statusCounts.pending,
    },
    {
      key: "accepted",
      label: tStatus("accepted"),
      value: statusCounts.accepted,
    },
    {
      key: "declined",
      label: tStatus("declined"),
      value: statusCounts.declined,
    },
  ];

  // Empty state
  if (guests.length === 0) {
    return (
      <div className="space-y-6">
        {/* Overview Card - Empty State */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Header: Overview title + Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {tc("overview")}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <ImportGuestsDialog eventId={eventId} />
              <BulkAddGuestsDialog eventId={eventId} />
              <AddGuestDialog eventId={eventId} />
            </div>
          </div>

          {/* Stats Grid with borders */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-gray-200 dark:border-gray-800">
            {overviewStats.map((stat, index) => (
              <div
                key={stat.key}
                className={`p-5 md:p-6 ${
                  index < overviewStats.length - 1
                    ? "border-b lg:border-b-0 lg:border-e border-gray-200 dark:border-gray-800"
                    : ""
                } ${index === 1 ? "border-e-0 lg:border-e" : ""}`}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {stat.label}
                </p>
                <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  {stat.value}
                </h4>
              </div>
            ))}
          </div>
        </div>

        {/* Table Card - Empty State */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="p-12">
            <EmptyPlaceholder className="border-0">
              <EmptyPlaceholder.Icon name="users" />
              <EmptyPlaceholder.Title>{t("noGuests")}</EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                {t("addFirst")}
              </EmptyPlaceholder.Description>
              <AddGuestDialog eventId={eventId} />
            </EmptyPlaceholder>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dialogs */}
      {editingGuest && (
        <EditGuestDialog
          guest={editingGuest}
          open={!!editingGuest}
          onOpenChange={(open) => !open && setEditingGuest(null)}
        />
      )}

      <SendMessageDialog
        open={sendMessageOpen}
        onOpenChange={handleSendMessageClose}
        guestIds={sendMessageGuests.ids}
        guestNames={sendMessageGuests.names}
        guestStatuses={sendMessageGuests.statuses}
        eventId={eventId}
        mode={sendMessageMode}
        invitationImageUrl={invitationImageUrl}
      />

      <VoiceCallDialog
        open={voiceCallOpen}
        onOpenChange={setVoiceCallOpen}
        eventId={eventId}
        mode={voiceCallMode}
        guest={voiceCallGuest || undefined}
        selectedGuests={voiceCallMode === "bulk" ? voiceCallGuests : undefined}
        onCallComplete={handleVoiceCallComplete}
      />

      <div className="space-y-6">
        {/* Overview Card */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Header: Overview title + Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {tc("overview")}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <AddGuestDialog eventId={eventId} />
              <BulkAddGuestsDialog eventId={eventId} />
              <ImportGuestsDialog eventId={eventId} />

              {/* Divider */}
              <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNotSentGuests}
                disabled={notSentCount === 0}
                className="gap-2"
              >
                <Icons.send className="h-4 w-4" />
                <span className="hidden sm:inline">{t("sendToAllNotSent")}</span>
                <span className="sm:hidden">{tc("send")}</span>
                {notSentCount > 0 && (
                  <Badge size="sm" color="primary">
                    {notSentCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectPendingGuests}
                disabled={pendingGuestsCount === 0}
                className="gap-2"
              >
                <Icons.bell className="h-4 w-4" />
                <span className="hidden sm:inline">{t("sendReminders")}</span>
                <span className="sm:hidden">{tc("remind")}</span>
                {pendingGuestsCount > 0 && (
                  <Badge size="sm" color="warning">
                    {pendingGuestsCount}
                  </Badge>
                )}
              </Button>

              {vapiAvailable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCallPendingGuests}
                  disabled={pendingGuestsWithPhone.length === 0}
                  className="gap-2"
                >
                  <Icons.phone className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("callGuests")}</span>
                  <span className="sm:hidden">{tc("call")}</span>
                  {pendingGuestsWithPhone.length > 0 && (
                    <Badge size="sm" color="success">
                      {pendingGuestsWithPhone.length}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Stats Grid with borders */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-gray-200 dark:border-gray-800">
            {overviewStats.map((stat, index) => (
              <div
                key={stat.key}
                className={`p-5 md:p-6 ${
                  index < overviewStats.length - 1
                    ? "border-b lg:border-b-0 lg:border-e border-gray-200 dark:border-gray-800"
                    : ""
                } ${index === 1 ? "border-e-0 lg:border-e" : ""}`}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {stat.label}
                </p>
                <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  {stat.value}
                </h4>
              </div>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          {/* Single Row Header: Title | Tabs | Search | Filter */}
          <div className="border-b border-gray-200 dark:border-white/[0.05] p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Title + Subtitle */}
              <div className="shrink-0">
                <div className="flex gap-8">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {t("title")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("description")}
                    </p>
                    </div>
                {/* Status Tabs */}
                <div className="shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
                  <GuestsStatusTabs
                    selectedStatus={statusFilter}
                    onStatusChange={setStatusFilter}
                    counts={statusCounts}
                  />
                </div>
                </div>
              </div>

              {/* Right: Tabs + Search + Filter */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 overflow-x-auto">
                

                {/* Search */}
                <div className="relative shrink-0 w-full sm:w-auto">
                  <Icons.search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={tc("search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10 h-9 w-full sm:w-[200px] bg-transparent border-gray-200 dark:border-gray-700"
                  />
                </div>

                {/* Filter Button */}
                <div className="shrink-0">
                  <GuestsFilterBar
                    sideFilter={sideFilter}
                    setSideFilter={setSideFilter}
                    groupFilter={groupFilter}
                    setGroupFilter={setGroupFilter}
                    messageStatusFilter={messageStatusFilter}
                    setMessageStatusFilter={setMessageStatusFilter}
                    rsvpStatusFilter={statusFilter}
                    setRsvpStatusFilter={setStatusFilter}
                    onClearFilters={clearFilters}
                    activeFilterCount={activeFilterCount}
                    customGroups={customGroups}
                    customSides={customSides}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="border-b border-gray-100 dark:border-white/[0.05] bg-brand-50/50 dark:bg-brand-500/10 px-5 py-3 md:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white text-sm font-medium">
                    {selectedIds.size}
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("selectedCount", { count: selectedIds.size })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleBulkSendMessage}
                    className="gap-2"
                  >
                    <Icons.messageSquare className="h-4 w-4" />
                    {t("sendMessage")}
                  </Button>
                  {vapiAvailable && selectedGuestsWithPhone.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkCall}
                      className="gap-2"
                    >
                      <Icons.phone className="h-4 w-4" />
                      {t("callSelected")} ({selectedGuestsWithPhone.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkCopyLinks}
                    disabled={bulkLoading}
                    className="gap-2"
                  >
                    <Icons.copy className="h-4 w-4" />
                    {t("copyLinks")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Icons.trash className="h-4 w-4" />
                    {t("deleteSelected")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Guests Table */}
          <TemplateGuestsTable
            guests={filteredGuests}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onEditGuest={handleEditGuest}
            onSendMessage={handleSendMessage}
            onCallGuest={handleCallGuest}
            onCopyLink={handleCopyLink}
            onDeleteGuest={handleDeleteGuest}
            vapiAvailable={vapiAvailable}
            loadingGuestId={loading}
            callingGuestId={callingGuestId}
          />
        </div>
      </div>
    </>
  );
}
