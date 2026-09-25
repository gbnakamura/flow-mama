"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarCheck2, CalendarPlus, ChartNoAxesColumnIncreasing, LayoutDashboard, LogOut, Mail, Menu, Users, X } from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";
import type { AdminProgrammeFilter } from "@/lib/admin/programme-filter";

export type AdminNavItem = "overview" | "bookings" | "customers" | "revenue" | "analytics" | "emails" | "availability";

type AdminNavigationProps = {
  active: AdminNavItem;
  programme: AdminProgrammeFilter;
};

export function AdminNavigation({ active, programme }: AdminNavigationProps) {
  const [open, setOpen] = useState(false);
  const programmeQuery = programme === "all" ? "" : `?programme=${programme}`;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const nav = document.querySelector(".admin-nav");
    const siblings = nav?.parentElement
      ? Array.from(nav.parentElement.children).filter((element) => element !== nav)
      : [];
    const siblingStates = siblings.map((element) => ({
      element,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.hasAttribute("inert"),
    }));
    document.body.style.overflow = "hidden";
    for (const element of siblings) {
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("inert", "");
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const { element, ariaHidden, inert } of siblingStates) {
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
        if (!inert) element.removeAttribute("inert");
      }
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <nav className={`admin-nav${open ? " open" : ""}`} aria-label="Admin navigation">
      <button className="admin-nav-toggle" type="button" aria-label={open ? "Close admin menu" : "Open admin menu"} aria-expanded={open} aria-controls="admin-nav-links" onClick={() => setOpen((current) => !current)}>
        <span>{open ? <X size={19} /> : <Menu size={19} />} Menu</span>
        <small>{open ? "Close" : "Admin navigation"}</small>
      </button>
      <div className="admin-nav-links" id="admin-nav-links">
        <div className="admin-nav-mobile-heading"><p>Admin</p><strong>Menu</strong></div>
        <a className={active === "overview" ? "active" : undefined} aria-current={active === "overview" ? "page" : undefined} href={`/admin${programmeQuery}`}><LayoutDashboard size={16} /> Overview</a>
        <a className={active === "bookings" ? "active" : undefined} aria-current={active === "bookings" ? "page" : undefined} href={`/admin/bookings${programmeQuery}`}><CalendarCheck2 size={16} /> Bookings</a>
        <a className={active === "customers" ? "active" : undefined} aria-current={active === "customers" ? "page" : undefined} href={`/admin/customers${programmeQuery}`}><Users size={16} /> Customers</a>
        <a className={active === "revenue" ? "active" : undefined} aria-current={active === "revenue" ? "page" : undefined} href={`/admin/revenue${programmeQuery}`}><ChartNoAxesColumnIncreasing size={16} /> Revenue</a>
        <a className={active === "analytics" ? "active" : undefined} aria-current={active === "analytics" ? "page" : undefined} href="/admin/analytics"><BarChart3 size={16} /> Analytics</a>
        <a className={active === "emails" ? "active" : undefined} aria-current={active === "emails" ? "page" : undefined} href="/admin/email-previews"><Mail size={16} /> Email previews</a>
        <a className={`admin-nav-primary${active === "availability" ? " active" : ""}`} aria-current={active === "availability" ? "page" : undefined} href="/admin/availability/new"><CalendarPlus size={16} /> New availability</a>
        <form className="admin-nav-signout" action={signOutAdmin}><button type="submit"><LogOut size={16} /> Sign out</button></form>
      </div>
    </nav>
  );
}
