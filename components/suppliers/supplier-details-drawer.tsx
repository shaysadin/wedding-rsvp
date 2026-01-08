"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { SupplierCategory, SupplierStatus, PaymentMethod } from "@prisma/client";
import {
  X,
  Edit,
  Trash2,
  Plus,
  Phone,
  Mail,
  Globe,
  FileText,
  Calendar,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  MoreVertical,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteSupplier, deleteSupplierPayment } from "@/actions/suppliers";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupplierCategoryBadge } from "./supplier-category-badge";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { AddSupplierDialog } from "./add-supplier-dialog";
import { AddPaymentDialog } from "./add-payment-dialog";

const paymentMethodLabels: Record<PaymentMethod, { en: string; he: string }> = {
  CASH: { en: "Cash", he: "מזומן" },
  CREDIT_CARD: { en: "Credit Card", he: "כרטיס אשראי" },
  BANK_TRANSFER: { en: "Bank Transfer", he: "העברה בנקאית" },
  CHECK: { en: "Check", he: "צ'ק" },
  OTHER: { en: "Other", he: "אחר" },
};

interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  description: string | null;
  paidAt: Date;
  dueDate: Date | null;
  receiptUrl: string | null;
  notes: string | null;
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

interface SupplierDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierData | null;
  eventId: string;
  onRefresh?: () => void;
}

export function SupplierDetailsDrawer({
  open,
  onOpenChange,
  supplier,
  eventId,
  onRefresh,
}: SupplierDetailsDrawerProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const dateLocale = locale === "he" ? he : enUS;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  if (!supplier) return null;

  const totalPaid = supplier.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const agreedPrice = supplier.agreedPrice ? Number(supplier.agreedPrice) : 0;
  const remaining = agreedPrice - totalPaid;
  const paidPercent = agreedPrice > 0 ? (totalPaid / agreedPrice) * 100 : 0;

  const now = new Date();
  const overduePayments = supplier.payments.filter(
    (p) => p.dueDate && new Date(p.dueDate) < now
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency: supplier.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd MMM yyyy", { locale: dateLocale });
  };

  const handleDeleteSupplier = async () => {
    if (
      !confirm(
        isRTL
          ? `האם למחוק את הספק "${supplier.name}"? כל התשלומים יימחקו גם כן.`
          : `Delete supplier "${supplier.name}"? All payments will also be deleted.`
      )
    )
      return;

    setDeleting(true);
    const result = await deleteSupplier(supplier.id);
    setDeleting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isRTL ? "הספק נמחק בהצלחה" : "Supplier deleted successfully");
      onOpenChange(false);
      onRefresh?.();
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (
      !confirm(isRTL ? "האם למחוק את התשלום?" : "Delete this payment?")
    )
      return;

    setDeletingPaymentId(paymentId);
    const result = await deleteSupplierPayment(paymentId);
    setDeletingPaymentId(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isRTL ? "התשלום נמחק" : "Payment deleted");
      onRefresh?.();
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handlePaymentDialogClose = (open: boolean) => {
    setPaymentDialogOpen(open);
    if (!open) {
      setEditingPayment(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isRTL ? "left" : "right"}
          className="w-full sm:max-w-lg p-0"
        >
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1 text-start">
                <SheetTitle className="text-xl">{supplier.name}</SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <SupplierCategoryBadge
                    category={supplier.category}
                    locale={locale}
                  />
                  <SupplierStatusBadge status={supplier.status} locale={locale} />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              {(supplier.contactName ||
                supplier.phoneNumber ||
                supplier.email ||
                supplier.website) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground text-start">
                    {isRTL ? "פרטי התקשרות" : "Contact"}
                  </h4>
                  <div className="space-y-2">
                    {supplier.contactName && (
                      <p className="text-sm text-start">
                        {supplier.contactName}
                      </p>
                    )}
                    {supplier.phoneNumber && (
                      <a
                        href={`tel:${supplier.phoneNumber}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span dir="ltr">{supplier.phoneNumber}</span>
                      </a>
                    )}
                    {supplier.email && (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        <span>{supplier.email}</span>
                      </a>
                    )}
                    {supplier.website && (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="truncate">{supplier.website}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Financial Summary */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground text-start">
                  {isRTL ? "סיכום כספי" : "Financial Summary"}
                </h4>

                {agreedPrice > 0 ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{isRTL ? "מחיר סגור" : "Agreed Price"}</span>
                        <span className="font-medium">{formatCurrency(agreedPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{isRTL ? "שולם" : "Paid"}</span>
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(totalPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{isRTL ? "נותר" : "Remaining"}</span>
                        <span className={cn("font-medium", remaining > 0 && "text-amber-600")}>
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Progress value={paidPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground text-start">
                        {Math.round(paidPercent)}% {isRTL ? "שולם" : "paid"}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isRTL
                        ? "טרם הוגדר מחיר סגור"
                        : "No agreed price set yet"}
                    </p>
                  </div>
                )}

                {supplier.estimatedCost && (
                  <p className="text-xs text-muted-foreground text-start">
                    {isRTL ? "עלות משוערת" : "Estimated"}: {formatCurrency(Number(supplier.estimatedCost))}
                  </p>
                )}
              </div>

              <Separator />

              {/* Payments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {isRTL ? "תשלומים" : "Payments"} ({supplier.payments.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 me-1" />
                    {isRTL ? "הוסף" : "Add"}
                  </Button>
                </div>

                {overduePayments.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {overduePayments.length} {isRTL ? "תשלומים באיחור" : "overdue payments"}
                    </span>
                  </div>
                )}

                {supplier.payments.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? "אין תשלומים רשומים" : "No payments recorded"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplier.payments
                      .sort(
                        (a, b) =>
                          new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
                      )
                      .map((payment) => {
                        const isOverdue =
                          payment.dueDate && new Date(payment.dueDate) < now;

                        return (
                          <div
                            key={payment.id}
                            className={cn(
                              "rounded-lg border p-3 space-y-2",
                              isOverdue && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 text-start">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatCurrency(Number(payment.amount))}
                                  </span>
                                  {isOverdue && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </div>
                                {payment.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {payment.description}
                                  </p>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={deletingPaymentId === payment.id}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                  <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                    <Edit className="me-2 h-4 w-4" />
                                    {isRTL ? "עריכה" : "Edit"}
                                  </DropdownMenuItem>
                                  {payment.receiptUrl && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.open(payment.receiptUrl!, "_blank")
                                      }
                                    >
                                      <ExternalLink className="me-2 h-4 w-4" />
                                      {isRTL ? "צפה בקבלה" : "View Receipt"}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="me-2 h-4 w-4" />
                                    {isRTL ? "מחק" : "Delete"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(payment.paidAt)}
                              </span>
                              <span>
                                {isRTL
                                  ? paymentMethodLabels[payment.method].he
                                  : paymentMethodLabels[payment.method].en}
                              </span>
                              {payment.dueDate && (
                                <span className={cn(isOverdue && "text-amber-600 dark:text-amber-400")}>
                                  {isRTL ? "תאריך יעד" : "Due"}: {formatDate(payment.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Contract & Dates */}
              {(supplier.contractUrl || supplier.bookedAt) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground text-start">
                      {isRTL ? "מסמכים ותאריכים" : "Documents & Dates"}
                    </h4>
                    <div className="space-y-2">
                      {supplier.bookedAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {isRTL ? "הוזמן" : "Booked"}: {formatDate(supplier.bookedAt)}
                          </span>
                        </div>
                      )}
                      {supplier.contractUrl && (
                        <a
                          href={supplier.contractUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          <span>{isRTL ? "צפה בחוזה" : "View Contract"}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {supplier.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground text-start">
                      {isRTL ? "הערות" : "Notes"}
                    </h4>
                    <p className="text-sm whitespace-pre-wrap text-start">
                      {supplier.notes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="absolute bottom-0 inset-inline-0 border-t bg-background p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="me-2 h-4 w-4" />
                {isRTL ? "עריכה" : "Edit"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSupplier}
                disabled={deleting}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {isRTL ? "מחק" : "Delete"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Supplier Dialog */}
      <AddSupplierDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        eventId={eventId}
        supplier={supplier}
        onSuccess={() => {
          setEditDialogOpen(false);
          onRefresh?.();
        }}
      />

      {/* Add/Edit Payment Dialog */}
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={handlePaymentDialogClose}
        supplierId={supplier.id}
        supplierName={supplier.name}
        currency={supplier.currency}
        payment={editingPayment}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          setEditingPayment(null);
          onRefresh?.();
        }}
      />
    </>
  );
}
