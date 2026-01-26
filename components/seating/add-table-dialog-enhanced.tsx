"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { createTable, getGuestsForAssignment, assignGuestsToTable } from "@/actions/seating";
import {
  type Shape,
  type SizePreset,
  SIZE_PRESETS,
} from "@/lib/validations/seating";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface AddTableDialogEnhancedProps {
  eventId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SHAPES: Shape[] = ["square", "circle", "rectangle", "oval"];

// Shape visual previews
const SHAPE_PREVIEWS: Record<Shape, { icon: string }> = {
  square: { icon: "▢" },
  circle: { icon: "⭕" },
  rectangle: { icon: "▭" },
  oval: { icon: "⬭" },
};

// Predefined groups that have translations
const PREDEFINED_GROUPS = ["family", "friends", "work", "other"];

interface GuestForAssignment {
  id: string;
  name: string;
  side?: string | null;
  groupName?: string | null;
  seatsNeeded: number;
  rsvp?: {
    status: string;
    guestCount: number;
  } | null;
}

// Simplified schema
const addTableSchema = z.object({
  weddingEventId: z.string().min(1),
  name: z.string().min(1, "Table name is required").max(100),
  capacity: z.number().int().min(1).max(32),
  shape: z.enum(["square", "circle", "rectangle", "oval"]),
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
});

type AddTableInput = z.infer<typeof addTableSchema>;

export function AddTableDialogEnhanced({
  eventId,
  open = false,
  onOpenChange,
}: AddTableDialogEnhancedProps) {
  const t = useTranslations("seating");
  const tGuests = useTranslations("guests");
  const tc = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const [sizePreset, setSizePreset] = useState<SizePreset>("medium");

  // Guest assignment state
  const [guests, setGuests] = useState<GuestForAssignment[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [selectedSide, setSelectedSide] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  const form = useForm<AddTableInput>({
    resolver: zodResolver(addTableSchema),
    defaultValues: {
      weddingEventId: eventId,
      name: "",
      capacity: 10,
      shape: "circle" as const,
      width: SIZE_PRESETS.circle.medium.width,
      height: SIZE_PRESETS.circle.medium.height,
    },
  });

  const watchedShape = form.watch("shape");
  const watchedCapacity = form.watch("capacity");

  // Load guests when dialog opens
  useEffect(() => {
    if (open) {
      loadGuests();
    } else {
      // Reset state when dialog closes
      setSelectedGuestIds(new Set());
      setSelectedSide("all");
      setSelectedGroup("all");
    }
  }, [open, eventId]);

  async function loadGuests() {
    setIsLoadingGuests(true);
    try {
      const result = await getGuestsForAssignment(eventId);
      if (result.success && result.guests) {
        // Filter out already seated guests
        const unseatedGuests = result.guests.filter(g => !g.tableAssignment);
        setGuests(unseatedGuests);
      }
    } catch {
      console.error("Failed to load guests");
    } finally {
      setIsLoadingGuests(false);
    }
  }

  // Get unique sides and groups
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

  // Filter guests based on selected side and group
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (selectedSide !== "all" && g.side !== selectedSide) return false;
      if (selectedGroup !== "all" && g.groupName !== selectedGroup) return false;
      return true;
    });
  }, [guests, selectedSide, selectedGroup]);

  // Calculate total seats for selected guests
  const selectedSeatsCount = useMemo(() => {
    return Array.from(selectedGuestIds).reduce((sum, id) => {
      const guest = guests.find(g => g.id === id);
      return sum + (guest?.seatsNeeded || 0);
    }, 0);
  }, [selectedGuestIds, guests]);

  // Handle size preset change
  function handleSizePresetChange(preset: SizePreset) {
    setSizePreset(preset);
    const newSize = SIZE_PRESETS[watchedShape][preset];
    form.setValue("width", newSize.width);
    form.setValue("height", newSize.height);
  }

  // Handle shape change
  function handleShapeChange(shape: Shape) {
    form.setValue("shape", shape);
    const newSize = SIZE_PRESETS[shape][sizePreset];
    form.setValue("width", newSize.width);
    form.setValue("height", newSize.height);
  }

  // Toggle guest selection
  function toggleGuestSelection(guestId: string) {
    setSelectedGuestIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        newSet.add(guestId);
      }
      return newSet;
    });
  }

  // Select all filtered guests (up to capacity)
  function selectAllFiltered() {
    let remainingCapacity = watchedCapacity - selectedSeatsCount;
    const newSelected = new Set(selectedGuestIds);

    for (const guest of filteredGuests) {
      if (newSelected.has(guest.id)) continue;
      if (guest.seatsNeeded <= remainingCapacity) {
        newSelected.add(guest.id);
        remainingCapacity -= guest.seatsNeeded;
      }
    }
    setSelectedGuestIds(newSelected);
  }

  // Clear selection
  function clearSelection() {
    setSelectedGuestIds(new Set());
  }

  async function onSubmit(data: AddTableInput) {
    setIsLoading(true);
    try {
      // Create table with hardcoded values
      const result = await createTable({
        ...data,
        seatingArrangement: "even",
        colorTheme: "default",
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // If guests are selected, assign them to the new table
      if (selectedGuestIds.size > 0 && result.table) {
        const assignResult = await assignGuestsToTable({
          tableId: result.table.id,
          guestIds: Array.from(selectedGuestIds),
        });

        if (assignResult.error) {
          toast.error(assignResult.error);
        }
      }

      toast.success(t("tableCreated"));
      onOpenChange?.(false);
      form.reset({
        weddingEventId: eventId,
        name: "",
        capacity: 10,
        shape: "circle",
        width: SIZE_PRESETS.circle.medium.width,
        height: SIZE_PRESETS.circle.medium.height,
      });
      setSizePreset("medium");
      setSelectedGuestIds(new Set());

      // Dispatch event with new table data for optimistic update
      if (result.table) {
        window.dispatchEvent(new CustomEvent("seating-data-changed", {
          detail: {
            type: "table-added",
            table: {
              ...result.table,
              assignments: [],
              seatsUsed: 0,
              seatsAvailable: result.table.capacity,
            },
          },
        }));
      } else {
        // Fallback to full refresh
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error("Failed to create table");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addTable")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Table Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tableName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("tableNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Capacity and Size */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("capacity")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={32}
                        placeholder={t("capacityPlaceholder")}
                        {...field}
                        onChange={(e) =>
                          field.onChange(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Size Preset */}
              <FormItem>
                <FormLabel>{t("sizePreset.label")}</FormLabel>
                <div className="flex gap-1">
                  {(["medium", "large"] as SizePreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSizePresetChange(preset)}
                      className={cn(
                        "flex-1 px-2 py-2 text-xs border-2 rounded-lg transition-all hover:bg-accent",
                        sizePreset === preset
                          ? "border-primary bg-accent"
                          : "border-muted"
                      )}
                    >
                      {t(`sizePreset.${preset}`)}
                    </button>
                  ))}
                </div>
              </FormItem>
            </div>

            {/* Shape Selection */}
            <FormField
              control={form.control}
              name="shape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shape")}</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => handleShapeChange(shape)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 border-2 rounded-lg transition-all hover:bg-accent",
                          field.value === shape
                            ? "border-primary bg-accent"
                            : "border-muted"
                        )}
                      >
                        <span className="text-xl">
                          {SHAPE_PREVIEWS[shape].icon}
                        </span>
                        <span className="text-xs">
                          {t(`shapes.${shape}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guest Assignment Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("assignGuests")}</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedSeatsCount}/{watchedCapacity} {t("seats")}
                </span>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedSide} onValueChange={setSelectedSide}>
                  <SelectTrigger className="h-8 text-xs">
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

                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t("filters.group")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {PREDEFINED_GROUPS.includes(group.toLowerCase())
                          ? tGuests(`groups.${group.toLowerCase()}` as any)
                          : group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={selectAllFiltered}
                  disabled={filteredGuests.length === 0}
                >
                  {t("selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={clearSelection}
                  disabled={selectedGuestIds.size === 0}
                >
                  {t("clearSelection")}
                </Button>
              </div>

              {/* Guest List */}
              {isLoadingGuests ? (
                <div className="flex items-center justify-center py-4">
                  <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredGuests.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {t("noGuestsToAssign")}
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredGuests.map((guest) => {
                    const isSelected = selectedGuestIds.has(guest.id);
                    const wouldExceedCapacity = !isSelected &&
                      (selectedSeatsCount + guest.seatsNeeded) > watchedCapacity;

                    return (
                      <label
                        key={guest.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0",
                          wouldExceedCapacity && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {
                            if (!wouldExceedCapacity || isSelected) {
                              toggleGuestSelection(guest.id);
                            }
                          }}
                          disabled={wouldExceedCapacity && !isSelected}
                        />
                        <span className="flex-1 text-sm truncate">{guest.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {guest.seatsNeeded} {guest.seatsNeeded === 1 ? t("seat") : t("seats")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange?.(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                )}
                {tc("create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
