import { z } from "zod";

export const personalTrainingCheckoutSchema = z.object({
  selections: z.array(z.object({
    slotId: z.uuid(),
    bookingMode: z.enum(["group", "one_to_one"]),
  })).min(1).max(40).refine(
    (selections) => new Set(selections.map((selection) => selection.slotId)).size === selections.length,
    "Each session can only be selected once.",
  ),
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().min(7).max(30),
  }),
  termsAccepted: z.literal(true),
});

export type PersonalTrainingCheckoutInput = z.infer<typeof personalTrainingCheckoutSchema>;
