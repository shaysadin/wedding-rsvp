"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { nanoid } from "nanoid";

import { autoArrangeTablesWithConfigs, getGuestsForAssignment } from "@/actions/seating";
import { SIZE_PRESETS, type SizePreset, type Shape } from "@/lib/validations/seating";
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
import { cn } from "@/lib/utils";

// Predefined groups that have translations
const PREDEFINED_GROUPS = ["family", "friends", "work", "other"];

type TableShape = Shape;

interface TableConfiguration {
  id: string;
  shape: TableShape;
  capacity: number;
  count: number;
  sizePreset: SizePreset;
  width: number;
  height: number;
}

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

interface AutoArrangeStepperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function AutoArrangeStepper({
  open,
  onOpenChange,
  eventId,
}: AutoArrangeStepperProps) {
  const t = useTranslations("seating");
  const tGuests = useTranslations("guests");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "he";

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Loading states
  const [guests, setGuests] = useState<GuestForPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 1: Guest Filters
  const [sideFilter, setSideFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [rsvpFilter, setRsvpFilter] = useState<("ACCEPTED" | "PENDING")[]>(["ACCEPTED", "PENDING"]);

  // Step 2: Table Configurations
  const [tableConfigs, setTableConfigs] = useState<TableConfiguration[]>([
    {
      id: nanoid(),
      shape: "circle",
      capacity: 10,
      count: 1,
      sizePreset: "medium",
      width: SIZE_PRESETS.circle.medium.width,
      height: SIZE_PRESETS.circle.medium.height,
    },
  ]);

  // Load guests when dialog opens
  useEffect(() => {
    if (open) {
      loadGuests();
      // Reset to step 1 when opening
      setCurrentStep(1);
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

  // Filter guests based on current filters
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
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
  }, [guests, sideFilter, groupFilter, rsvpFilter]);

  // Calculate preview stats
  const previewStats = useMemo(() => {
    const totalGuests = filteredGuests.length;
    const totalSeats = filteredGuests.reduce((sum, g) => sum + g.seatsNeeded, 0);
    const totalConfiguredTables = tableConfigs.reduce((sum, config) => sum + config.count, 0);
    const totalConfiguredSeats = tableConfigs.reduce((sum, config) => sum + (config.capacity * config.count), 0);

    return {
      totalGuests,
      totalSeats,
      totalConfiguredTables,
      totalConfiguredSeats,
      hasEnoughSeats: totalConfiguredSeats >= totalSeats,
    };
  }, [filteredGuests, tableConfigs]);

  // Group guests by group name then side for preview (moved to top level to follow Rules of Hooks)
  const guestsByGroup = useMemo(() => {
    const groups: Record<string, GuestForPreview[]> = {};

    // Sort guests: Group -> Side -> RSVP Status -> Name
    const sortedGuests = [...filteredGuests].sort((a, b) => {
      const groupA = (a.groupName || "other").toLowerCase();
      const groupB = (b.groupName || "other").toLowerCase();
      if (groupA !== groupB) return groupA.localeCompare(groupB);

      const sideA = (a.side || "other").toLowerCase();
      const sideB = (b.side || "other").toLowerCase();
      if (sideA !== sideB) return sideA.localeCompare(sideB);

      const statusA = a.rsvp?.status || "PENDING";
      const statusB = b.rsvp?.status || "PENDING";
      const statusOrder: Record<string, number> = { ACCEPTED: 0, PENDING: 1 };
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return (statusOrder[statusA] || 0) - (statusOrder[statusB] || 0);
      }

      return a.name.localeCompare(b.name);
    });

    for (const guest of sortedGuests) {
      const key = guest.groupName || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(guest);
    }

    return groups;
  }, [filteredGuests]);

  // Toggle RSVP filter
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

  // Table configuration handlers
  function addTableConfig() {
    const defaultShape: TableShape = "circle";
    const defaultPreset: SizePreset = "medium";
    setTableConfigs((prev) => [
      ...prev,
      {
        id: nanoid(),
        shape: defaultShape,
        capacity: 10,
        count: 1,
        sizePreset: defaultPreset,
        width: SIZE_PRESETS[defaultShape][defaultPreset].width,
        height: SIZE_PRESETS[defaultShape][defaultPreset].height,
      },
    ]);
  }

  function removeTableConfig(id: string) {
    if (tableConfigs.length <= 1) return; // Keep at least one config
    setTableConfigs((prev) => prev.filter((config) => config.id !== id));
  }

  function updateTableConfig(id: string, updates: Partial<TableConfiguration>) {
    setTableConfigs((prev) =>
      prev.map((config) => {
        if (config.id !== id) return config;

        const updated = { ...config, ...updates };

        // If shape changed, update dimensions based on current size preset
        if (updates.shape && updates.shape !== config.shape) {
          const preset = updated.sizePreset || "medium";
          updated.width = SIZE_PRESETS[updates.shape][preset].width;
          updated.height = SIZE_PRESETS[updates.shape][preset].height;
        }

        // If size preset changed, update dimensions
        if (updates.sizePreset && updates.sizePreset !== config.sizePreset) {
          const shape = updated.shape || "circle";
          updated.width = SIZE_PRESETS[shape][updates.sizePreset].width;
          updated.height = SIZE_PRESETS[shape][updates.sizePreset].height;
        }

        return updated;
      })
    );
  }

  // Navigation
  function goToNextStep() {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }

  function goToPrevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  // Submit handler
  async function handleSubmit() {
    setIsProcessing(true);
    try {
      const result = await autoArrangeTablesWithConfigs({
        eventId,
        filters: {
          side: sideFilter === "all" ? undefined : sideFilter,
          groupId: groupFilter === "all" ? undefined : groupFilter,
          rsvpStatus: rsvpFilter,
        },
        tableConfigs: tableConfigs.map((config) => ({
          shape: config.shape,
          capacity: config.capacity,
          count: config.count,
          width: config.width,
          height: config.height,
        })),
        clearExisting: true,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("autoArrange.success", {
          tables: result.tablesCreated || 0,
          guests: result.guestsSeated || 0,
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

  // Step indicator component
  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step ? (
                <Icons.check className="h-4 w-4" />
              ) : (
                step
              )}
            </div>
            {step < 4 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  currentStep > step ? "bg-primary/50" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Step 1: Guest Filters
  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">{t("autoArrange.step1Title")}</h3>
          <p className="text-sm text-muted-foreground">{t("autoArrange.step1Description")}</p>
        </div>

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
        <div className="rounded-lg bg-muted p-4">
          <div className="text-sm font-medium mb-2">{t("autoArrange.matchingGuests")}</div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{previewStats.totalGuests}</div>
              <div className="text-xs text-muted-foreground">{t("autoArrange.guests")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{previewStats.totalSeats}</div>
              <div className="text-xs text-muted-foreground">{t("autoArrange.seatsNeeded")}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Table Configuration
  function renderStep2() {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">{t("autoArrange.step2Title")}</h3>
          <p className="text-sm text-muted-foreground">{t("autoArrange.step2Description")}</p>
        </div>

        {/* Table configurations */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {tableConfigs.map((config, index) => (
            <div key={config.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  {t("autoArrange.tableType")} {index + 1}
                </span>
                {tableConfigs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTableConfig(config.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Icons.trash className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Shape */}
                <div className="space-y-1">
                  <Label className="text-xs">{t("shape")}</Label>
                  <Select
                    dir={isRTL ? "rtl" : undefined}
                    value={config.shape}
                    onValueChange={(v) => updateTableConfig(config.id, { shape: v as TableShape })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">{t("shapes.square")}</SelectItem>
                      <SelectItem value="circle">{t("shapes.circle")}</SelectItem>
                      <SelectItem value="rectangle">{t("shapes.rectangle")}</SelectItem>
                      <SelectItem value="oval">{t("shapes.oval")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Size Preset */}
                <div className="space-y-1">
                  <Label className="text-xs">{t("sizePreset.label")}</Label>
                  <Select
                    dir={isRTL ? "rtl" : undefined}
                    value={config.sizePreset}
                    onValueChange={(v) => updateTableConfig(config.id, { sizePreset: v as SizePreset })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{t("sizePreset.small")}</SelectItem>
                      <SelectItem value="medium">{t("sizePreset.medium")}</SelectItem>
                      <SelectItem value="large">{t("sizePreset.large")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Capacity */}
                <div className="space-y-1">
                  <Label className="text-xs">{t("capacity")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={32}
                    value={config.capacity}
                    onChange={(e) => updateTableConfig(config.id, { capacity: Math.max(1, Math.min(32, parseInt(e.target.value) || 10)) })}
                    className="h-9"
                  />
                </div>

                {/* Count */}
                <div className="space-y-1">
                  <Label className="text-xs">{t("autoArrange.tableCount")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={config.count}
                    onChange={(e) => updateTableConfig(config.id, { count: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add table config button */}
        <Button variant="outline" onClick={addTableConfig} className="w-full">
          <Icons.add className="h-4 w-4 me-2" />
          {t("autoArrange.addTableType")}
        </Button>

        {/* Total summary */}
        <div className="rounded-lg bg-muted p-4">
          <div className="text-sm font-medium mb-2">{t("autoArrange.totalConfiguration")}</div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{previewStats.totalConfiguredTables}</div>
              <div className="text-xs text-muted-foreground">{t("autoArrange.tables")}</div>
            </div>
            <div>
              <div className={cn(
                "text-2xl font-bold",
                !previewStats.hasEnoughSeats && "text-destructive"
              )}>
                {previewStats.totalConfiguredSeats}
              </div>
              <div className="text-xs text-muted-foreground">{t("autoArrange.totalSeats")}</div>
            </div>
          </div>
          {!previewStats.hasEnoughSeats && (
            <p className="text-xs text-destructive mt-2 text-center">
              {t("autoArrange.notEnoughSeats", { needed: previewStats.totalSeats, configured: previewStats.totalConfiguredSeats })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Arrangement Preview
  function renderStep3() {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">{t("autoArrange.step3Title")}</h3>
          <p className="text-sm text-muted-foreground">{t("autoArrange.step3Description")}</p>
        </div>

        {/* Arrangement order explanation */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t("autoArrange.arrangementOrder")}
          </p>
        </div>

        {/* Preview by group */}
        <div className="space-y-3 max-h-[250px] overflow-y-auto">
          {Object.entries(guestsByGroup).map(([groupName, groupGuests]) => {
            const groupLabel = PREDEFINED_GROUPS.includes(groupName.toLowerCase())
              ? tGuests(`groups.${groupName.toLowerCase()}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
              : groupName;

            return (
              <div key={groupName} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{groupLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {groupGuests.length} {t("autoArrange.guests")} / {groupGuests.reduce((sum, g) => sum + g.seatsNeeded, 0)} {t("autoArrange.seats")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {groupGuests.slice(0, 10).map((guest) => (
                    <span
                      key={guest.id}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded",
                        guest.rsvp?.status === "ACCEPTED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      )}
                    >
                      {guest.name}
                    </span>
                  ))}
                  {groupGuests.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{groupGuests.length - 10} {t("autoArrange.more")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 4: Confirmation
  function renderStep4() {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">{t("autoArrange.step4Title")}</h3>
          <p className="text-sm text-muted-foreground">{t("autoArrange.step4Description")}</p>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <Icons.alertTriangle className="h-4 w-4" />
          <AlertTitle>{t("autoArrange.warningTitle")}</AlertTitle>
          <AlertDescription>
            {t("autoArrange.warningDescription")}
          </AlertDescription>
        </Alert>

        {/* Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-3">
          <h4 className="font-medium">{t("autoArrange.summary")}</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("autoArrange.guestsToSeat")}:</span>
              <span className="font-medium">{previewStats.totalGuests} ({previewStats.totalSeats} {t("autoArrange.seats")})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("autoArrange.tablesToCreate")}:</span>
              <span className="font-medium">{previewStats.totalConfiguredTables}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("autoArrange.totalCapacity")}:</span>
              <span className={cn(
                "font-medium",
                !previewStats.hasEnoughSeats && "text-destructive"
              )}>
                {previewStats.totalConfiguredSeats}
              </span>
            </div>
          </div>

          {/* Table breakdown */}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground mb-2">{t("autoArrange.tableBreakdown")}:</p>
            <div className="space-y-1">
              {tableConfigs.map((config, idx) => (
                <div key={config.id} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center text-primary">
                    {config.count}
                  </span>
                  <span>x {t(`shapes.${config.shape}`)} ({config.capacity} {t("autoArrange.seats")})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render current step content
  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  }

  // Determine if next button should be disabled
  const isNextDisabled = useMemo(() => {
    if (currentStep === 1) {
      return previewStats.totalGuests === 0;
    }
    if (currentStep === 2) {
      return !previewStats.hasEnoughSeats || tableConfigs.length === 0;
    }
    return false;
  }, [currentStep, previewStats, tableConfigs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("autoArrange.title")}</DialogTitle>
          <DialogDescription>
            {t("autoArrange.stepperDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          renderStepContent()
        )}

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:border-0 sm:pt-0">
          <div className="flex w-full justify-between">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={goToPrevStep}>
                  <Icons.chevronRight className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2 rotate-180")} />
                  {tc("back")}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              {currentStep < totalSteps ? (
                <Button onClick={goToNextStep} disabled={isNextDisabled}>
                  {tc("next")}
                  <Icons.chevronRight className={cn("h-4 w-4", isRTL ? "me-2 rotate-180" : "ms-2")} />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isProcessing || !previewStats.hasEnoughSeats}
                  variant="destructive"
                >
                  {isProcessing && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                  {t("autoArrange.create")}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
