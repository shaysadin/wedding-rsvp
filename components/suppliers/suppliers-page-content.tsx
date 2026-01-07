"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Wallet } from "lucide-react";

import { getEventSuppliers, getSupplierStats, updateEventBudget } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { SupplierStatsCards } from "@/components/suppliers/supplier-stats-cards";
import { BudgetCategoryChart } from "@/components/suppliers/budget-category-chart";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog";
import { SupplierDetailsDrawer } from "@/components/suppliers/supplier-details-drawer";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";

interface SupplierStats {
  totalBudget: number;
  totalAgreed: number;
  totalPaid: number;
  remainingBudget: number;
  remainingPayments: number;
  supplierCount: number;
  overdueCount: number;
  totalInvited?: number;
  approvedGuestCount?: number;
  acceptedInvitations?: number;
  declinedCount?: number;
  pendingCount?: number;
  costPerApprovedGuest?: number;
  costPerInvited?: number;
  budgetPerApprovedGuest?: number;
  budgetPerInvited?: number;
  byCategory: {
    category: string;
    count: number;
    totalAgreed: number;
    totalPaid: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];
}

interface SuppliersPageContentProps {
  eventId: string;
  events: EventOption[];
  locale: string;
}

export function SuppliersPageContent({ eventId, events, locale }: SuppliersPageContentProps) {
  const t = useTranslations("suppliers");
  const isRTL = locale === "he";

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState<string>("");
  const [savingBudget, setSavingBudget] = useState(false);

  // Drawer states
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [suppliersResult, statsResult] = await Promise.all([
        getEventSuppliers(eventId),
        getSupplierStats(eventId),
      ]);

      if (suppliersResult.error) {
        toast.error(suppliersResult.error);
      } else if (suppliersResult.suppliers) {
        const normalizedSuppliers = suppliersResult.suppliers.map((s: any) => ({
          ...s,
          estimatedCost: s.estimatedCost ? Number(s.estimatedCost) : null,
          agreedPrice: s.agreedPrice ? Number(s.agreedPrice) : null,
          payments: s.payments.map((p: any) => ({
            ...p,
            amount: Number(p.amount),
          })),
        }));
        setSuppliers(normalizedSuppliers);
      }

      if (statsResult.error) {
        toast.error(statsResult.error);
      } else if (statsResult.stats) {
        setStats(statsResult.stats);
        setBudgetAmount(statsResult.stats.totalBudget?.toString() || "");
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת הנתונים" : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, isRTL]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      const result = await updateEventBudget({
        eventId,
        totalBudget: budgetAmount ? Number(budgetAmount) : 0,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "התקציב עודכן" : "Budget updated");
        setBudgetDialogOpen(false);
        loadData();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בעדכון התקציב" : "Failed to update budget");
    } finally {
      setSavingBudget(false);
    }
  };

  const handleViewDetails = (supplier: any) => {
    setSelectedSupplier(supplier);
    setDrawerOpen(true);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setAddSupplierOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setAddSupplierOpen(open);
    if (!open) {
      setEditingSupplier(null);
    }
  };

  return (
    <PageFadeIn>
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="space-y-1 text-start">
          <h1 className="text-2xl font-bold tracking-tight">
            {isRTL ? "ניהול ספקים" : "Suppliers"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? "נהלו את הספקים, התקציב והתשלומים" : "Manage suppliers, budget and payments"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EventDropdownSelector
            events={events}
            selectedEventId={eventId}
            locale={locale}
            basePath={`/${locale}/dashboard/suppliers`}
          />
          <Button variant="outline" onClick={() => setBudgetDialogOpen(true)}>
            <Wallet className="h-4 w-4 me-2" />
            {isRTL ? "הגדר תקציב" : "Set Budget"}
          </Button>
          <Button onClick={() => setAddSupplierOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {isRTL ? "הוסף ספק" : "Add Supplier"}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {stats && (
            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,350px)] max-w-full">
              <SupplierStatsCards stats={stats} />
              <div className="hidden lg:block">
                <BudgetCategoryChart
                  data={stats.byCategory.map((c) => ({
                    category: c.category as any,
                    count: c.count,
                    totalAgreed: c.totalAgreed,
                    totalPaid: c.totalPaid,
                  }))}
                />
              </div>
            </div>
          )}

          {stats && (
            <div className="lg:hidden">
              <BudgetCategoryChart
                data={stats.byCategory.map((c) => ({
                  category: c.category as any,
                  count: c.count,
                  totalAgreed: c.totalAgreed,
                  totalPaid: c.totalPaid,
                }))}
              />
            </div>
          )}

          <SuppliersTable
            suppliers={suppliers}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
          />
        </div>
      )}

      <AddSupplierDialog
        open={addSupplierOpen}
        onOpenChange={handleDialogClose}
        eventId={eventId}
        supplier={editingSupplier}
        onSuccess={() => {
          setAddSupplierOpen(false);
          setEditingSupplier(null);
          loadData();
        }}
      />

      <SupplierDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        supplier={selectedSupplier}
        eventId={eventId}
        onRefresh={loadData}
      />

      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">
              {isRTL ? "הגדרת תקציב" : "Set Budget"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-start block">
                {isRTL ? "תקציב כולל (₪)" : "Total Budget (₪)"}
              </Label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground text-start">
                {isRTL
                  ? "הזינו את התקציב הכולל לאירוע"
                  : "Enter your total event budget"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBudgetDialogOpen(false)}
              disabled={savingBudget}
            >
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleSaveBudget} disabled={savingBudget}>
              {savingBudget && (
                <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
              )}
              {isRTL ? "שמור" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFadeIn>
  );
}
