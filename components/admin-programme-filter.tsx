import type { AdminProgrammeFilter } from "@/lib/admin/programme-filter";

type AdminProgrammeFilterProps = {
  basePath: string;
  value: AdminProgrammeFilter;
  preserve?: Record<string, string | undefined>;
};

const options: Array<{ value: AdminProgrammeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "flow-mama", label: "Flow Mama" },
  { value: "personal-training", label: "Personal training" },
];

export function AdminProgrammeFilter({ basePath, value, preserve = {} }: AdminProgrammeFilterProps) {
  return (
    <nav className="admin-programme-filter" aria-label="Filter by programme">
      {options.map((option) => {
        const params = new URLSearchParams();
        for (const [key, preservedValue] of Object.entries(preserve)) {
          if (preservedValue) params.set(key, preservedValue);
        }
        if (option.value !== "all") params.set("programme", option.value);
        const query = params.toString();
        return (
          <a
            key={option.value}
            className={value === option.value ? "active" : undefined}
            aria-current={value === option.value ? "page" : undefined}
            href={`${basePath}${query ? `?${query}` : ""}`}
          >
            {option.label}
          </a>
        );
      })}
    </nav>
  );
}
