import { z } from "zod";
import { SupplierCategory, SupplierStatus, PaymentMethod } from "@prisma/client";

// ============ Supplier Schemas ============

export const createSupplierSchema = z.object({
  weddingEventId: z.string(),
  name: z.string().min(1, "Supplier name is required").max(255),
  category: z.nativeEnum(SupplierCategory),
  status: z.nativeEnum(SupplierStatus).optional().default("INQUIRY"),

  // Contact
  contactName: z.string().max(255).optional(),
  phoneNumber: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),

  // Financial
  estimatedCost: z.number().min(0).optional(),
  agreedPrice: z.number().min(0).optional(),
  currency: z.string().max(10).optional().default("ILS"),

  // Details
  notes: z.string().max(2000).optional(),
  contractUrl: z.string().url().optional().or(z.literal("")),

  // Dates
  bookedAt: z.date().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  id: z.string(),
});

// ============ Payment Schemas ============

export const createPaymentSchema = z.object({
  supplierId: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.nativeEnum(PaymentMethod).optional().default("BANK_TRANSFER"),
  description: z.string().max(500).optional(),
  paidAt: z.date(),
  dueDate: z.date().optional(),
  receiptUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: z.string(),
});

// ============ Budget Schema ============

export const updateBudgetSchema = z.object({
  eventId: z.string(),
  totalBudget: z.number().min(0).optional(),
});

// ============ Types ============

export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type CreateSupplierOutput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.input<typeof updateSupplierSchema>;

export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type CreatePaymentOutput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.input<typeof updatePaymentSchema>;

export type UpdateBudgetInput = z.input<typeof updateBudgetSchema>;
