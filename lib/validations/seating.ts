import { z } from "zod";

// ============ SHARED SHAPE SCHEMA ============

export const shapeSchema = z.enum([
  "square",
  "circle",
  "rectangle",
  "oval",
]);

// ============ TABLE SCHEMAS ============

export const tableShapeSchema = shapeSchema;

export const seatingArrangementSchema = z.enum([
  "even",
  "bride-side",
  "sides-only",
  "custom",
]);

export const colorThemeSchema = z.enum([
  "default",
  "blue",
  "green",
  "purple",
  "pink",
  "amber",
  "rose",
]);

export const createTableSchema = z.object({
  weddingEventId: z.string().min(1, "Event ID is required"),
  name: z.string().min(1, "Table name is required").max(100, "Table name is too long"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(32, "Capacity cannot exceed 32"),
  shape: tableShapeSchema,
  seatingArrangement: seatingArrangementSchema,
  colorTheme: colorThemeSchema,
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
});

export const updateTableSchema = z.object({
  id: z.string().min(1, "Table ID is required"),
  name: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).max(32).optional(),
  positionX: z.number().int().optional().nullable(),
  positionY: z.number().int().optional().nullable(),
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
  rotation: z.number().int().min(0).max(359).optional(),
  shape: tableShapeSchema.optional(),
  seatingArrangement: seatingArrangementSchema.optional(),
  colorTheme: colorThemeSchema.optional(),
});

export const updateTablePositionSchema = z.object({
  id: z.string().min(1, "Table ID is required"),
  positionX: z.number().int(),
  positionY: z.number().int(),
});

export const updateTableSizeSchema = z.object({
  id: z.string().min(1, "Table ID is required"),
  width: z.number().int().min(40).max(400),
  height: z.number().int().min(40).max(400),
});

export const updateTableRotationSchema = z.object({
  id: z.string().min(1, "Table ID is required"),
  rotation: z.number().int().min(0).max(359),
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

// ============ VENUE BLOCK SCHEMAS ============

export const venueBlockTypeSchema = z.enum([
  "dj",
  "bar",
  "stage",
  "danceFloor",
  "entrance",
  "photoBooth",
  "buffet",
  "cake",
  "gifts",
  "other",
]);

export const venueBlockShapeSchema = shapeSchema;

export const createVenueBlockSchema = z.object({
  weddingEventId: z.string().min(1, "Event ID is required"),
  name: z.string().min(1, "Block name is required").max(100, "Block name is too long"),
  type: venueBlockTypeSchema,
  shape: venueBlockShapeSchema,
  colorTheme: colorThemeSchema.optional(),
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
});

export const updateVenueBlockSchema = z.object({
  id: z.string().min(1, "Block ID is required"),
  name: z.string().min(1).max(100).optional(),
  type: venueBlockTypeSchema.optional(),
  shape: venueBlockShapeSchema.optional(),
  colorTheme: colorThemeSchema.optional(),
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
  positionX: z.number().int().optional().nullable(),
  positionY: z.number().int().optional().nullable(),
  rotation: z.number().int().min(0).max(359).optional(),
});

export const updateVenueBlockPositionSchema = z.object({
  id: z.string().min(1, "Block ID is required"),
  positionX: z.number().int(),
  positionY: z.number().int(),
});

export const updateVenueBlockSizeSchema = z.object({
  id: z.string().min(1, "Block ID is required"),
  width: z.number().int().min(40).max(400),
  height: z.number().int().min(40).max(400),
});

export const updateVenueBlockRotationSchema = z.object({
  id: z.string().min(1, "Block ID is required"),
  rotation: z.number().int().min(0).max(359),
});

// ============ AUTO-ARRANGE SCHEMAS ============

export const autoArrangeSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  tableSize: z.number().int().min(1).max(32).default(10),
  tableShape: tableShapeSchema.default("circle"),
  seatingArrangement: seatingArrangementSchema.default("even"),
  groupingStrategy: z.enum(["side-then-group", "group-only"]).default("side-then-group"),
  sideFilter: z.string().optional(), // "all" or specific side
  groupFilter: z.string().optional(), // "all" or specific group
  includeRsvpStatus: z.array(z.enum(["ACCEPTED", "PENDING"])).default(["ACCEPTED", "PENDING"]),
});

// ============ HOSTESS SCHEMAS ============

export const markGuestArrivedSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  tableId: z.string().optional(), // Optional: assign to different table
});

export const updateGuestTableSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  tableId: z.string().min(1, "Table ID is required"),
});

// ============ SIZE PRESETS ============

export type SizePreset = "medium" | "large";

export const SIZE_PRESETS: Record<Shape, Record<SizePreset, { width: number; height: number }>> = {
  square: {
    medium: { width: 75, height: 75 },
    large: { width: 100, height: 100 },
  },
  circle: {
    medium: { width: 80, height: 80 },
    large: { width: 100, height: 100 },
  },
  rectangle: {
    medium: { width: 140, height: 60 },
    large: { width: 180, height: 70 },
  },
  oval: {
    medium: { width: 110, height: 70 },
    large: { width: 140, height: 85 },
  },
};

export const DEFAULT_SIZE_PRESET: SizePreset = "medium";

export function getDefaultSizeForShape(shape: Shape): { width: number; height: number } {
  return SIZE_PRESETS[shape][DEFAULT_SIZE_PRESET];
}

// ============ TYPES ============

export type Shape = z.infer<typeof shapeSchema>;
export type TableShape = z.infer<typeof tableShapeSchema>;
export type SeatingArrangement = z.infer<typeof seatingArrangementSchema>;
export type ColorTheme = z.infer<typeof colorThemeSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type UpdateTablePositionInput = z.infer<typeof updateTablePositionSchema>;
export type UpdateTableSizeInput = z.infer<typeof updateTableSizeSchema>;
export type UpdateTableRotationInput = z.infer<typeof updateTableRotationSchema>;
export type AssignGuestsInput = z.infer<typeof assignGuestsSchema>;
export type RemoveGuestInput = z.infer<typeof removeGuestSchema>;
export type MoveGuestInput = z.infer<typeof moveGuestSchema>;
export type SeatingFilter = z.infer<typeof seatingFilterSchema>;

export type VenueBlockType = z.infer<typeof venueBlockTypeSchema>;
export type VenueBlockShape = z.infer<typeof venueBlockShapeSchema>;
export type CreateVenueBlockInput = z.infer<typeof createVenueBlockSchema>;
export type UpdateVenueBlockInput = z.infer<typeof updateVenueBlockSchema>;
export type UpdateVenueBlockPositionInput = z.infer<typeof updateVenueBlockPositionSchema>;
export type UpdateVenueBlockSizeInput = z.infer<typeof updateVenueBlockSizeSchema>;
export type UpdateVenueBlockRotationInput = z.infer<typeof updateVenueBlockRotationSchema>;

export type AutoArrangeInput = z.infer<typeof autoArrangeSchema>;
export type MarkGuestArrivedInput = z.infer<typeof markGuestArrivedSchema>;
export type UpdateGuestTableInput = z.infer<typeof updateGuestTableSchema>;
