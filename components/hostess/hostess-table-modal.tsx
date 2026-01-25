"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, X, ArrowRight, ArrowLeft, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";

import { markGuestArrived, unmarkGuestArrived, updateGuestTableForHostess, removeGuestFromTableForHostess } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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

interface HostessTableModalProps {
  table: TableWithDetails | null;
  tables: TableWithDetails[];
  allGuests: GuestWithDetails[];
  locale: string;
  open: boolean;
  onClose: () => void;
}

// Chair SVG Component for hostess view - bigger and simpler
function ChairIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chair seat */}
      <rect x="5" y="9" width="14" height="4" rx="1.5" fill={color} />
      {/* Chair back */}
      <rect x="6" y="3" width="12" height="6" rx="1.5" fill={color} />
      {/* Chair legs */}
      <rect x="6" y="13" width="3" height="8" rx="1" fill={color} />
      <rect x="15" y="13" width="3" height="8" rx="1" fill={color} />
    </svg>
  );
}

// Table shape visualization component
function TableShape({ capacity, arrivedCount, totalGuests }: { capacity: number; arrivedCount: number; totalGuests: number }) {
  const generateSeatPositions = (count: number) => {
    const positions: { x: number; y: number; angle: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * (360 / Math.max(count, 1))) - 90;
      const rad = (angle * Math.PI) / 180;
      positions.push({
        x: 50 + 38 * Math.cos(rad),
        y: 50 + 38 * Math.sin(rad),
        angle: angle + 90, // Rotate chair to face table
      });
    }
    return positions;
  };

  const seatPositions = generateSeatPositions(Math.min(capacity, 12));

  // Chair colors
  const getChairColor = (index: number) => {
    const isArrived = index < arrivedCount;
    const isExpected = index < totalGuests;
    if (isArrived) return "#22c55e"; // green-500
    if (isExpected) return "#71717a"; // zinc-500
    return "#d4d4d8"; // zinc-300
  };

  return (
    <div className="relative w-40 h-40 mx-auto">
      {/* Table */}
      <div className="absolute inset-[28%] rounded-full bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 shadow-inner" />
      {/* Chairs - bigger and using chair icon */}
      {seatPositions.map((pos, i) => (
        <div
          key={i}
          className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 transition-colors"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) rotate(${pos.angle}deg)`,
          }}
        >
          <ChairIcon color={getChairColor(i)} className="w-full h-full" />
        </div>
      ))}
    </div>
  );
}

export function HostessTableModal({ table, tables, allGuests, locale, open, onClose }: HostessTableModalProps) {
  const isRTL = locale === "he";
  const dir = isRTL ? "rtl" : "ltr";
  const [loadingGuests, setLoadingGuests] = useState<Set<string>>(new Set());
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [guestToRemove, setGuestToRemove] = useState<{ id: string; name: string } | null>(null);

  const t = {
    arrived: isRTL ? "הגיעו" : "arrived",
    allArrived: isRTL ? "כולם הגיעו" : "All arrived",
    markArrived: isRTL ? "הגיע" : "Mark arrived",
    moveToTable: isRTL ? "העבר" : "Move",
    people: isRTL ? "אנשים" : "people",
    noGuests: isRTL ? "אין אורחים בשולחן" : "No guests at this table",
    guestsAtTable: isRTL ? "אורחים בשולחן" : "Guests at this table",
    seatsArrived: isRTL ? "הגיעו" : "arrived",
    addGuest: isRTL ? "הוסף אורח" : "Add Guest",
    searchGuests: isRTL ? "חפש אורחים..." : "Search guests...",
    add: isRTL ? "הוסף" : "Add",
    remove: isRTL ? "הסר" : "Remove",
    noUnassigned: isRTL ? "אין אורחים זמינים" : "No available guests",
    swapWith: isRTL ? "החלף עם" : "Swap with",
    tableFull: isRTL ? "השולחן מלא - החלף אורח" : "Table full - swap guest",
    manageGuests: isRTL ? "נהל אורחים" : "Manage Guests",
    confirmRemoveTitle: isRTL ? "הסרת אורח" : "Remove Guest",
    confirmRemoveDesc: isRTL ? "האם אתה בטוח שברצונך להסיר את" : "Are you sure you want to remove",
    confirmRemoveDescEnd: isRTL ? "מהשולחן?" : "from this table?",
    cancel: isRTL ? "ביטול" : "Cancel",
    confirm: isRTL ? "הסר" : "Remove",
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

  const handleRemoveGuest = async (guestId: string) => {
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      const result = await removeGuestFromTableForHostess(guestId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האורח הוסר מהשולחן" : "Guest removed from table");
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

  const handleAddGuest = async (guestId: string) => {
    if (!table) return;
    setLoadingGuests((prev) => new Set(prev).add(guestId));
    try {
      const result = await updateGuestTableForHostess({ guestId, tableId: table.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האורח הוסף לשולחן" : "Guest added to table");
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

  const handleSwapGuest = async (newGuestId: string, existingGuestId: string) => {
    if (!table) return;
    setLoadingGuests((prev) => new Set(prev).add(newGuestId));
    try {
      // Remove existing guest first
      const removeResult = await removeGuestFromTableForHostess(existingGuestId);
      if (removeResult.error) {
        toast.error(removeResult.error);
        return;
      }
      // Then add new guest
      const addResult = await updateGuestTableForHostess({ guestId: newGuestId, tableId: table.id });
      if (addResult.error) {
        toast.error(addResult.error);
      } else {
        toast.success(isRTL ? "האורחים הוחלפו" : "Guests swapped");
        window.dispatchEvent(new CustomEvent("hostess-data-changed"));
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון" : "Failed to update");
    } finally {
      setLoadingGuests((prev) => {
        const next = new Set(prev);
        next.delete(newGuestId);
        return next;
      });
    }
  };

  // Show ALL guests except those at this table (they're managed above)
  const otherGuests = table
    ? allGuests.filter((g) => g.tableId !== table.id)
    : allGuests;
  const filteredOtherGuests = addSearch
    ? otherGuests.filter((g) =>
        g.name.toLowerCase().includes(addSearch.toLowerCase())
      )
    : otherGuests;

  if (!table) return null;

  const isCompleted = table.arrivedCount === table.guestCount && table.guestCount > 0;
  const arrivedPeople = table.arrivedPeopleCount || 0;
  const otherTables = tables.filter((t) => t.id !== table.id);

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            key="modal"
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
                    onClick={onClose}
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

                    {table.guests.length === 0 && !showAddPanel ? (
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
                                      {otherTables.map((ot) => (
                                        <SelectItem key={ot.id} value={ot.id} className="text-xs">
                                          {ot.name}
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

                                {/* Remove button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                  disabled={isLoading}
                                  onClick={() => setGuestToRemove({ id: guest.id, name: guest.name })}
                                >
                                  {isLoading ? (
                                    <Icons.spinner className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}

                    {/* Add Guest Panel */}
                    <div className="mt-4 shrink-0">
                      <Button
                        variant={showAddPanel ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setShowAddPanel(!showAddPanel);
                          setAddSearch("");
                        }}
                        className="w-full"
                      >
                        <UserPlus className="h-4 w-4 me-2" />
                        {t.manageGuests}
                      </Button>

                      {showAddPanel && (
                        <div className="mt-3 border rounded-lg p-3 bg-muted/20">
                          {table.isFull && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
                              {t.tableFull}
                            </p>
                          )}
                          <div className="relative mb-3">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={t.searchGuests}
                              value={addSearch}
                              onChange={(e) => setAddSearch(e.target.value)}
                              className="ps-9 h-9 text-sm"
                              dir={dir}
                            />
                          </div>
                          <ScrollArea className="max-h-[200px]" dir={dir}>
                            <div className="space-y-1.5 pe-2">
                              {filteredOtherGuests.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  {t.noUnassigned}
                                </p>
                              ) : (
                                filteredOtherGuests.map((guest) => {
                                  const isLoading = loadingGuests.has(guest.id);
                                  return (
                                    <div
                                      key={guest.id}
                                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-card border text-sm"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="truncate font-medium text-start">{guest.name}</span>
                                        <Badge variant="outline" className="text-[10px] shrink-0">
                                          {guest.guestCount} {t.people}
                                        </Badge>
                                        {guest.tableName && (
                                          <Badge variant="secondary" className="text-[10px] shrink-0">
                                            {guest.tableName}
                                          </Badge>
                                        )}
                                      </div>
                                      {table.isFull ? (
                                        <Select
                                          dir={dir}
                                          onValueChange={(existingGuestId) => handleSwapGuest(guest.id, existingGuestId)}
                                          disabled={isLoading}
                                        >
                                          <SelectTrigger className="w-[120px] h-7 text-xs">
                                            {isLoading ? (
                                              <Icons.spinner className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <span>{t.swapWith}</span>
                                            )}
                                          </SelectTrigger>
                                          <SelectContent>
                                            {table.guests.map((tg) => (
                                              <SelectItem key={tg.id} value={tg.id} className="text-xs">
                                                {tg.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="h-7 px-3 text-xs shrink-0"
                                          disabled={isLoading}
                                          onClick={() => handleAddGuest(guest.id)}
                                        >
                                          {isLoading ? (
                                            <Icons.spinner className="h-3 w-3 animate-spin" />
                                          ) : (
                                            t.add
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      <AlertDialog open={!!guestToRemove} onOpenChange={(open) => !open && setGuestToRemove(null)}>
        <AlertDialogContent
          dir={dir}
          className="max-w-sm gap-3 p-5 !min-h-0"
        >
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="text-start text-base">{t.confirmRemoveTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t.confirmRemoveDesc} <span className="font-medium">{guestToRemove?.name}</span> {t.confirmRemoveDescEnd}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={cn("mt-0", isRTL && "flex-row-reverse gap-2")}>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (guestToRemove) {
                  handleRemoveGuest(guestToRemove.id);
                  setGuestToRemove(null);
                }
              }}
            >
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
