import { z } from "zod";

export const giftPacks = [
  { classes: 3, pricePence: 6000 },
  { classes: 6, pricePence: 9600 },
  { classes: 10, pricePence: 14000 },
] as const;

export const giftVoucherSchema = z.object({
  classes: z.union([z.literal(3), z.literal(6), z.literal(10)]),
  recipientName: z.string().trim().min(1).max(120),
  recipientEmail: z.string().trim().email().max(254),
});
