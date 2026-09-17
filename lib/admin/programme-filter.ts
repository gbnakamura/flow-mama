export type AdminProgrammeFilter = "all" | "flow-mama" | "personal-training";

export const FLOW_MAMA_PROGRAMME_SLUG = "flow-mama-autumn-2026";
export const PERSONAL_TRAINING_PROGRAMME_SLUG = "group-personal-training";

export function parseAdminProgrammeFilter(value?: string): AdminProgrammeFilter {
  return value === "flow-mama" || value === "personal-training" ? value : "all";
}

export function programmeMatchesFilter(slug: string, filter: AdminProgrammeFilter) {
  if (filter === "all") return true;
  return filter === "flow-mama"
    ? slug === FLOW_MAMA_PROGRAMME_SLUG
    : slug === PERSONAL_TRAINING_PROGRAMME_SLUG;
}

export function adminProgrammeLabel(slug: string) {
  return slug === PERSONAL_TRAINING_PROGRAMME_SLUG ? "Personal training" : "Flow Mama";
}

export function adminFilterLabel(filter: AdminProgrammeFilter) {
  if (filter === "flow-mama") return "Flow Mama";
  if (filter === "personal-training") return "Personal training";
  return "All bookings";
}
