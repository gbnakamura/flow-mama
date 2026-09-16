import { z } from "zod";

export const checkoutSchema = z.object({
  slotIds: z.array(z.uuid()).min(1).max(40).refine(
    (ids) => new Set(ids).size === ids.length,
    "Each class can only be selected once.",
  ),
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().min(7).max(30),
    babyName: z.string().trim().min(1).max(80),
    babyAgeMonths: z.number().int().min(0).max(60),
  }),
  eligibilityConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
