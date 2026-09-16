import { NextResponse } from "next/server";
import { listAvailability } from "@/lib/data/availability";

export async function GET(request: Request) {
  const programme = new URL(request.url).searchParams.get("programme") ?? undefined;

  try {
    const slots = await listAvailability(programme);
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load availability", error);
    return NextResponse.json(
      { error: "Availability is temporarily unavailable." },
      { status: 503 },
    );
  }
}
