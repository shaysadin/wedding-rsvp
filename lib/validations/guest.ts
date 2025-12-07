import { z } from "zod";

export const createGuestSchema = z.object({
  weddingEventId: z.string(),
  name: z.string().min(1, "Guest name is required").max(255),
  phoneNumber: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  side: z.string().max(100).optional(),
  groupName: z.string().max(100).optional(),
  expectedGuests: z.number().int().min(1).max(20).optional().default(1),
  notes: z.string().max(1000).optional(),
});

export const updateGuestSchema = createGuestSchema.partial().extend({
  id: z.string(),
});

export const bulkImportGuestSchema = z.object({
  weddingEventId: z.string(),
  guests: z.array(
    z.object({
      name: z.string().min(1),
      phoneNumber: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      side: z.string().max(100).optional(),
      groupName: z.string().optional(),
      expectedGuests: z.number().int().min(1).max(20).optional().default(1),
      notes: z.string().optional(),
    })
  ),
});

// Use z.input for form input types (before defaults are applied)
// Use z.infer for output types (after validation and defaults)
export type CreateGuestInput = z.input<typeof createGuestSchema>;
export type CreateGuestOutput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.input<typeof updateGuestSchema>;
export type BulkImportGuestInput = z.input<typeof bulkImportGuestSchema>;
