import type { Metadata } from "next";
import { GiftVoucherExperience } from "@/components/gift-voucher-experience";
export const metadata: Metadata = { title: "Gift vouchers", robots: { index: false, follow: false }, description: "Give a Flow Mama class pack: 3 classes for £60, 6 for £96 or 10 for £140." };
export default async function GiftVouchersPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  return <GiftVoucherExperience cancelled={(await searchParams).checkout === "cancelled"} />;
}
