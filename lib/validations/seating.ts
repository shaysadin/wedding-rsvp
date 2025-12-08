import { z } from "zod";

// ============ TABLE SCHEMAS ============

export const tableShapeSchema = z.enum(["round", "rectangular", "oval"]);

export const createTableSchema = z.object({
  weddingEventId: z.string().min(1, "Event ID is required"),
  name: z.string().min(1, "Table name is required").max(100, "Table name is too long"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(100, "Capacity cannot exceed 100"),
  shape: tableShapeSchema,
});

export const updateTableSchema = z.object({
  id: z.string().min(1, "Table ID is required"),
  name: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  positionX: z.number().int().optional().nullable(),
  positionY: z.number().int().optional().nullable(),
  shape: tableShapeSchema.optional(),
});

export const updateTablePositionSchema = z.object({
  id: z.string().min(1, "Table ID is required"),
  positionX: z.number().int(),
  positionY: z.number().int(),
});

// ============ ASSIGNMENT SCHEMAS ============

export const assignGuestsSchema = z.object({
  tableId: z.string().min(1, "Table ID is required"),
  guestIds: z.array(z.string()).min(1, "At least one guest is required"),
});

export const removeGuestSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
});

export const moveGuestSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  newTableId: z.string().min(1, "New table ID is required"),
});

// ============ FILTER SCHEMAS ============

export const seatingFilterSchema = z.object({
  seated: z.enum(["all", "seated", "unseated"]).optional().default("all"),
  side: z.string().optional(),
  groupName: z.string().optional(),
  rsvpStatus: z.enum(["PENDING", "ACCEPTED", "DECLINED"]).optional(),
  search: z.string().optional(),
});

// ============ TYPES ============

export type TableShape = z.infer<typeof tableShapeSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type UpdateTablePositionInput = z.infer<typeof updateTablePositionSchema>;
export type AssignGuestsInput = z.infer<typeof assignGuestsSchema>;
export type RemoveGuestInput = z.infer<typeof removeGuestSchema>;
export type MoveGuestInput = z.infer<typeof moveGuestSchema>;
export type SeatingFilter = z.infer<typeof seatingFilterSchema>;
