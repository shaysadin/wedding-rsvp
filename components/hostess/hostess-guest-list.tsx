"use client";

import { useState, useMemo, memo } from "react";
import { Search, Check, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { markGuestArrived, unmarkGuestArrived, updateGuestTableForHostess } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GuestWithDetails {
  id: string;
  name: string;
  guestCount: number;
  side?: string | null;
  groupName?: string | null;
  tableId: string | null;
  tableName: string | null;
  arrivedAt: Date | string | null;
  arrivedTableId: string | null;
  isArrived: boolean;
}

interface TableInfo {
  id: string;
  name: string;
  capacity: number;
  seatsUsed: number;
  seatsAvailable: number;
}

interface HostessGuestListProps {
  guests: GuestWithDetails[];
  tables: TableInfo[];
  locale: string;
}

type SortField = "name" | "tableName" | "status";
type FilterStatus = "all" | "arrived" | "not-arrived";

export function HostessGuestList({ guests, tables, locale }: HostessGuestListProps) {
  const isRTL = locale === "he";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSide, setFilterSide] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [loadingGuests, setLoadingGuests] = useState<Set<string>>(new Set());

  // Translations
  const t = {
    searchPlaceholder: isRTL ? "חפש אורח..." : "Search guest...",
    noTable: isRTL ? "לא משובץ" : "Not assigned",
    noResults: isRTL ? "לא נמצאו תוצאות" : "No results found",
    markArrived: isRTL ? "הגיע" : "Arrived",
    arrived: isRTL ? "הגיע" : "Here",
    allTables: isRTL ? "כל השולחנות" : "All Tables",
    allStatuses: isRTL ? "כל הסטטוסים" : "All Statuses",
    arrivedStatus: isRTL ? "הגיעו" : "Arrived",
    notArrivedStatus: isRTL ? "לא הגיעו" : "Not Arrived",
    changeTable: isRTL ? "העבר" : "Move",
    people: isRTL ? "אנשים" : "people",
    allSides: isRTL ? "כל הצדדים" : "All Sides",
    allGroups: isRTL ? "כל הקבוצות" : "All Groups",
  };

  // Translation helpers for side/group
  const getSideLabel = (side: string | null | undefined) => {
    if (!side) return null;
    const sideLabels: Record<string, string> = isRTL
      ? { bride: "כלה", groom: "חתן", both: "שניהם" }
      : { bride: "Bride", groom: "Groom", both: "Both" };
    return sideLabels[side.toLowerCase()] || side;
  };

  const getGroupLabel = (group: string | null | undefined) => {
    if (!group) return null;
    const groupLabels: Record<string, string> = isRTL
      ? { family: "משפחה", friends: "חברים", work: "עבודה", other: "אחר" }
      : { family: "Family", friends: "Friends", work: "Work", other: "Other" };
    return groupLabels[group.toLowerCase()] || group;
  };

  // Get unique sides and groups for filters
  const { uniqueSides, uniqueGroups } = useMemo(() => {
    const sides = new Set<string>();
    const groups = new Set<string>();
    guests.forEach((g) => {
      if (g.side) sides.add(g.side);
      if (g.groupName) groups.add(g.groupName);
    });
    return {
      uniqueSides: Array.from(sides),
      uniqueGroups: Array.from(groups),
    };
  }, [guests]);

  // Filter and sort guests - optimized for performance
  const filteredGuests = useMemo(() => {
    // Apply all filters in one pass
    const filtered = guests.filter((guest) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          guest.name.toLowerCase().includes(query) ||
          (guest.tableName && guest.tableName.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Table filter
      if (filterTable !== "all" && guest.tableId !== filterTable) {
        return false;
      }

      // Status filter
      if (filterStatus === "arrived" && !guest.isArrived) {
        return false;
      } else if (filterStatus === "not-arrived" && guest.isArrived) {
        return false;
      }

      // Side filter
      if (filterSide !== "all" && guest.side !== filterSide) {
        return false;
      }

      // Group filter
      if (filterGroup !== "all" && guest.groupName !== filterGroup) {
        return false;
      }

      return true;
    });

    // Sort only if needed
    if (filtered.length === 0) return filtered;

    // Simple sort by table name, then by name
    return filtered.sort((a, b) => {
      if (!a.tableName && !b.tableName) return a.name < b.name ? -1 : 1;
      if (!a.tableName) return 1;
      if (!b.tableName) return -1;
      if (a.tableName !== b.tableName) {
        return a.tableName < b.tableName ? -1 : 1;
      }
      return a.name < b.name ? -1 : 1;
    });
  }, [guests, searchQuery, filterTable, filterStatus, filterSide, filterGroup]);

  const handleMarkArrived = async (guestId: string) => {
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      const result = await markGuestArrived({ guestId });
      if (result.error) {
        toast.error(result.error);
      } else {
        window.dispatchEvent(new CustomEvent("hostess-data-changed"));
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון" : "Failed to update");
    } finally {
      setLoadingGuests((prev) => {
        const next = new Set(prev);
        next.delete(guestId);
        return next;
      });
    }
  };

  const handleUnmarkArrived = async (guestId: string) => {
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      const result = await unmarkGuestArrived(guestId);
      if (result.error) {
        toast.error(result.error);
      } else {
        window.dispatchEvent(new CustomEvent("hostess-data-changed"));
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון" : "Failed to update");
    } finally {
      setLoadingGuests((prev) => {
        const next = new Set(prev);
        next.delete(guestId);
        return next;
      });
    }
  };

  const handleChangeTable = async (guestId: string, tableId: string) => {
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      const result = await updateGuestTableForHostess({ guestId, tableId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? `הועבר לשולחן ${result.tableName}` : `Moved to ${result.tableName}`);
        window.dispatchEvent(new CustomEvent("hostess-data-changed"));
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון" : "Failed to update");
    } finally {
      setLoadingGuests((prev) => {
        const next = new Set(prev);
        next.delete(guestId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("min-h-[48px] text-base rounded-xl border-2 focus:border-primary", isRTL ? "pr-10" : "pl-10")}
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-2" dir={isRTL ? "rtl" : "ltr"}>
          <Select dir={isRTL ? "rtl" : "ltr"} value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[130px] min-h-[44px] rounded-xl">
              <SelectValue placeholder={t.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="arrived">{t.arrivedStatus}</SelectItem>
              <SelectItem value="not-arrived">{t.notArrivedStatus}</SelectItem>
            </SelectContent>
          </Select>

          <Select dir={isRTL ? "rtl" : "ltr"} value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-[140px] min-h-[44px] rounded-xl">
              <SelectValue placeholder={t.allTables} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTables}</SelectItem>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {uniqueSides.length > 0 && (
            <Select dir={isRTL ? "rtl" : "ltr"} value={filterSide} onValueChange={setFilterSide}>
              <SelectTrigger className="w-[120px] min-h-[44px] rounded-xl">
                <SelectValue placeholder={t.allSides} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allSides}</SelectItem>
                {uniqueSides.map((side) => (
                  <SelectItem key={side} value={side}>
                    {getSideLabel(side)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {uniqueGroups.length > 0 && (
            <Select dir={isRTL ? "rtl" : "ltr"} value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-[120px] min-h-[44px] rounded-xl">
                <SelectValue placeholder={t.allGroups} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allGroups}</SelectItem>
                {uniqueGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {getGroupLabel(group)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {isRTL ? `${filteredGuests.length} אורחים` : `${filteredGuests.length} guests`}
      </div>

      {/* Guest Cards */}
      {filteredGuests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredGuests.map((guest) => {
            const isLoading = loadingGuests.has(guest.id);

            return (
              <div
                key={guest.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  guest.isArrived
                    ? "border-green-500 bg-green-50/80 dark:bg-green-950/30"
                    : "border-zinc-200 dark:border-zinc-800 bg-card"
                )}
              >
                    {/* Guest info - single row */}
                    <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-base truncate">{guest.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0 gap-1 px-2 py-0.5">
                        <Users className="h-3 w-3" />
                        {guest.guestCount} {t.people}
                      </Badge>
                      {guest.side && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {getSideLabel(guest.side)}
                        </Badge>
                      )}
                      {guest.groupName && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {getGroupLabel(guest.groupName)}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Select
                        dir={isRTL ? "rtl" : "ltr"}
                        value={guest.tableId || undefined}
                        onValueChange={(value) => handleChangeTable(guest.id, value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[130px] min-h-[48px] rounded-xl text-sm">
                          <SelectValue placeholder={t.noTable} />
                        </SelectTrigger>
                        <SelectContent>
                          {tables.map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              {table.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {guest.isArrived ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnmarkArrived(guest.id)}
                          disabled={isLoading}
                          className="min-h-[48px] min-w-[100px] border-green-600 text-green-600 hover:bg-green-50 rounded-xl text-sm font-medium"
                        >
                          <Check className="h-4 w-4 me-1.5" />
                          {t.arrived}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkArrived(guest.id)}
                          disabled={isLoading}
                          className="min-h-[48px] min-w-[100px] bg-green-600 hover:bg-green-700 rounded-xl text-sm font-medium"
                        >
                          <UserCheck className="h-4 w-4 me-1.5" />
                          {t.markArrived}
                        </Button>
                      )}
                    </div>
                  </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const HostessGuestListMemo = memo(HostessGuestList);
