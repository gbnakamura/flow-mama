import type { Metadata } from "next";
import { PersonalTrainingExperience } from "@/components/personal-training-experience";
import { listPersonalTrainingAvailability } from "@/lib/data/availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book personal training",
  description: "Choose your Flow Mama Group Personal Training or one-to-one sessions.",
};

export default async function PersonalTrainingPage() {
  const slots = await listPersonalTrainingAvailability();
  return <PersonalTrainingExperience slots={slots} />;
}
