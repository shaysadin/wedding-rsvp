"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, ArrowLeft, Wallet } from "lucide-react";

import { getEventSuppliers, getSupplierStats, updateEventBudget } from "@/actions/suppliers";
import { DashboardHeader } from "@/components/dashboard/header";
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

interface SupplierStats {
  totalBudget: number;
  totalAgreed: number;
  totalPaid: number;
  remainingBudget: number;
  remainingPayments: number;
  supplierCount: number;
  overdueCount: number;
  // Guest statistics
  totalInvited?: number;
  approvedGuestCount?: number;
  acceptedInvitations?: number;
  declinedCount?: number;
  pendingCount?: number;
  // Cost per guest metrics
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

interface SuppliersPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function SuppliersPage({ params }: SuppliersPageProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [eventId, setEventId] = useState<string | null>(null);
  const [resolvedLocale, setResolvedLocale] = useState<string>("en");
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

  // Resolve params on mount
  useEffect(() => {
    params.then((p) => {
      setEventId(p.eventId);
      setResolvedLocale(p.locale);
    });
  }, [params]);

  const loadData = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    try {
      const [suppliersResult, statsResult] = await Promise.all([
        getEventSuppliers(eventId),
        getSupplierStats(eventId),
      ]);

      if (suppliersResult.error) {
        toast.error(suppliersResult.error);
      } else if (suppliersResult.suppliers) {
        // Convert Decimal to number for client-side usage
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

  // Load data when eventId is available
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, loadData]);

  const handleSaveBudget = async () => {
    if (!eventId) return;

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

  if (!eventId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "ניהול ספקים" : "Suppliers"}
        text={isRTL ? "נהלו את הספקים, התקציב והתשלומים" : "Manage suppliers, budget and payments"}
      >
        <div className={cn("flex flex-row flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          <Button variant="outline" asChild>
            <Link href={`/${resolvedLocale}/dashboard/events/${eventId}`}>
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              {isRTL ? "חזרה" : "Back"}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setBudgetDialogOpen(true)}>
            <Wallet className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? "הגדר תקציב" : "Set Budget"}
          </Button>
          <Button onClick={() => setAddSupplierOpen(true)}>
            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? "הוסף ספק" : "Add Supplier"}
          </Button>
        </div>
      </DashboardHeader>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 overflow-auto">
          {/* Stats and Chart Row */}
          {stats && (
            <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
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

          {/* Mobile Chart */}
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

          {/* Suppliers Table */}
          <SuppliersTable
            suppliers={suppliers}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
          />
        </div>
      )}

      {/* Add/Edit Supplier Dialog */}
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

      {/* Supplier Details Drawer */}
      <SupplierDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        supplier={selectedSupplier}
        eventId={eventId}
        onRefresh={loadData}
      />

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn(isRTL && "text-right")}>
              {isRTL ? "הגדרת תקציב" : "Set Budget"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>
                {isRTL ? "תקציב כולל (₪)" : "Total Budget (₪)"}
              </Label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
              <p className={cn("text-xs text-muted-foreground", isRTL && "text-right")}>
                {isRTL
                  ? "הזינו את התקציב הכולל לאירוע"
                  : "Enter your total event budget"}
              </p>
            </div>
          </div>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button
              variant="outline"
              onClick={() => setBudgetDialogOpen(false)}
              disabled={savingBudget}
            >
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleSaveBudget} disabled={savingBudget}>
              {savingBudget && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isRTL ? "שמור" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFadeIn>
  );
}
