import { z } from "zod";
import { RsvpStatus } from "@prisma/client";

export const submitRsvpSchema = z.object({
  slug: z.string(),
  status: z.nativeEnum(RsvpStatus),
  guestCount: z.number().min(1).max(20).default(1),
  note: z.string().max(1000).optional(),
});

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;
