import type { Metadata } from "next";
import { StayAndPlayExperience } from "@/components/stay-and-play-experience";

export const metadata: Metadata = {
  title: "Charity Stay & Play",
  description: "Join Flow Mama for a free Stay & Play and charity bake sale supporting Chelsea and Westminster Hospital. Monday 2 November 2026, 11:15am–12:30pm, Northfields Community Centre, Room 2.",
};

export default function StayAndPlayPage() {
  return <StayAndPlayExperience />;
}
