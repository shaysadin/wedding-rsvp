"use client";

import { useState, useMemo } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { SupplierCategory, SupplierStatus } from "@prisma/client";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  ExternalLink,
  Phone,
  Mail,
  AlertTriangle,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteSupplier } from "@/actions/suppliers";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SupplierCategoryBadge, getCategoryOptions } from "./supplier-category-badge";
import { SupplierStatusBadge, getStatusOptions } from "./supplier-status-badge";

interface Payment {
  id: string;
  amount: number;
  paidAt: Date;
  dueDate: Date | null;
}

interface SupplierData {
  id: string;
  name: string;
  category: SupplierCategory;
  status: SupplierStatus;
  contactName: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  estimatedCost: number | null;
  agreedPrice: number | null;
  currency: string;
  notes: string | null;
  contractUrl: string | null;
  bookedAt: Date | null;
  payments: Payment[];
}

interface SuppliersTableProps {
  suppliers: SupplierData[];
  currency?: string;
  onEdit: (supplier: SupplierData) => void;
  onViewDetails: (supplier: SupplierData) => void;
}

export function SuppliersTable({
  suppliers,
  currency = "ILS",
  onEdit,
  onViewDetails,
}: SuppliersTableProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const categoryOptions = getCategoryOptions(locale);
  const statusOptions = getStatusOptions(locale);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals and overdue status for each supplier
  const suppliersWithCalcs = useMemo(() => {
    const now = new Date();
    return suppliers.map((supplier) => {
      const totalPaid = supplier.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const agreedPrice = supplier.agreedPrice ? Number(supplier.agreedPrice) : 0;
      const remaining = agreedPrice - totalPaid;
      const paidPercent = agreedPrice > 0 ? (totalPaid / agreedPrice) * 100 : 0;

      // Check if any payment is overdue
      const hasOverdue = supplier.payments.some(
        (p) => p.dueDate && new Date(p.dueDate) < now
      );

      return {
        ...supplier,
        totalPaid,
        remaining,
        paidPercent,
        hasOverdue,
      };
    });
  }, [suppliers]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliersWithCalcs;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.contactName?.toLowerCase().includes(query) ||
          s.phoneNumber?.includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    return filtered;
  }, [suppliersWithCalcs, searchQuery, categoryFilter, statusFilter]);

  const handleDelete = async (supplierId: string, supplierName: string) => {
    if (
      !confirm(
        isRTL
          ? `האם למחוק את הספק "${supplierName}"?`
          : `Delete supplier "${supplierName}"?`
      )
    )
      return;

    setLoading(supplierId);
    const result = await deleteSupplier(supplierId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isRTL ? "הספק נמחק בהצלחה" : "Supplier deleted successfully");
    }
  };

  if (suppliers.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="package" />
        <EmptyPlaceholder.Title>
          {isRTL ? "אין ספקים" : "No suppliers"}
        </EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {isRTL
            ? "הוסיפו ספקים כדי לנהל את התקציב והתשלומים"
            : "Add suppliers to manage your budget and payments"}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  // Table content component to avoid duplication
  const tableContent = (inModal = false) => (
    <div className="rounded-lg border overflow-auto" dir={isRTL ? "rtl" : "ltr"}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-start">
              {isRTL ? "שם" : "Name"}
            </TableHead>
            <TableHead className="text-start">
              {isRTL ? "קטגוריה" : "Category"}
            </TableHead>
            <TableHead className="text-start">
              {isRTL ? "סטטוס" : "Status"}
            </TableHead>
            <TableHead className="text-center">
              {isRTL ? "מחיר סגור" : "Agreed Price"}
            </TableHead>
            <TableHead className="text-start">
              {isRTL ? "התקדמות תשלום" : "Payment Progress"}
            </TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSuppliers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {isRTL ? "לא נמצאו תוצאות" : "No results found"}
              </TableCell>
            </TableRow>
          ) : (
            filteredSuppliers.map((supplier) => (
              <TableRow
                key={supplier.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewDetails(supplier)}
              >
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{supplier.name}</span>
                      {supplier.hasOverdue && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    {supplier.contactName && (
                      <span className="text-xs text-muted-foreground">
                        {supplier.contactName}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <SupplierCategoryBadge
                    category={supplier.category}
                    locale={locale}
                    showIcon
                  />
                </TableCell>
                <TableCell>
                  <SupplierStatusBadge status={supplier.status} locale={locale} />
                </TableCell>
                <TableCell className="text-center">
                  {supplier.agreedPrice ? (
                    <span className="font-medium">
                      {formatCurrency(Number(supplier.agreedPrice))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {supplier.agreedPrice ? (
                    <div className="flex items-center gap-2">
                      <Progress value={supplier.paidPercent} className="h-2 w-16 sm:w-24 shrink-0" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatCurrency(supplier.totalPaid)} / {formatCurrency(Number(supplier.agreedPrice))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading === supplier.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? "start" : "end"} className="text-start">
                        <DropdownMenuLabel className="text-start">
                          {isRTL ? "פעולות" : "Actions"}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => onViewDetails(supplier)}>
                          <ChevronRight className="h-4 w-4 me-2 rtl:rotate-180" />
                          {isRTL ? "פרטים" : "View Details"}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onEdit(supplier)}>
                          <Edit className="h-4 w-4 me-2" />
                          {isRTL ? "עריכה" : "Edit"}
                        </DropdownMenuItem>

                        {supplier.phoneNumber && (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`tel:${supplier.phoneNumber}`, "_self")
                            }
                          >
                            <Phone className="h-4 w-4 me-2" />
                            {isRTL ? "התקשר" : "Call"}
                          </DropdownMenuItem>
                        )}

                        {supplier.email && (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`mailto:${supplier.email}`, "_blank")
                            }
                          >
                            <Mail className="h-4 w-4 me-2" />
                            {isRTL ? "שלח מייל" : "Send Email"}
                          </DropdownMenuItem>
                        )}

                        {supplier.website && (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(supplier.website!, "_blank")
                            }
                          >
                            <ExternalLink className="h-4 w-4 me-2" />
                            {isRTL ? "אתר" : "Website"}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 me-2" />
                          {isRTL ? "מחק" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
    <div className="relative flex flex-col gap-4">
      {/* Expand Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute end-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted"
        onClick={() => setIsTableExpanded(true)}
        title={isRTL ? "הרחב" : "Expand"}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isRTL ? "חיפוש ספקים..." : "Search suppliers..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>

        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
              <SelectValue placeholder={isRTL ? "קטגוריה" : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "כל הקטגוריות" : "All Categories"}</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none">
              <SelectValue placeholder={isRTL ? "סטטוס" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "כל הסטטוסים" : "All Statuses"}</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {tableContent()}
    </div>

    {/* Expanded Modal */}
    <Dialog open={isTableExpanded} onOpenChange={setIsTableExpanded}>
      <DialogContent size="full" className="flex h-[90vh] max-h-[90vh] flex-col gap-0 [&>div]:p-0" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
          <DialogTitle>{isRTL ? "ספקים" : "Suppliers"}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsTableExpanded(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
          {/* Search and Filters in Modal */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "חיפוש ספקים..." : "Search suppliers..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
                  <SelectValue placeholder={isRTL ? "קטגוריה" : "Category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "כל הקטגוריות" : "All Categories"}</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none">
                  <SelectValue placeholder={isRTL ? "סטטוס" : "Status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "כל הסטטוסים" : "All Statuses"}</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table in Modal */}
          {tableContent(true)}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
