"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SupplierCategory, SupplierStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupplier, updateSupplier } from "@/actions/suppliers";
import {
  createSupplierSchema,
  type CreateSupplierInput,
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
import { getCategoryOptions } from "./supplier-category-badge";
import { getStatusOptions } from "./supplier-status-badge";

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
}

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  supplier?: SupplierData | null;
  onSuccess?: () => void;
}

export function AddSupplierDialog({
  open,
  onOpenChange,
  eventId,
  supplier,
  onSuccess,
}: AddSupplierDialogProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const isEditing = !!supplier;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = getCategoryOptions(locale);
  const statusOptions = getStatusOptions(locale);

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      weddingEventId: eventId,
      name: "",
      category: "OTHER",
      status: "INQUIRY",
      contactName: "",
      phoneNumber: "",
      email: "",
      website: "",
      estimatedCost: undefined,
      agreedPrice: undefined,
      currency: "ILS",
      notes: "",
      contractUrl: "",
      bookedAt: undefined,
    },
  });

  // Reset form when dialog opens or supplier changes
  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          weddingEventId: eventId,
          name: supplier.name,
          category: supplier.category,
          status: supplier.status,
          contactName: supplier.contactName || "",
          phoneNumber: supplier.phoneNumber || "",
          email: supplier.email || "",
          website: supplier.website || "",
          estimatedCost: supplier.estimatedCost || undefined,
          agreedPrice: supplier.agreedPrice || undefined,
          currency: supplier.currency,
          notes: supplier.notes || "",
          contractUrl: supplier.contractUrl || "",
          bookedAt: supplier.bookedAt || undefined,
        });
      } else {
        form.reset({
          weddingEventId: eventId,
          name: "",
          category: "OTHER",
          status: "INQUIRY",
          contactName: "",
          phoneNumber: "",
          email: "",
          website: "",
          estimatedCost: undefined,
          agreedPrice: undefined,
          currency: "ILS",
          notes: "",
          contractUrl: "",
          bookedAt: undefined,
        });
      }
    }
  }, [open, supplier, eventId, form]);

  const onSubmit = async (data: CreateSupplierInput) => {
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateSupplier({ id: supplier.id, ...data })
        : await createSupplier(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEditing
          ? isRTL
            ? "הספק עודכן בהצלחה"
            : "Supplier updated successfully"
          : isRTL
            ? "הספק נוסף בהצלחה"
            : "Supplier added successfully"
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isRTL ? "שגיאה בשמירת הספק" : "Error saving supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">
            {isEditing
              ? isRTL
                ? "עריכת ספק"
                : "Edit Supplier"
              : isRTL
                ? "הוספת ספק"
                : "Add Supplier"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-start block">
                      {isRTL ? "שם הספק *" : "Supplier Name *"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={isRTL ? "לדוגמה: אולם גן האירועים" : "e.g., Garden Event Hall"}
                        className="text-start"
                        dir={isRTL ? "rtl" : "ltr"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "קטגוריה *" : "Category *"}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-start">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-start"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "סטטוס" : "Status"}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-start">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-start"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-medium text-muted-foreground text-start">
                {isRTL ? "פרטי התקשרות" : "Contact Information"}
              </h4>

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-start block">
                      {isRTL ? "איש קשר" : "Contact Name"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={isRTL ? "שם איש הקשר" : "Contact person name"}
                        className="text-start"
                        dir={isRTL ? "rtl" : "ltr"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "טלפון" : "Phone"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="054-123-4567"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "אימייל" : "Email"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@example.com"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-start block">
                      {isRTL ? "אתר אינטרנט" : "Website"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Financial Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-medium text-muted-foreground text-start">
                {isRTL ? "פרטים כספיים" : "Financial Details"}
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "עלות משוערת" : "Estimated"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : undefined
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
                  name="agreedPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "מחיר סוגר" : "Agreed Price"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : undefined
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-start block">
                        {isRTL ? "מטבע" : "Currency"}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ILS">₪ ILS</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                          <SelectItem value="EUR">€ EUR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bookedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-start block">
                      {isRTL ? "תאריך הזמנה" : "Booking Date"}
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
                name="contractUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-start block">
                      {isRTL ? "קישור לחוזה" : "Contract URL"}
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
            </div>

            {/* Notes Section */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-start block">
                    {isRTL ? "הערות" : "Notes"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={isRTL ? "הערות נוספות..." : "Additional notes..."}
                      className="resize-none text-start"
                      dir={isRTL ? "rtl" : "ltr"}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
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
                    ? "הוסף ספק"
                    : "Add Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
