"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import { X } from "lucide-react";

import { getGuestsForAssignment, assignGuestsToTable, removeGuestFromTable } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";

// Predefined groups that have translations
const PREDEFINED_GROUPS = ["family", "friends", "work", "other"];

interface GuestForAssignment {
  id: string;
  name: string;
  side?: string | null;
  groupName?: string | null;
  expectedGuests: number;
  seatsNeeded: number;
  rsvp?: {
    status: string;
    guestCount: number;
  } | null;
  tableAssignment?: {
    table: {
      id: string;
      name: string;
    };
  } | null;
}

interface AssignGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableName: string;
  availableSeats: number;
  eventId: string;
}

export function AssignGuestsDialog({
  open,
  onOpenChange,
  tableId,
  tableName,
  availableSeats,
  eventId,
}: AssignGuestsDialogProps) {
  const t = useTranslations("seating");
  const tGuests = useTranslations("guests");
  const tStatus = useTranslations("status");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [guests, setGuests] = useState<GuestForAssignment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [seatedFilter, setSeatedFilter] = useState<string>("all");
  const [rsvpFilter, setRsvpFilter] = useState<string>("all");

  // Load guests when dialog opens
  useEffect(() => {
    if (open) {
      loadGuests();
      setSelectedIds(new Set());
      setSearch("");
    }
  }, [open, eventId]);

  async function loadGuests() {
    setIsLoading(true);
    try {
      const result = await getGuestsForAssignment(eventId);
      if (result.success && result.guests) {
        setGuests(result.guests);
      } else {
        toast.error(result.error || "Failed to load guests");
      }
    } catch {
      toast.error("Failed to load guests");
    } finally {
      setIsLoading(false);
    }
  }

  // Guests currently assigned to this table
  const currentTableGuests = useMemo(() => {
    return guests.filter((g) => g.tableAssignment?.table?.id === tableId);
  }, [guests, tableId]);

  async function handleRemoveFromTable(guestId: string) {
    setRemovingGuestId(guestId);
    try {
      const result = await removeGuestFromTable({ guestId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestRemoved"));
        // Update local state
        setGuests((prev) =>
          prev.map((g) => g.id === guestId ? { ...g, tableAssignment: null } : g)
        );
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setRemovingGuestId(null);
    }
  }

  // Get unique sides and groups for filters
  const { sides, groups } = useMemo(() => {
    const sideSet = new Set<string>();
    const groupSet = new Set<string>();
    guests.forEach((g) => {
      if (g.side) sideSet.add(g.side);
      if (g.groupName) groupSet.add(g.groupName);
    });
    return {
      sides: Array.from(sideSet).sort(),
      groups: Array.from(groupSet).sort(),
    };
  }, [guests]);

  // Filter guests (excluding those already at this table - they're managed above)
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Exclude guests at this table (managed in section above)
      if (g.tableAssignment?.table?.id === tableId) {
        return false;
      }
      // Search filter
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Side filter
      if (sideFilter !== "all" && g.side !== sideFilter) {
        return false;
      }
      // Group filter
      if (groupFilter !== "all" && g.groupName !== groupFilter) {
        return false;
      }
      // Seated filter
      if (seatedFilter === "seated" && !g.tableAssignment) {
        return false;
      }
      if (seatedFilter === "unseated" && g.tableAssignment) {
        return false;
      }
      // RSVP filter
      if (rsvpFilter !== "all") {
        const status = g.rsvp?.status || "PENDING";
        if (status !== rsvpFilter) {
          return false;
        }
      }
      return true;
    });
  }, [guests, search, sideFilter, groupFilter, seatedFilter, rsvpFilter, tableId]);

  // Calculate selected seats
  const selectedSeats = useMemo(() => {
    return Array.from(selectedIds).reduce((sum, id) => {
      const guest = guests.find((g) => g.id === id);
      return sum + (guest?.seatsNeeded || 0);
    }, 0);
  }, [selectedIds, guests]);

  function toggleGuest(guestId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  }

  function selectAll() {
    const allIds = new Set(filteredGuests.map((g) => g.id));
    setSelectedIds(allIds);
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleAssign() {
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    try {
      const result = await assignGuestsToTable({
        tableId,
        guestIds: Array.from(selectedIds),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestsAssigned"));
        if (result.capacityWarning) {
          toast.warning(t("capacityWarning"));
        }
        onOpenChange(false);

        // Dispatch optimistic update event with guest assignment data
        window.dispatchEvent(new CustomEvent("seating-data-changed", {
          detail: {
            type: "guests-assigned",
            tableId,
            guestIds: Array.from(selectedIds),
          },
        }));
      }
    } catch {
      toast.error("Failed to assign guests");
    } finally {
      setIsSaving(false);
    }
  }

  function getRsvpBadgeVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "ACCEPTED":
        return "default";
      case "DECLINED":
        return "destructive";
      default:
        return "secondary";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("assignDialog.title", { tableName })}</DialogTitle>
          <DialogDescription>
            {t("assignDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-0 flex-1">
          {/* Stats Bar */}
          <div className="flex items-center gap-4 py-2 px-3 bg-muted rounded-lg text-sm shrink-0">
            <span>
              {t("assignDialog.availableSeats", { count: availableSeats })}
            </span>
            <span className="text-muted-foreground">|</span>
            <span className={cn(selectedSeats > availableSeats && "text-destructive font-medium")}>
              {t("assignDialog.selectedSeats", { count: selectedSeats })}
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              {t("assignDialog.selectedGuests", { count: selectedIds.size })}
            </span>
          </div>

          {/* Current Table Guests */}
          {currentTableGuests.length > 0 && (
            <div className="shrink-0 border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                <span className="text-sm font-medium">
                  {t("modal.guestsAtTable")} ({currentTableGuests.length})
                </span>
              </div>
              <div className="max-h-[150px] overflow-y-auto">
                <div className="divide-y">
                  {currentTableGuests.map((guest) => {
                    const isRemoving = removingGuestId === guest.id;
                    return (
                      <div
                        key={guest.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{guest.name}</span>
                            {guest.seatsNeeded > 1 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t("partySize", { count: guest.seatsNeeded })}
                              </Badge>
                            )}
                            <Badge variant={getRsvpBadgeVariant(guest.rsvp?.status)} className="text-[10px]">
                              {tStatus(guest.rsvp?.status?.toLowerCase() || "pending")}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                          disabled={isRemoving}
                          onClick={() => handleRemoveFromTable(guest.id)}
                        >
                          {isRemoving ? (
                            <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t("assignDialog.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <Select dir={isRTL ? "rtl" : undefined} value={seatedFilter} onValueChange={setSeatedFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                <SelectItem value="seated">{t("filters.seated")}</SelectItem>
                <SelectItem value="unseated">{t("filters.unseated")}</SelectItem>
              </SelectContent>
            </Select>
            {sides.length > 0 && (
              <Select dir={isRTL ? "rtl" : undefined} value={sideFilter} onValueChange={setSideFilter}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder={t("filters.side")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  {sides.map((side) => (
                    <SelectItem key={side} value={side}>
                      {tGuests(`sides.${side.toLowerCase()}`) || side}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {groups.length > 0 && (
              <Select dir={isRTL ? "rtl" : undefined} value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder={t("filters.group")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {PREDEFINED_GROUPS.includes(group.toLowerCase())
                        ? tGuests(`groups.${group.toLowerCase()}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
                        : group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select dir={isRTL ? "rtl" : undefined} value={rsvpFilter} onValueChange={setRsvpFilter}>
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue placeholder={t("filters.rsvpStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                <SelectItem value="ACCEPTED">{tStatus("accepted")}</SelectItem>
                <SelectItem value="PENDING">{tStatus("pending")}</SelectItem>
                <SelectItem value="DECLINED">{tStatus("declined")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select/Deselect All */}
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {t("assignDialog.selectAll")} ({filteredGuests.length})
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              {t("assignDialog.deselectAll")}
            </Button>
          </div>

          {/* Guest List - Fixed height for ~10 items, scrollable */}
          <ScrollArea dir={isRTL ? "rtl" : undefined} className="h-[350px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                {t("assignDialog.noResults")}
              </div>
            ) : (
              <div className="divide-y">
                {filteredGuests.map((guest) => (
                  <label
                    key={guest.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedIds.has(guest.id) && "bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(guest.id)}
                      onCheckedChange={() => toggleGuest(guest.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{guest.name}</span>
                        {guest.seatsNeeded > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {t("partySize", { count: guest.seatsNeeded })}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {guest.side && (
                          <span>{tGuests(`sides.${guest.side.toLowerCase()}`) || guest.side}</span>
                        )}
                        {guest.side && guest.groupName && <span>•</span>}
                        {guest.groupName && (
                          <span>
                            {PREDEFINED_GROUPS.includes(guest.groupName.toLowerCase())
                              ? tGuests(`groups.${guest.groupName.toLowerCase()}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
                              : guest.groupName}
                          </span>
                        )}
                        {guest.tableAssignment && (
                          <>
                            <span>•</span>
                            <span className="text-primary">
                              {guest.tableAssignment.table.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant={getRsvpBadgeVariant(guest.rsvp?.status)}>
                      {tStatus(guest.rsvp?.status?.toLowerCase() || "pending")}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:border-0 sm:pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedIds.size === 0 || isSaving}
          >
            {isSaving && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
            {t("assignDialog.assign")} ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
