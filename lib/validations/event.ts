import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(255),
  description: z.string().max(1000).optional(),
  dateTime: z.string().or(z.date()),
  location: z.string().min(1, "Location is required").max(500),
  venue: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  invitationImageBase64: z.string().optional(), // Base64 image data for invitation
  workspaceId: z.string().optional(), // Optional workspace assignment
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
