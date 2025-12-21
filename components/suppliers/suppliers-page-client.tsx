"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Store, ChevronDown, Check, Loader2, Plus, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { getEventSuppliers, getSupplierStats, updateEventBudget } from "@/actions/suppliers";
import type { SuppliersEventData } from "@/actions/event-selector";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { SupplierStatsCards } from "./supplier-stats-cards";
import { BudgetCategoryChart } from "./budget-category-chart";
import { SuppliersTable } from "./suppliers-table";
import { AddSupplierDialog } from "./add-supplier-dialog";
import { SupplierDetailsDrawer } from "./supplier-details-drawer";

interface SuppliersPageClientProps {
  events: SuppliersEventData[];
  title: string;
  description: string;
  locale: string;
}

export function SuppliersPageClient({
  events,
  title,
  description,
  locale,
}: SuppliersPageClientProps) {
  const router = useRouter();
  const isRTL = locale === "he";

  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length === 1 ? events[0].id : null
  );
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [detailsSupplier, setDetailsSupplier] = useState<any>(null);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const loadSuppliers = useCallback(async () => {
    if (!selectedEventId) return;

    setLoading(true);
    try {
      const [suppliersResult, statsResult] = await Promise.all([
        getEventSuppliers(selectedEventId),
        getSupplierStats(selectedEventId),
      ]);

      if (suppliersResult.suppliers) {
        setSuppliers(suppliersResult.suppliers);
      }

      if (statsResult.stats) {
        setStats(statsResult.stats);
        setCategoryData(statsResult.stats.byCategory || []);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setEventSelectorOpen(false);
  };

  const handleEditSupplier = (supplier: any) => {
    setEditSupplier(supplier);
    setAddDialogOpen(true);
  };

  const handleViewDetails = (supplier: any) => {
    setDetailsSupplier(supplier);
  };

  const handleSaveBudget = async () => {
    if (!selectedEventId) return;

    setSavingBudget(true);
    try {
      const budget = budgetValue ? parseFloat(budgetValue) : undefined;
      await updateEventBudget({ eventId: selectedEventId, totalBudget: budget });
      loadSuppliers();
      setBudgetDialogOpen(false);
    } catch (error) {
      console.error("Error saving budget:", error);
    } finally {
      setSavingBudget(false);
    }
  };

  // No events - show create event prompt
  if (events.length === 0) {
    return (
      <EmptyPlaceholder className="min-h-[400px]">
        <EmptyPlaceholder.Icon name="calendar" />
        <EmptyPlaceholder.Title>
          {isRTL ? "אין אירועים" : "No Events"}
        </EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {isRTL
            ? "צרו אירוע כדי להתחיל לנהל ספקים"
            : "Create an event to start managing suppliers"}
        </EmptyPlaceholder.Description>
        <Button onClick={() => router.push(`/${locale}/dashboard/events`)}>
          <Icons.add className="me-2 h-4 w-4" />
          {isRTL ? "צור אירוע" : "Create Event"}
        </Button>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", isRTL && "sm:flex-row-reverse")}>
        <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Store className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className={cn(isRTL && "text-right")}>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Event Selector */}
        {events.length > 1 && (
          <Popover open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={eventSelectorOpen}
                className="w-full sm:w-[240px] justify-between"
              >
                {selectedEvent?.title || (isRTL ? "בחר אירוע" : "Select event")}
                <ChevronDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder={isRTL ? "חפש אירוע..." : "Search event..."} />
                <CommandList>
                  <CommandEmpty>{isRTL ? "לא נמצאו אירועים" : "No events found"}</CommandEmpty>
                  <CommandGroup>
                    {events.map((event) => (
                      <CommandItem
                        key={event.id}
                        value={event.title}
                        onSelect={() => handleSelectEvent(event.id)}
                      >
                        <Check
                          className={cn(
                            "me-2 h-4 w-4",
                            selectedEventId === event.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{event.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {event.supplierStats.supplierCount} {isRTL ? "ספקים" : "suppliers"}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* No event selected */}
      {!selectedEventId && events.length > 1 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            {isRTL ? "בחרו אירוע" : "Select an Event"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRTL
              ? "בחרו אירוע מהרשימה למעלה כדי לראות ולנהל את הספקים שלו"
              : "Select an event from the list above to view and manage its suppliers"}
          </p>
        </div>
      )}

      {/* Loading */}
      {selectedEventId && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Suppliers Content */}
      {selectedEventId && !loading && stats && (
        <>
          {/* Stats Cards */}
          <SupplierStatsCards stats={stats} currency="ILS" />

          {/* Actions Row */}
          <div className={cn("flex flex-wrap items-center gap-3", isRTL && "flex-row-reverse")}>
            <Button onClick={() => {
              setEditSupplier(null);
              setAddDialogOpen(true);
            }}>
              <Plus className="me-2 h-4 w-4" />
              {isRTL ? "הוסף ספק" : "Add Supplier"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBudgetValue(stats.totalBudget?.toString() || "");
                setBudgetDialogOpen(true);
              }}
            >
              <Settings className="me-2 h-4 w-4" />
              {isRTL ? "הגדר תקציב" : "Set Budget"}
            </Button>
          </div>

          {/* Chart and Table Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <div className="lg:col-span-1">
              <BudgetCategoryChart data={categoryData} currency="ILS" />
            </div>

            {/* Table */}
            <div className="lg:col-span-2">
              <SuppliersTable
                suppliers={suppliers}
                currency="ILS"
                onEdit={handleEditSupplier}
                onViewDetails={handleViewDetails}
              />
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Supplier Dialog */}
      <AddSupplierDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditSupplier(null);
        }}
        eventId={selectedEventId || ""}
        supplier={editSupplier}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditSupplier(null);
          loadSuppliers();
        }}
      />

      {/* Supplier Details Drawer */}
      <SupplierDetailsDrawer
        open={!!detailsSupplier}
        onOpenChange={(open) => !open && setDetailsSupplier(null)}
        supplier={detailsSupplier}
        eventId={selectedEventId || ""}
        onRefresh={loadSuppliers}
      />

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={cn(isRTL && "text-right")}>
              {isRTL ? "הגדרת תקציב" : "Set Budget"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className={cn("text-sm text-muted-foreground", isRTL && "text-right")}>
              {isRTL
                ? "הגדירו את התקציב הכולל לאירוע כדי לעקוב אחר ההוצאות"
                : "Set the total budget for the event to track expenses"}
            </p>
            <div className="space-y-2">
              <label className={cn("text-sm font-medium", isRTL && "block text-right")}>
                {isRTL ? "תקציב כולל" : "Total Budget"} (ILS)
              </label>
              <Input
                type="number"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                placeholder="0"
                min={0}
                dir="ltr"
              />
              {budgetValue && (
                <p className={cn("text-xs text-muted-foreground", isRTL && "text-right")}>
                  {formatCurrency(parseFloat(budgetValue) || 0)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleSaveBudget} disabled={savingBudget}>
              {savingBudget && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isRTL ? "שמור" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
