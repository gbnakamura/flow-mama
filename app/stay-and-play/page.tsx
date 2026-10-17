import type { Metadata } from "next";
import { StayAndPlayExperience } from "@/components/stay-and-play-experience";

export const metadata: Metadata = {
  title: "Charity Stay & Play",
  description: "Flow Mama Charity Stay & Play is fully booked. Join the free waitlist for this bake sale supporting Chelsea and Westminster Hospital. Monday 2 November 2026, 10:45am–12:00pm, Northfields Community Centre, Room 2.",
};

export default function StayAndPlayPage() {
  return <StayAndPlayExperience />;
}
