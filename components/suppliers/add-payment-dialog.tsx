"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PaymentMethod } from "@prisma/client";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { addSupplierPayment, updateSupplierPayment } from "@/actions/suppliers";
import {
  createPaymentSchema,
  type CreatePaymentInput,
} from "@/lib/validations/supplier";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const paymentMethodConfig: Record<PaymentMethod, { label: string; labelHe: string }> = {
  CASH: { label: "Cash", labelHe: "מזומן" },
  CREDIT_CARD: { label: "Credit Card", labelHe: "כרטיס אשראי" },
  BANK_TRANSFER: { label: "Bank Transfer", labelHe: "העברה בנקאית" },
  CHECK: { label: "Check", labelHe: "צ'ק" },
  OTHER: { label: "Other", labelHe: "אחר" },
};

interface PaymentData {
  id: string;
  amount: number;
  method: PaymentMethod;
  description: string | null;
  paidAt: Date;
  dueDate: Date | null;
  receiptUrl: string | null;
  notes: string | null;
}

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
  currency: string;
  payment?: PaymentData | null;
  onSuccess?: () => void;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  currency,
  payment,
  onSuccess,
}: AddPaymentDialogProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const isEditing = !!payment;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      supplierId,
      amount: 0,
      method: "BANK_TRANSFER",
      description: "",
      paidAt: new Date(),
      dueDate: undefined,
      receiptUrl: "",
      notes: "",
    },
  });

  // Reset form when dialog opens or payment changes
  useEffect(() => {
    if (open) {
      if (payment) {
        form.reset({
          supplierId,
          amount: payment.amount,
          method: payment.method,
          description: payment.description || "",
          paidAt: new Date(payment.paidAt),
          dueDate: payment.dueDate ? new Date(payment.dueDate) : undefined,
          receiptUrl: payment.receiptUrl || "",
          notes: payment.notes || "",
        });
      } else {
        form.reset({
          supplierId,
          amount: 0,
          method: "BANK_TRANSFER",
          description: "",
          paidAt: new Date(),
          dueDate: undefined,
          receiptUrl: "",
          notes: "",
        });
      }
    }
  }, [open, payment, supplierId, form]);

  const formatCurrency = (symbol: string) => {
    switch (symbol) {
      case "ILS":
        return "₪";
      case "USD":
        return "$";
      case "EUR":
        return "€";
      default:
        return symbol;
    }
  };

  const onSubmit = async (data: CreatePaymentInput) => {
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateSupplierPayment({ id: payment.id, ...data })
        : await addSupplierPayment(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEditing
          ? isRTL
            ? "התשלום עודכן בהצלחה"
            : "Payment updated successfully"
          : isRTL
            ? "התשלום נרשם בהצלחה"
            : "Payment recorded successfully"
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isRTL ? "שגיאה בשמירת התשלום" : "Error saving payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn(isRTL && "text-right")}>
            {isEditing
              ? isRTL
                ? "עריכת תשלום"
                : "Edit Payment"
              : isRTL
                ? "רישום תשלום"
                : "Record Payment"}
          </DialogTitle>
          <p className={cn("text-sm text-muted-foreground", isRTL && "text-right")}>
            {supplierName}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(isRTL && "text-right block")}>
                    {isRTL ? "סכום *" : "Amount *"} ({formatCurrency(currency)})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(isRTL && "text-right block")}>
                    {isRTL ? "אמצעי תשלום" : "Payment Method"}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={cn(isRTL && "text-right")}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(paymentMethodConfig).map(([value, config]) => (
                        <SelectItem
                          key={value}
                          value={value}
                          className={cn(isRTL && "text-right")}
                        >
                          {isRTL ? config.labelHe : config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(isRTL && "text-right block")}>
                    {isRTL ? "תיאור" : "Description"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={isRTL ? "לדוגמה: מקדמה, תשלום סופי" : "e.g., Deposit, Final payment"}
                      className={cn(isRTL && "text-right")}
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(isRTL && "text-right block")}>
                      {isRTL ? "תאריך תשלום *" : "Payment Date *"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined
                          )
                        }
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(isRTL && "text-right block")}>
                      {isRTL ? "תאריך יעד" : "Due Date"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined
                          )
                        }
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt URL */}
            <FormField
              control={form.control}
              name="receiptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(isRTL && "text-right block")}>
                    {isRTL ? "קישור לקבלה" : "Receipt URL"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(isRTL && "text-right block")}>
                    {isRTL ? "הערות" : "Notes"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={isRTL ? "הערות נוספות..." : "Additional notes..."}
                      className={cn("resize-none", isRTL && "text-right")}
                      dir={isRTL ? "rtl" : "ltr"}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className={cn("flex gap-3 pt-4", isRTL && "flex-row-reverse")}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {isRTL ? "ביטול" : "Cancel"}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEditing
                  ? isRTL
                    ? "עדכון"
                    : "Update"
                  : isRTL
                    ? "רשום תשלום"
                    : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
