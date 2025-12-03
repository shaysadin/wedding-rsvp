"use client";

import { useState, useMemo } from "react";
import { Guest, GuestRsvp, NotificationLog, RsvpStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteGuest, deleteGuests } from "@/actions/guests";
import { sendInvite, sendReminder } from "@/actions/notifications";
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

type GuestWithRsvp = Guest & {
  rsvp: GuestRsvp | null;
  notificationLogs: NotificationLog[];
};

interface GuestsTableProps {
  guests: GuestWithRsvp[];
  eventId: string;
}

const statusColors: Record<RsvpStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500",
  ACCEPTED: "bg-green-500/10 text-green-500",
  DECLINED: "bg-red-500/10 text-red-500",
};

export function GuestsTable({ guests, eventId }: GuestsTableProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const isRTL = locale === "he";
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRsvp | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter guests based on search query
  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return guests;
    const query = searchQuery.toLowerCase();
    return guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(query) ||
        guest.phoneNumber?.toLowerCase().includes(query) ||
        guest.groupName?.toLowerCase().includes(query)
    );
  }, [guests, searchQuery]);

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

  const handleBulkSendInvites = async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const guestId of selectedIds) {
      const result = await sendInvite(guestId);
      if (result.error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setBulkLoading(false);

    if (successCount > 0) {
      toast.success(t("bulkSendSuccess", { count: successCount }));
    }
    if (errorCount > 0) {
      toast.error(t("bulkSendErrors", { count: errorCount }));
    }
    setSelectedIds(new Set());
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

      {/* Search Input */}
      <div className="relative">
        <Icons.search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={tc("search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {t("selectedCount", { count: selectedIds.size })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
              variant="outline"
              size="sm"
              onClick={handleBulkSendInvites}
              disabled={bulkLoading}
            >
              {bulkLoading ? (
                <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.send className="me-2 h-4 w-4" />
              )}
              {t("sendInvites")}
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
              <TableHead>{t("group")}</TableHead>
              <TableHead className="text-center">{t("status")}</TableHead>
              <TableHead className="text-center">{t("guestCount")}</TableHead>
              <TableHead className="w-16">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
                      <p className="font-medium">{guest.name}</p>
                    </TableCell>
                    <TableCell className="text-start">{guest.phoneNumber || "-"}</TableCell>
                    <TableCell>
                      {guest.groupName ? (
                        <Badge variant="outline">
                          {t(`groups.${guest.groupName}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[status]} variant="secondary">
                        {tStatus(status.toLowerCase() as "pending" | "accepted" | "declined")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {status === "ACCEPTED" ? guest.rsvp?.guestCount || 1 : "-"}
                    </TableCell>
                    <TableCell className="w-16">
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

                          <DropdownMenuItem onClick={() => handleSendInvite(guest.id)}>
                            <Icons.send className="me-2 h-4 w-4" />
                            {t("sendInvite")}
                          </DropdownMenuItem>

                          {status === "PENDING" && (
                            <DropdownMenuItem onClick={() => handleSendReminder(guest.id)}>
                              <Icons.bell className="me-2 h-4 w-4" />
                              {t("sendReminder")}
                            </DropdownMenuItem>
                          )}

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
