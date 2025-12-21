"use client";

import { useState, useMemo } from "react";
import { RsvpStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { sendImageInvitation, sendBulkImageInvitations } from "@/actions/invitations";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;
const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;

type InvitationStatusFilter = "all" | "sent" | "notSent";

interface GuestForInvitation {
  id: string;
  name: string;
  phoneNumber: string | null;
  side: string | null;
  groupName: string | null;
  expectedGuests: number;
  rsvp?: {
    status: RsvpStatus;
    guestCount: number | null;
  } | null;
  imageInvitationSent: boolean;
  imageInvitationStatus: string | null;
  imageInvitationSentAt: Date | null;
}

interface InvitationsGuestTableProps {
  guests: GuestForInvitation[];
  eventId: string;
  hasInvitationImage: boolean;
}

const statusColors: Record<RsvpStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500",
  ACCEPTED: "bg-green-500/10 text-green-500",
  DECLINED: "bg-red-500/10 text-red-500",
};

export function InvitationsGuestTable({
  guests,
  eventId,
  hasInvitationImage,
}: InvitationsGuestTableProps) {
  const t = useTranslations("invitations");
  const tg = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Filter states
  const [invitationFilter, setInvitationFilter] = useState<InvitationStatusFilter>("all");
  const [sideFilter, setSideFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "single" | "bulk";
    guestId?: string;
    guestName?: string;
    count?: number;
  }>({ open: false, type: "single" });

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

  // Filter guests
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Apply invitation status filter
    if (invitationFilter === "sent") {
      filtered = filtered.filter((g) => g.imageInvitationSent);
    } else if (invitationFilter === "notSent") {
      filtered = filtered.filter((g) => !g.imageInvitationSent);
    }

    // Apply side filter
    if (sideFilter !== "all") {
      filtered = filtered.filter((g) => g.side === sideFilter);
    }

    // Apply group filter
    if (groupFilter !== "all") {
      filtered = filtered.filter((g) => g.groupName === groupFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.phoneNumber?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [guests, searchQuery, invitationFilter, sideFilter, groupFilter]);

  // Counts
  const notSentCount = useMemo(
    () => guests.filter((g) => !g.imageInvitationSent && g.phoneNumber).length,
    [guests]
  );

  const sentCount = useMemo(
    () => guests.filter((g) => g.imageInvitationSent).length,
    [guests]
  );

  const guestsWithPhone = useMemo(
    () => guests.filter((g) => g.phoneNumber).length,
    [guests]
  );

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

  const handleSendSingle = async (guestId: string) => {
    setLoading(guestId);
    setConfirmDialog({ open: false, type: "single" });

    const result = await sendImageInvitation(guestId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("invitationSent"));
    }
  };

  const handleSendBulk = async () => {
    const guestIds = Array.from(selectedIds);
    if (guestIds.length === 0) return;

    setBulkLoading(true);
    setConfirmDialog({ open: false, type: "bulk" });

    const result = await sendBulkImageInvitations(guestIds);
    setBulkLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.failed && result.failed > 0) {
      toast.warning(t("bulkSendSuccess", { sent: result.sent ?? 0, total: result.total ?? 0 }));
    } else {
      toast.success(t("bulkSendSuccess", { sent: result.sent ?? 0, total: result.total ?? 0 }));
    }

    setSelectedIds(new Set());
  };

  const confirmSendSingle = (guest: GuestForInvitation) => {
    if (!hasInvitationImage) {
      toast.error(t("noImageUploaded"));
      return;
    }
    if (!guest.phoneNumber) {
      toast.error(tg("noPhone"));
      return;
    }
    setConfirmDialog({
      open: true,
      type: "single",
      guestId: guest.id,
      guestName: guest.name,
    });
  };

  const confirmSendBulk = () => {
    if (!hasInvitationImage) {
      toast.error(t("noImageUploaded"));
      return;
    }
    const validCount = Array.from(selectedIds).filter((id) => {
      const guest = guests.find((g) => g.id === id);
      return guest?.phoneNumber;
    }).length;

    if (validCount === 0) {
      toast.error(tg("noPhone"));
      return;
    }

    setConfirmDialog({
      open: true,
      type: "bulk",
      count: validCount,
    });
  };

  const selectAllNotSent = () => {
    const notSent = guests.filter((g) => !g.imageInvitationSent && g.phoneNumber);
    setSelectedIds(new Set(notSent.map((g) => g.id)));
  };

  const clearFilters = () => {
    setInvitationFilter("all");
    setSideFilter("all");
    setGroupFilter("all");
    setSearchQuery("");
  };

  const activeFilterCount =
    (invitationFilter !== "all" ? 1 : 0) +
    (sideFilter !== "all" ? 1 : 0) +
    (groupFilter !== "all" ? 1 : 0);

  if (guests.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="users" />
        <EmptyPlaceholder.Title>{tg("noGuests")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {tg("addFirst")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  return (
    <>
    <div className="relative space-y-4">
      {/* Expand Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute end-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted"
        onClick={() => setIsTableExpanded(true)}
        title={tc("expand")}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sendImageInvitation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "single"
                ? t("confirmSend", { name: confirmDialog.guestName ?? "" })
                : t("confirmBulkSend", { count: confirmDialog.count ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog.type === "single" && confirmDialog.guestId
                  ? handleSendSingle(confirmDialog.guestId)
                  : handleSendBulk()
              }
            >
              {t("sendImageInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">{t("stats.total")}</div>
          <div className="text-2xl font-bold">{guestsWithPhone}</div>
          <div className="text-xs text-muted-foreground">
            {tg("withPhone")}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">{t("stats.sent")}</div>
          <div className="text-2xl font-bold text-green-600">{sentCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">{t("stats.pending")}</div>
          <div className="text-2xl font-bold text-yellow-600">{notSentCount}</div>
        </div>
      </div>

      {/* Search and Filters */}
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick action: Select all not sent */}
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllNotSent}
            disabled={notSentCount === 0 || !hasInvitationImage}
            className="gap-2"
          >
            <Icons.send className="h-4 w-4" />
            {t("sendToAllNotSent")}
            {notSentCount > 0 && (
              <Badge variant="secondary" className="ms-1">
                {notSentCount}
              </Badge>
            )}
          </Button>

          <div className="flex-1" />

          {/* Filters */}
          <Select
            value={invitationFilter}
            onValueChange={(v) => setInvitationFilter(v as InvitationStatusFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("filters.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="sent">{t("filters.sent")}</SelectItem>
              <SelectItem value="notSent">{t("filters.notSent")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sideFilter} onValueChange={setSideFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={tg("side")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              {PREDEFINED_SIDES.map((side) => (
                <SelectItem key={side} value={side}>
                  {tg(`sides.${side}` as "sides.bride" | "sides.groom" | "sides.both")}
                </SelectItem>
              ))}
              {customSides.map((side) => (
                <SelectItem key={side} value={side}>
                  {side}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={tg("group")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              {PREDEFINED_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>
                  {tg(`groups.${group}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")}
                </SelectItem>
              ))}
              {customGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <Icons.close className="me-1 h-4 w-4" />
              {tc("clearFilters")}
            </Button>
          )}
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
              {tg("selectedCount", { count: selectedIds.size })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={confirmSendBulk}
              disabled={bulkLoading || !hasInvitationImage}
              className="gap-2"
            >
              {bulkLoading ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.send className="h-4 w-4" />
              )}
              {t("sendToSelected")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              {tc("cancel")}
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
              <TableHead>{tg("name")}</TableHead>
              <TableHead>{tg("phone")}</TableHead>
              <TableHead className="text-center">{tg("side")}</TableHead>
              <TableHead className="text-center">{tg("group")}</TableHead>
              <TableHead className="text-center">{tg("status")}</TableHead>
              <TableHead className="text-center">{t("sent")}</TableHead>
              <TableHead className="w-24">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {tc("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => {
                const status = guest.rsvp?.status || "PENDING";
                const isSelected = selectedIds.has(guest.id);

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
                    <TableCell className="text-start">
                      {guest.phoneNumber || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {guest.side ? (
                        <Badge variant="outline" className="text-xs">
                          {PREDEFINED_SIDES.includes(guest.side as typeof PREDEFINED_SIDES[number])
                            ? tg(`sides.${guest.side}` as "sides.bride" | "sides.groom" | "sides.both")
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
                            ? tg(`groups.${guest.groupName}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
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
                      {guest.imageInvitationSent ? (
                        <Badge className="bg-green-500/10 text-green-500" variant="secondary">
                          {t("sent")}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500/10 text-gray-500" variant="secondary">
                          {t("notSent")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="w-24">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmSendSingle(guest)}
                        disabled={
                          loading === guest.id ||
                          !guest.phoneNumber ||
                          !hasInvitationImage
                        }
                        title={
                          !hasInvitationImage
                            ? t("noImageUploaded")
                            : !guest.phoneNumber
                            ? tg("noPhone")
                            : t("sendImageInvitation")
                        }
                      >
                        {loading === guest.id ? (
                          <Icons.spinner className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icons.send className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>

    {/* Expanded Modal */}
    <Dialog open={isTableExpanded} onOpenChange={setIsTableExpanded}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
          <DialogTitle>{t("title")}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsTableExpanded(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">{t("stats.total")}</div>
              <div className="text-2xl font-bold">{guestsWithPhone}</div>
              <div className="text-xs text-muted-foreground">
                {tg("withPhone")}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">{t("stats.sent")}</div>
              <div className="text-2xl font-bold text-green-600">{sentCount}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">{t("stats.pending")}</div>
              <div className="text-2xl font-bold text-yellow-600">{notSentCount}</div>
            </div>
          </div>

          {/* Search and Filters */}
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllNotSent}
                disabled={notSentCount === 0 || !hasInvitationImage}
                className="gap-2"
              >
                <Icons.send className="h-4 w-4" />
                {t("sendToAllNotSent")}
                {notSentCount > 0 && (
                  <Badge variant="secondary" className="ms-1">
                    {notSentCount}
                  </Badge>
                )}
              </Button>

              <div className="flex-1" />

              <Select
                value={invitationFilter}
                onValueChange={(v) => setInvitationFilter(v as InvitationStatusFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("filters.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  <SelectItem value="sent">{t("filters.sent")}</SelectItem>
                  <SelectItem value="notSent">{t("filters.notSent")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sideFilter} onValueChange={setSideFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={tg("side")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {PREDEFINED_SIDES.map((side) => (
                    <SelectItem key={side} value={side}>
                      {tg(`sides.${side}` as "sides.bride" | "sides.groom" | "sides.both")}
                    </SelectItem>
                  ))}
                  {customSides.map((side) => (
                    <SelectItem key={side} value={side}>
                      {side}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={tg("group")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {PREDEFINED_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {tg(`groups.${group}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")}
                    </SelectItem>
                  ))}
                  {customGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <Icons.close className="me-1 h-4 w-4" />
                  {tc("clearFilters")}
                </Button>
              )}
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
                  {tg("selectedCount", { count: selectedIds.size })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={confirmSendBulk}
                  disabled={bulkLoading || !hasInvitationImage}
                  className="gap-2"
                >
                  {bulkLoading ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.send className="h-4 w-4" />
                  )}
                  {t("sendToSelected")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  {tc("cancel")}
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
                  <TableHead>{tg("name")}</TableHead>
                  <TableHead>{tg("phone")}</TableHead>
                  <TableHead className="text-center">{tg("side")}</TableHead>
                  <TableHead className="text-center">{tg("group")}</TableHead>
                  <TableHead className="text-center">{tg("status")}</TableHead>
                  <TableHead className="text-center">{t("sent")}</TableHead>
                  <TableHead className="w-24">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {tc("noResults")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((guest) => {
                    const status = guest.rsvp?.status || "PENDING";
                    const isSelected = selectedIds.has(guest.id);

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
                        <TableCell className="text-start">
                          {guest.phoneNumber || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {guest.side ? (
                            <Badge variant="outline" className="text-xs">
                              {PREDEFINED_SIDES.includes(guest.side as typeof PREDEFINED_SIDES[number])
                                ? tg(`sides.${guest.side}` as "sides.bride" | "sides.groom" | "sides.both")
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
                                ? tg(`groups.${guest.groupName}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
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
                          {guest.imageInvitationSent ? (
                            <Badge className="bg-green-500/10 text-green-500" variant="secondary">
                              {t("sent")}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-500/10 text-gray-500" variant="secondary">
                              {t("notSent")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-24">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmSendSingle(guest)}
                            disabled={
                              loading === guest.id ||
                              !guest.phoneNumber ||
                              !hasInvitationImage
                            }
                            title={
                              !hasInvitationImage
                                ? t("noImageUploaded")
                                : !guest.phoneNumber
                                ? tg("noPhone")
                                : t("sendImageInvitation")
                            }
                          >
                            {loading === guest.id ? (
                              <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icons.send className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
