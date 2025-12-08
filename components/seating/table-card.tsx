"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteTable, removeGuestFromTable, removeGuestsFromTableBulk } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface TableCardProps {
  table: {
    id: string;
    name: string;
    capacity: number;
    shape?: string | null;
    assignments: TableAssignment[];
    seatsUsed: number;
    seatsAvailable: number;
  };
  eventId: string;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null }) => void;
}

function getSeatsForGuest(guest: TableGuest): number {
  if (guest.rsvp?.status === "DECLINED") return 0;
  if (guest.rsvp?.status === "ACCEPTED") return guest.rsvp.guestCount || 1;
  return guest.expectedGuests || 1;
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

export function TableCard({ table, eventId, onAssignGuests, onEditTable }: TableCardProps) {
  const t = useTranslations("seating");
  const tStatus = useTranslations("status");
  const tc = useTranslations("common");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [isRemovingBulk, setIsRemovingBulk] = useState(false);

  const capacityPercentage = table.capacity > 0
    ? Math.min((table.seatsUsed / table.capacity) * 100, 100)
    : 0;
  const isOverCapacity = table.seatsUsed > table.capacity;

  const allSelected = table.assignments.length > 0 && selectedGuests.size === table.assignments.length;
  const someSelected = selectedGuests.size > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(table.assignments.map((a) => a.guest.id)));
    }
  }

  function toggleSelectGuest(guestId: string) {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  }

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
      toast.error("Failed to delete table");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  async function handleRemoveGuest(guestId: string) {
    setRemovingGuestId(guestId);
    try {
      const result = await removeGuestFromTable({ guestId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestRemoved"));
        setSelectedGuests((prev) => {
          const newSet = new Set(prev);
          newSet.delete(guestId);
          return newSet;
        });
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error("Failed to remove guest");
    } finally {
      setRemovingGuestId(null);
    }
  }

  async function handleRemoveSelectedGuests() {
    if (selectedGuests.size === 0) return;

    setIsRemovingBulk(true);
    const guestIds = Array.from(selectedGuests);

    try {
      const result = await removeGuestsFromTableBulk(guestIds);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestsRemoved", { count: result.removed ?? 0 }));
        setSelectedGuests(new Set());
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error("Failed to remove guests");
    }

    setIsRemovingBulk(false);
  }

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-md h-fit",
        isOverCapacity && "border-destructive"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              {table.name}
              {table.shape && (
                <Badge variant="outline" className="text-xs font-normal">
                  {t(`shapes.${table.shape}`)}
                </Badge>
              )}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Icons.ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAssignGuests(table.id)}>
                  <Icons.userPlus className="me-2 h-4 w-4" />
                  {t("assignGuests")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditTable(table)}>
                  <Icons.pencil className="me-2 h-4 w-4" />
                  {t("editTable")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Icons.trash className="me-2 h-4 w-4" />
                  {t("deleteTable")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capacity Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={cn(isOverCapacity && "text-destructive font-medium")}>
                {t("seatsUsed", { used: table.seatsUsed, total: table.capacity })}
              </span>
              {isOverCapacity && (
                <span className="text-destructive text-xs">
                  {t("overCapacity", { count: table.seatsUsed - table.capacity })}
                </span>
              )}
            </div>
            <Progress
              value={capacityPercentage}
              className={cn("h-2", isOverCapacity && "[&>div]:bg-destructive")}
            />
          </div>

          {/* Bulk Actions */}
          {selectedGuests.size > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {selectedGuests.size} {t("selected")}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveSelectedGuests}
                disabled={isRemovingBulk}
              >
                {isRemovingBulk ? (
                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.trash className="me-2 h-4 w-4" />
                )}
                {t("removeSelected")}
              </Button>
            </div>
          )}

          {/* Guest Table */}
          <div className="rounded-md border overflow-hidden">
            {table.assignments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {t("clickToAssign")}
              </div>
            ) : (
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                          }
                        }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="truncate">{t("guestName")}</TableHead>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-20">{t("status")}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.assignments.map((assignment) => {
                    const seats = getSeatsForGuest(assignment.guest);
                    const isSelected = selectedGuests.has(assignment.guest.id);
                    return (
                      <TableRow
                        key={assignment.id}
                        className={cn(isSelected && "bg-muted/50")}
                      >
                        <TableCell className="w-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectGuest(assignment.guest.id)}
                            aria-label={`Select ${assignment.guest.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium truncate">
                          {assignment.guest.name}
                        </TableCell>
                        <TableCell className="w-12 text-center tabular-nums">
                          {seats}
                        </TableCell>
                        <TableCell className="w-20">
                          <Badge variant={getRsvpBadgeVariant(assignment.guest.rsvp?.status)} className="text-xs">
                            {tStatus(assignment.guest.rsvp?.status?.toLowerCase() || "pending")}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={removingGuestId === assignment.guest.id}
                            onClick={() => handleRemoveGuest(assignment.guest.id)}
                          >
                            {removingGuestId === assignment.guest.id ? (
                              <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icons.close className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Quick Assign Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onAssignGuests(table.id)}
          >
            <Icons.add className="me-2 h-4 w-4" />
            {t("assignGuests")}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTable")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteTable")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
