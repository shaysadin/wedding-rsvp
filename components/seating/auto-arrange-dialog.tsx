"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import { autoArrangeTables, getGuestsForAssignment } from "@/actions/seating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Icons } from "@/components/shared/icons";

// Predefined groups that have translations
const PREDEFINED_GROUPS = ["family", "friends", "work", "other"];

interface GuestForPreview {
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
}

interface AutoArrangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function AutoArrangeDialog({
  open,
  onOpenChange,
  eventId,
}: AutoArrangeDialogProps) {
  const t = useTranslations("seating");
  const tGuests = useTranslations("guests");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "he";

  const [guests, setGuests] = useState<GuestForPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableSize, setTableSize] = useState(10);
  const [tableShape, setTableShape] = useState<"circle" | "rectangle" | "rectangleRounded" | "concave" | "concaveRounded">("circle");
  const [groupingStrategy, setGroupingStrategy] = useState<"side-then-group" | "group-only">("side-then-group");
  const [sideFilter, setSideFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [rsvpFilter, setRsvpFilter] = useState<("ACCEPTED" | "PENDING")[]>(["ACCEPTED", "PENDING"]);

  // Load guests when dialog opens
  useEffect(() => {
    if (open) {
      loadGuests();
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

  // Calculate preview stats based on current filters
  const previewStats = useMemo(() => {
    // Filter guests
    let filtered = guests.filter((g) => {
      // Side filter
      if (sideFilter !== "all" && g.side !== sideFilter) {
        return false;
      }
      // Group filter
      if (groupFilter !== "all" && g.groupName !== groupFilter) {
        return false;
      }
      // RSVP filter
      const status = g.rsvp?.status || "PENDING";
      if (!rsvpFilter.includes(status as "ACCEPTED" | "PENDING")) {
        return false;
      }
      return true;
    });

    const totalGuests = filtered.length;
    const totalSeats = filtered.reduce((sum, g) => sum + g.seatsNeeded, 0);
    const tablesNeeded = Math.ceil(totalSeats / tableSize);

    return {
      totalGuests,
      totalSeats,
      tablesNeeded,
    };
  }, [guests, sideFilter, groupFilter, rsvpFilter, tableSize]);

  async function handleAutoArrange() {
    setIsProcessing(true);
    try {
      const result = await autoArrangeTables({
        eventId,
        tableSize,
        tableShape,
        groupingStrategy,
        sideFilter: sideFilter === "all" ? undefined : sideFilter,
        groupFilter: groupFilter === "all" ? undefined : groupFilter,
        includeRsvpStatus: rsvpFilter,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("autoArrange.success", {
          tables: result.tablesCreated || 0,
          guests: result.guestsSeated || 0
        }));
        onOpenChange(false);

        // Dispatch event to refresh data
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error("Failed to auto-arrange tables");
    } finally {
      setIsProcessing(false);
    }
  }

  function toggleRsvpFilter(status: "ACCEPTED" | "PENDING") {
    setRsvpFilter((prev) => {
      if (prev.includes(status)) {
        // Don't allow empty selection
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("autoArrange.title")}</DialogTitle>
          <DialogDescription>
            {t("autoArrange.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <Icons.alertTriangle className="h-4 w-4" />
            <AlertTitle>{t("autoArrange.warningTitle")}</AlertTitle>
            <AlertDescription>
              {t("autoArrange.warningDescription")}
            </AlertDescription>
          </Alert>

          {/* Table Size & Shape */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tableSize">{t("autoArrange.tableSize")}</Label>
              <Input
                id="tableSize"
                type="number"
                min={1}
                max={20}
                value={tableSize}
                onChange={(e) => setTableSize(Math.max(1, Math.min(20, parseInt(e.target.value) || 10)))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("autoArrange.tableShape")}</Label>
              <Select
                dir={isRTL ? "rtl" : undefined}
                value={tableShape}
                onValueChange={(v) => setTableShape(v as typeof tableShape)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">{t("shapes.circle")}</SelectItem>
                  <SelectItem value="rectangle">{t("shapes.rectangle")}</SelectItem>
                  <SelectItem value="rectangleRounded">{t("shapes.rectangleRounded")}</SelectItem>
                  <SelectItem value="concave">{t("shapes.concave")}</SelectItem>
                  <SelectItem value="concaveRounded">{t("shapes.concaveRounded")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grouping Strategy */}
          <div className="space-y-2">
            <Label>{t("autoArrange.groupBy")}</Label>
            <Select
              dir={isRTL ? "rtl" : undefined}
              value={groupingStrategy}
              onValueChange={(v) => setGroupingStrategy(v as "side-then-group" | "group-only")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="side-then-group">{t("autoArrange.sideFirst")}</SelectItem>
                <SelectItem value="group-only">{t("autoArrange.groupOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            {/* Side Filter */}
            <div className="space-y-2">
              <Label>{t("filters.side")}</Label>
              <Select dir={isRTL ? "rtl" : undefined} value={sideFilter} onValueChange={setSideFilter}>
                <SelectTrigger>
                  <SelectValue />
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
            </div>

            {/* Group Filter */}
            <div className="space-y-2">
              <Label>{t("filters.group")}</Label>
              <Select dir={isRTL ? "rtl" : undefined} value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger>
                  <SelectValue />
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
            </div>
          </div>

          {/* RSVP Status Filter */}
          <div className="space-y-2">
            <Label>{t("autoArrange.includeRsvp")}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rsvpFilter.includes("ACCEPTED")}
                  onChange={() => toggleRsvpFilter("ACCEPTED")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{t("autoArrange.accepted")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rsvpFilter.includes("PENDING")}
                  onChange={() => toggleRsvpFilter("PENDING")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{t("autoArrange.pending")}</span>
              </label>
            </div>
          </div>

          {/* Preview Stats */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg bg-muted p-4">
              <div className="text-sm font-medium mb-2">{t("autoArrange.preview")}</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{previewStats.tablesNeeded}</div>
                  <div className="text-xs text-muted-foreground">{t("autoArrange.tables")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{previewStats.totalGuests}</div>
                  <div className="text-xs text-muted-foreground">{t("autoArrange.guests")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{previewStats.totalSeats}</div>
                  <div className="text-xs text-muted-foreground">{t("autoArrange.seats")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:border-0 sm:pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleAutoArrange}
            disabled={isProcessing || previewStats.totalGuests === 0}
            variant="destructive"
          >
            {isProcessing && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
            {t("autoArrange.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
