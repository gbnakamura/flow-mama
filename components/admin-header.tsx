import { signOutAdmin } from "@/app/admin/actions";
import { AdminNavigation, type AdminNavItem } from "@/components/admin-navigation";
import type { AdminProgrammeFilter } from "@/lib/admin/programme-filter";

type AdminHeaderProps = {
  title: string;
  eyebrow?: string;
  active?: AdminNavItem;
  programme?: AdminProgrammeFilter;
};

export function AdminHeader({ title, eyebrow = "Admin", active = "overview", programme = "all" }: AdminHeaderProps) {
  const programmeQuery = programme === "all" ? "" : `?programme=${programme}`;
  return (
    <>
      <header className="admin-header">
        <a href={`/admin${programmeQuery}`} aria-label="Flow Mama admin home"><img src="/images/logo.svg" alt="Flow Mama" /></a>
        <div><p>{eyebrow}</p><h1>{title}</h1></div>
        <form action={signOutAdmin}><button type="submit">Sign out</button></form>
      </header>
      <AdminNavigation active={active} programme={programme} />
    </>
  );
}
