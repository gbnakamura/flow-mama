import type { Metadata } from "next";
import { BookingExperience } from "@/components/booking-experience";
import { listAvailability } from "@/lib/data/availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book classes",
  description: "Choose your Flow Mama dates and book them together in one payment.",
};

export default async function BookPage() {
  const slots = await listAvailability();

  return <BookingExperience slots={slots} />;
}
