"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, Maximize2, X, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { markGuestArrived, unmarkGuestArrived, updateGuestTableForHostess } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";

interface TableGuest {
  id: string;
  name: string;
  guestCount: number;
  side?: string | null;
  groupName?: string | null;
  arrivedAt: Date | string | null;
  isArrived: boolean;
}

interface TableWithDetails {
  id: string;
  name: string;
  capacity: number;
  seatsUsed: number;
  seatsAvailable: number;
  guestCount: number;
  arrivedCount: number;
  arrivedPeopleCount?: number;
  guests: TableGuest[];
  isFull: boolean;
}

interface HostessTableViewProps {
  tables: TableWithDetails[];
  locale: string;
}

// Table shape visualization component
function TableShape({ capacity, arrivedCount, totalGuests }: { capacity: number; arrivedCount: number; totalGuests: number }) {
  // Generate seat positions around the table
  const generateSeatPositions = (count: number) => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * (360 / Math.max(count, 1))) - 90;
      const rad = (angle * Math.PI) / 180;
      positions.push({
        x: 50 + 40 * Math.cos(rad),
        y: 50 + 40 * Math.sin(rad),
      });
    }
    return positions;
  };

  const seatPositions = generateSeatPositions(Math.min(capacity, 12));

  return (
    <div className="relative w-36 h-36 mx-auto">
      {/* Table */}
      <div className="absolute inset-[25%] rounded-full bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 shadow-inner" />
      {/* Seats */}
      {seatPositions.map((pos, i) => {
        const isArrived = i < arrivedCount;
        const isExpected = i < totalGuests;
        return (
          <div
            key={i}
            className={cn(
              "absolute w-4 h-4 rounded-full border-2 transition-colors -translate-x-1/2 -translate-y-1/2",
              isArrived
                ? "bg-green-500 border-green-600"
                : isExpected
                  ? "bg-zinc-400 dark:bg-zinc-500 border-zinc-500 dark:border-zinc-400"
                  : "bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600"
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        );
      })}
    </div>
  );
}

export function HostessTableView({ tables, locale }: HostessTableViewProps) {
  const isRTL = locale === "he";
  const dir = isRTL ? "rtl" : "ltr";
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const [loadingGuests, setLoadingGuests] = useState<Set<string>>(new Set());

  // Translations
  const t = {
    guests: isRTL ? "אורחים" : "guests",
    arrived: isRTL ? "הגיעו" : "arrived",
    spotsLeft: (count: number) =>
      isRTL ? `${count} מקומות פנויים` : `${count} spots left`,
    full: isRTL ? "מלא" : "Full",
    allArrived: isRTL ? "כולם הגיעו" : "All arrived",
    markArrived: isRTL ? "הגיע" : "Mark arrived",
    notArrived: isRTL ? "לא הגיע" : "Not arrived",
    noTables: isRTL ? "אין שולחנות" : "No tables",
    moveToTable: isRTL ? "העבר" : "Move",
    people: isRTL ? "אנשים" : "people",
    noGuests: isRTL ? "אין אורחים בשולחן" : "No guests at this table",
    guestsAtTable: isRTL ? "אורחים בשולחן" : "Guests at this table",
    seatsArrived: isRTL ? "הגיעו" : "arrived",
  };

  const toggleExpand = (tableId: string) => {
    setExpandedTableId((prev) => (prev === tableId ? null : tableId));
  };

  const handleToggleArrival = async (guestId: string, isCurrentlyArrived: boolean) => {
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      if (isCurrentlyArrived) {
        const result = await unmarkGuestArrived(guestId);
        if (result.error) {
          toast.error(result.error);
        } else {
          window.dispatchEvent(new CustomEvent("hostess-data-changed"));
        }
      } else {
        const result = await markGuestArrived({ guestId });
        if (result.error) {
          toast.error(result.error);
        } else {
          window.dispatchEvent(new CustomEvent("hostess-data-changed"));
        }
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

  const handleMoveGuest = async (guestId: string, newTableId: string) => {
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      const result = await updateGuestTableForHostess({ guestId, tableId: newTableId });
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

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t.noTables}</h3>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" dir={dir}>
      {tables.map((table) => {
        const isExpanded = expandedTableId === table.id;
        const arrivalProgress = table.guestCount > 0
          ? (table.arrivedCount / table.guestCount) * 100
          : 0;

        const arrivedPeople = table.arrivedPeopleCount || 0;
        const isCompleted = table.arrivedCount === table.guestCount && table.guestCount > 0;
        const otherTables = tables.filter((t) => t.id !== table.id);

        return (
          <div key={table.id}>
            {/* Collapsed Card */}
            <Card className="h-full transition-all duration-200 hover:shadow-md border-border/60" dir={dir}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm truncate flex-1 text-start">{table.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(table.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{table.guestCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className={cn("h-3.5 w-3.5", table.arrivedCount > 0 ? "text-green-600" : "text-muted-foreground")} />
                    <span className={cn("font-medium", table.arrivedCount > 0 ? "text-green-600" : "text-muted-foreground")}>
                      {table.arrivedCount}/{table.guestCount}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      isCompleted ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${arrivalProgress}%` }}
                  />
                </div>

                {/* Guest List */}
                {table.guests.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                    {t.noGuests}
                  </div>
                ) : (
                  <ScrollArea className="h-[100px]" dir={dir}>
                    <div className="space-y-1 ps-0 pe-2">
                      {table.guests.map((guest) => (
                        <div
                          key={guest.id}
                          className={cn(
                            "flex items-center justify-between gap-2 py-1.5 px-2 rounded text-xs transition-colors",
                            guest.isArrived
                              ? "bg-green-100/60 dark:bg-green-900/20"
                              : "bg-muted/40 hover:bg-muted/60"
                          )}
                        >
                          <span className="truncate font-medium text-start">{guest.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-muted-foreground">{guest.guestCount}</span>
                            {guest.isArrived && (
                              <Check className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Expanded Modal */}
            <AnimatePresence>
              {isExpanded && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    key={`backdrop-${table.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    onClick={() => toggleExpand(table.id)}
                  />

                  {/* Modal */}
                  <motion.div
                    key={`modal-${table.id}`}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-20 z-50"
                    dir={dir}
                  >
                    <Card className="h-full overflow-hidden bg-background">
                      <CardContent className="p-0 h-full flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                          <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold">{table.name}</h2>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Check className={cn("h-4 w-4", table.arrivedCount > 0 && "text-green-600")} />
                              <span className={cn("font-semibold", table.arrivedCount > 0 && "text-green-600")}>
                                {table.arrivedCount}/{table.guestCount} {t.seatsArrived}
                              </span>
                            </div>
                            {isCompleted && (
                              <Badge className="bg-green-600 hover:bg-green-600 text-xs">
                                {t.allArrived}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(table.id)}
                            className="h-9 w-9 p-0"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                          {/* Left side - Table visualization */}
                          <div className="lg:w-1/3 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-e bg-muted/20">
                            <TableShape
                              capacity={table.capacity}
                              arrivedCount={table.arrivedCount}
                              totalGuests={table.guestCount}
                            />
                            <div className="mt-4 text-center">
                              <p className="text-sm font-medium">{table.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {arrivedPeople} {t.people} {t.arrived}
                              </p>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600" />
                                <span>{isRTL ? "הגיע" : "Arrived"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-zinc-400 dark:bg-zinc-500 border border-zinc-500" />
                                <span>{isRTL ? "ממתין" : "Expected"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600" />
                                <span>{isRTL ? "פנוי" : "Empty"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right/End side - Guest list */}
                          <div className="flex-1 p-6 overflow-hidden flex flex-col">
                            <h3 className="text-sm font-semibold mb-4 text-start">
                              {t.guestsAtTable}
                              {table.guests.length > 0 && (
                                <span className="text-muted-foreground font-normal ms-2">
                                  ({table.guests.length})
                                </span>
                              )}
                            </h3>

                            {table.guests.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                  <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                                  <p className="text-sm text-muted-foreground">{t.noGuests}</p>
                                </div>
                              </div>
                            ) : (
                              <ScrollArea className="flex-1" dir={dir}>
                                <div className="space-y-2 ps-0 pe-4">
                                  {table.guests.map((guest) => {
                                    const isLoading = loadingGuests.has(guest.id);

                                    return (
                                      <div
                                        key={guest.id}
                                        className={cn(
                                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                          guest.isArrived
                                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                            : "bg-card hover:bg-muted/30"
                                        )}
                                      >
                                        {/* Guest info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm truncate text-start">
                                              {guest.name}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] shrink-0">
                                              {guest.guestCount} {t.people}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Move guest dropdown */}
                                        {otherTables.length > 0 && (
                                          <Select
                                            dir={dir}
                                            onValueChange={(value) => handleMoveGuest(guest.id, value)}
                                            disabled={isLoading}
                                          >
                                            <SelectTrigger className="w-[100px] h-9 text-xs">
                                              {isLoading ? (
                                                <Icons.spinner className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <>
                                                  {isRTL ? (
                                                    <ArrowLeft className="h-3 w-3 me-1" />
                                                  ) : (
                                                    <ArrowRight className="h-3 w-3 me-1" />
                                                  )}
                                                  <span>{t.moveToTable}</span>
                                                </>
                                              )}
                                            </SelectTrigger>
                                            <SelectContent>
                                              {otherTables.map((t) => (
                                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                                  {t.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}

                                        {/* Arrival toggle button */}
                                        <Button
                                          variant={guest.isArrived ? "outline" : "default"}
                                          size="sm"
                                          onClick={() => handleToggleArrival(guest.id, guest.isArrived)}
                                          disabled={isLoading}
                                          className={cn(
                                            "min-w-[100px] h-9 text-xs",
                                            guest.isArrived
                                              ? "border-green-600 text-green-600 hover:bg-green-50"
                                              : "bg-green-600 hover:bg-green-700"
                                          )}
                                        >
                                          {isLoading ? (
                                            <Icons.spinner className="h-3 w-3 animate-spin" />
                                          ) : guest.isArrived ? (
                                            <>
                                              <Check className="h-3 w-3 me-1" />
                                              {t.arrived}
                                            </>
                                          ) : (
                                            t.markArrived
                                          )}
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
