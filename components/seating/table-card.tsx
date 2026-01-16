"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Users,
  Maximize2,
  X,
  MoreHorizontal,
  UserPlus,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import { deleteTable, removeGuestFromTable, moveGuestToTable } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  side?: string | null;
  groupName?: string | null;
  expectedGuests: number;
  rsvp?: {
    status: string;
    guestCount: number;
  } | null;
}

interface TableAssignment {
  id: string;
  guest: TableGuest;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape?: string | null;
  assignments: TableAssignment[];
  seatsUsed: number;
  seatsAvailable: number;
}

interface TableCardProps {
  table: Table;
  allTables: Table[];
  eventId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null }) => void;
}

function getSeatsForGuest(guest: TableGuest): number {
  if (guest.rsvp?.status === "DECLINED") return 0;
  if (guest.rsvp?.status === "ACCEPTED") return guest.rsvp.guestCount || 1;
  return guest.expectedGuests || 1;
}

// Get status indicator color class
function getStatusColor(status: string | undefined): string {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-500";
    case "PENDING":
      return "bg-amber-500";
    case "DECLINED":
      return "bg-red-500";
    default:
      return "bg-amber-500"; // Default to pending
  }
}

// Table shape visualization component
function TableShape({ shape, capacity, seatsUsed }: { shape?: string | null; capacity: number; seatsUsed: number }) {
  const filledSeats = Math.min(seatsUsed, capacity);
  const overCapacity = seatsUsed > capacity;

  // Generate seat positions around the table
  const generateSeatPositions = (count: number, startAngle: number = 0) => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i * (360 / Math.max(count, 1)));
      const rad = (angle * Math.PI) / 180;
      positions.push({
        x: 50 + 40 * Math.cos(rad),
        y: 50 + 40 * Math.sin(rad),
      });
    }
    return positions;
  };

  const seatPositions = generateSeatPositions(Math.min(capacity, 12));

  if (shape === "rectangle") {
    return (
      <div className="relative w-full aspect-[2/1] max-w-[200px] mx-auto">
        {/* Table */}
        <div className="absolute inset-[20%] rounded-lg bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 border-2 border-amber-300 dark:border-amber-700 shadow-inner" />
        {/* Seats */}
        <div className="absolute inset-0 flex flex-wrap justify-around items-center px-2">
          {Array.from({ length: Math.min(capacity, 12) }).map((_, i) => {
            const isFilled = i < filledSeats;
            return (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-colors",
                  isFilled
                    ? overCapacity && i >= capacity
                      ? "bg-red-400 border-red-500"
                      : "bg-zinc-700 dark:bg-zinc-300 border-zinc-800 dark:border-zinc-200"
                    : "bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600"
                )}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Default round table
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Table */}
      <div className="absolute inset-[25%] rounded-full bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 border-2 border-amber-300 dark:border-amber-700 shadow-inner" />
      {/* Seats */}
      {seatPositions.map((pos, i) => {
        const isFilled = i < filledSeats;
        return (
          <div
            key={i}
            className={cn(
              "absolute w-4 h-4 rounded-full border-2 transition-colors -translate-x-1/2 -translate-y-1/2",
              isFilled
                ? "bg-zinc-700 dark:bg-zinc-300 border-zinc-800 dark:border-zinc-200"
                : "bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600"
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        );
      })}
    </div>
  );
}

export function TableCard({
  table,
  allTables,
  eventId,
  isExpanded,
  onToggleExpand,
  onAssignGuests,
  onEditTable,
}: TableCardProps) {
  const t = useTranslations("seating");
  const tStatus = useTranslations("status");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "he";
  const dir = isRTL ? "rtl" : "ltr";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingGuestId, setLoadingGuestId] = useState<string | null>(null);

  const capacityPercentage = table.capacity > 0
    ? Math.min((table.seatsUsed / table.capacity) * 100, 100)
    : 0;
  const isOverCapacity = table.seatsUsed > table.capacity;
  const isFull = table.seatsUsed >= table.capacity;

  const otherTables = allTables.filter((t) => t.id !== table.id);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteTable(table.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("tableDeleted"));
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  async function handleRemoveGuest(guestId: string) {
    setLoadingGuestId(guestId);
    try {
      const result = await removeGuestFromTable({ guestId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestRemoved"));
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setLoadingGuestId(null);
    }
  }

  async function handleMoveGuest(guestId: string, targetTableId: string) {
    setLoadingGuestId(guestId);
    try {
      const result = await moveGuestToTable({ guestId, newTableId: targetTableId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestMoved"));
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setLoadingGuestId(null);
    }
  }

  return (
    <>
      {/* Collapsed Card */}
      <Card className="h-full transition-all duration-200 hover:shadow-md border-border/60" dir={dir}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base truncate flex-1 text-start">{table.name}</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <DropdownMenu dir={dir}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"}>
                  <DropdownMenuItem onClick={() => onAssignGuests(table.id)}>
                    <UserPlus className="me-2 h-4 w-4" />
                    {t("assignGuests")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditTable(table)}>
                    <Pencil className="me-2 h-4 w-4" />
                    {t("editTable")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    {t("deleteTable")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Capacity indicator */}
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{table.assignments.length} {t("guestName")}</span>
            </div>
            <span className={cn(
              "font-semibold",
              isOverCapacity ? "text-red-600" : isFull ? "text-amber-600" : "text-muted-foreground"
            )}>
              {table.seatsUsed}/{table.capacity}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                isOverCapacity ? "bg-red-500" : isFull ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>

          {/* Guest List - Scrollable (shows 5 guests before scrolling) */}
          {table.assignments.length === 0 ? (
            <div
              className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onAssignGuests(table.id)}
            >
              {t("clickToAssign")}
            </div>
          ) : (
            <ScrollArea className="h-[180px]" dir={dir}>
              <div className="space-y-1.5 ps-0 pe-2">
                {table.assignments.map((assignment) => {
                  const status = assignment.guest.rsvp?.status;
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-2 py-2 px-3 rounded-md text-sm bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* RSVP Status indicator */}
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            getStatusColor(status)
                          )}
                          title={status ? tStatus(status.toLowerCase()) : tStatus("pending")}
                        />
                        <span className="truncate font-medium text-start">{assignment.guest.name}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {getSeatsForGuest(assignment.guest)}
                      </span>
                    </div>
                  );
                })}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={onToggleExpand}
            />

            {/* Modal */}
            <motion.div
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
                        <Users className="h-4 w-4" />
                        <span className={cn(
                          "font-semibold",
                          isOverCapacity ? "text-red-600" : isFull ? "text-amber-600" : ""
                        )}>
                          {table.seatsUsed}/{table.capacity}
                        </span>
                      </div>
                      {isOverCapacity && (
                        <Badge variant="destructive" className="text-xs">
                          {t("overCapacity", { count: table.seatsUsed - table.capacity })}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTable(table)}
                      >
                        <Pencil className="me-2 h-4 w-4" />
                        {t("editTable")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleExpand}
                        className="h-9 w-9 p-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Left/Start side - Table visualization */}
                    <div className="lg:w-1/3 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-e bg-muted/20">
                      <TableShape
                        shape={table.shape}
                        capacity={table.capacity}
                        seatsUsed={table.seatsUsed}
                      />
                      <div className="mt-4 text-center">
                        <p className="text-sm font-medium">{table.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("seatsUsed", { used: table.seatsUsed, total: table.capacity })}
                        </p>
                      </div>

                      {/* Seat Legend */}
                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-zinc-700 dark:bg-zinc-300 border border-zinc-800 dark:border-zinc-200" />
                          <span>{t("modal.filled")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600" />
                          <span>{t("modal.empty")}</span>
                        </div>
                      </div>

                      {/* RSVP Status Legend */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span>{tStatus("accepted")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>{tStatus("pending")}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-col gap-2 mt-6 w-full max-w-[200px]">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => onAssignGuests(table.id)}
                        >
                          <UserPlus className="me-2 h-4 w-4" />
                          {t("assignGuests")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("deleteTable")}
                        </Button>
                      </div>
                    </div>

                    {/* Right/End side - Guest list */}
                    <div className="flex-1 p-6 overflow-hidden flex flex-col">
                      <h3 className="text-sm font-semibold mb-4 text-start">
                        {t("modal.guestsAtTable")}
                        {table.assignments.length > 0 && (
                          <span className="text-muted-foreground font-normal ms-2">
                            ({table.assignments.length})
                          </span>
                        )}
                      </h3>

                      {table.assignments.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                              {t("modal.noGuests")}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => onAssignGuests(table.id)}
                            >
                              <UserPlus className="me-2 h-4 w-4" />
                              {t("assignGuests")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <ScrollArea className="flex-1" dir={dir}>
                          <div className="space-y-2 ps-0 pe-4">
                            {table.assignments.map((assignment) => {
                              const seats = getSeatsForGuest(assignment.guest);
                              const isLoading = loadingGuestId === assignment.guest.id;

                              const status = assignment.guest.rsvp?.status;
                              return (
                                <div
                                  key={assignment.id}
                                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                                >
                                  {/* RSVP Status indicator */}
                                  <div
                                    className={cn(
                                      "w-3 h-3 rounded-full shrink-0",
                                      getStatusColor(status)
                                    )}
                                    title={status ? tStatus(status.toLowerCase()) : tStatus("pending")}
                                  />

                                  {/* Guest info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm truncate text-start">
                                        {assignment.guest.name}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] shrink-0">
                                        {seats} {t("modal.seats")}
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-[10px] shrink-0",
                                          status === "ACCEPTED" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                          status === "PENDING" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                          status === "DECLINED" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}
                                      >
                                        {tStatus(status?.toLowerCase() || "pending")}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Move guest dropdown */}
                                  {otherTables.length > 0 && (
                                    <Select
                                      dir={dir}
                                      onValueChange={(value) => handleMoveGuest(assignment.guest.id, value)}
                                      disabled={isLoading}
                                    >
                                      <SelectTrigger className="w-[130px] h-8 text-xs">
                                        {isLoading ? (
                                          <Icons.spinner className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            {isRTL ? (
                                              <ArrowLeft className="h-3 w-3 ms-0 me-1" />
                                            ) : (
                                              <ArrowRight className="h-3 w-3 ms-0 me-1" />
                                            )}
                                            <span>{t("modal.moveTo")}</span>
                                          </>
                                        )}
                                      </SelectTrigger>
                                      <SelectContent>
                                        {otherTables.map((tbl) => (
                                          <SelectItem key={tbl.id} value={tbl.id} className="text-xs">
                                            {tbl.name} ({tbl.seatsAvailable} {t("modal.free")})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}

                                  {/* Remove button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    disabled={isLoading}
                                    onClick={() => handleRemoveGuest(assignment.guest.id)}
                                  >
                                    {isLoading ? (
                                      <Icons.spinner className="h-4 w-4 animate-spin" />
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{t("deleteTable")}</AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t("confirmDeleteTable")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={cn(isRTL && "flex-row-reverse gap-2")}>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
