import { z } from "zod";
import { RsvpStatus } from "@prisma/client";

export const submitRsvpSchema = z.object({
  slug: z.string(),
  status: z.nativeEnum(RsvpStatus),
  guestCount: z.number().min(0).max(20).default(1), // min 0 to allow DECLINED with 0 guests
  note: z.string().max(1000).optional(),
});

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;
