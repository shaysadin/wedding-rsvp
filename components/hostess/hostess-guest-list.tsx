"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, UserCheck, ArrowRight, ArrowLeft, Users, ChevronDown } from "lucide-react";
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

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let result = guests;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (guest) =>
          guest.name.toLowerCase().includes(query) ||
          (guest.tableName && guest.tableName.toLowerCase().includes(query))
      );
    }

    // Table filter
    if (filterTable !== "all") {
      result = result.filter((guest) => guest.tableId === filterTable);
    }

    // Status filter
    if (filterStatus === "arrived") {
      result = result.filter((guest) => guest.isArrived);
    } else if (filterStatus === "not-arrived") {
      result = result.filter((guest) => !guest.isArrived);
    }

    // Side filter
    if (filterSide !== "all") {
      result = result.filter((guest) => guest.side === filterSide);
    }

    // Group filter
    if (filterGroup !== "all") {
      result = result.filter((guest) => guest.groupName === filterGroup);
    }

    // Sort by table name, then by name
    return [...result].sort((a, b) => {
      if (!a.tableName && !b.tableName) return a.name.localeCompare(b.name, locale);
      if (!a.tableName) return 1;
      if (!b.tableName) return -1;
      const tableCompare = a.tableName.localeCompare(b.tableName, locale, { numeric: true });
      if (tableCompare !== 0) return tableCompare;
      return a.name.localeCompare(b.name, locale);
    });
  }, [guests, searchQuery, filterTable, filterStatus, filterSide, filterGroup, locale]);

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredGuests.map((guest) => {
              const isLoading = loadingGuests.has(guest.id);

              return (
                <motion.div
                  key={guest.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      guest.isArrived
                        ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{guest.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {/* Guest Count */}
                            <Badge variant="outline" className="text-xs gap-1">
                              <Users className="h-3 w-3" />
                              {guest.guestCount}
                            </Badge>
                            {/* Side */}
                            {guest.side && (
                              <Badge variant="secondary" className="text-xs">
                                {getSideLabel(guest.side)}
                              </Badge>
                            )}
                            {/* Group */}
                            {guest.groupName && (
                              <Badge variant="secondary" className="text-xs">
                                {getGroupLabel(guest.groupName)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {guest.isArrived && (
                          <div className="shrink-0 p-1.5 rounded-full bg-green-600">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Table Info */}
                      <div className="mb-4">
                        {guest.tableName ? (
                          <Badge className="bg-zinc-800 hover:bg-zinc-800 text-white">
                            {guest.tableName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t.noTable}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {guest.isArrived ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmarkArrived(guest.id)}
                            disabled={isLoading}
                            className="flex-1 min-h-[44px] border-green-600 text-green-600 hover:bg-green-50 rounded-xl"
                          >
                            <Check className="h-4 w-4 me-2" />
                            {t.arrived}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleMarkArrived(guest.id)}
                            disabled={isLoading}
                            className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 rounded-xl"
                          >
                            <UserCheck className="h-4 w-4 me-2" />
                            {t.markArrived}
                          </Button>
                        )}

                        <Select
                          dir={isRTL ? "rtl" : "ltr"}
                          onValueChange={(value) => handleChangeTable(guest.id, value)}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-[100px] min-h-[44px] rounded-xl">
                            {isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                          </SelectTrigger>
                          <SelectContent>
                            {tables.map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                {table.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
