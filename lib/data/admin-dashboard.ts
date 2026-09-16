import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminSlot = {
  id: string;
  startsAt: string;
  variantName: string;
  capacity: number;
  bookedCount: number;
  status: string;
};

export type AdminOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  email: string;
  quantity: number;
  totalPence: number;
  refundedPence: number;
  status: string;
};

export async function loadAdminDashboard() {
  const supabase = createSupabaseAdmin();
  const [{ data: slotRows, error: slotError }, { data: orderRows, error: orderError }] = await Promise.all([
    supabase
      .from("slots")
      .select("id, starts_at, capacity, booked_count, status, session_variants(name)")
      .order("starts_at", { ascending: true }),
    supabase
      .from("orders")
      .select("id, created_at, quantity, total_pence, refunded_pence, status, customers(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (slotError) throw new Error(`Unable to load classes: ${slotError.message}`);
  if (orderError) throw new Error(`Unable to load orders: ${orderError.message}`);

  const slots: AdminSlot[] = (slotRows ?? []).map((row) => {
    const variant = Array.isArray(row.session_variants) ? row.session_variants[0] : row.session_variants;
    return {
      id: row.id,
      startsAt: row.starts_at,
      variantName: variant && "name" in variant ? String(variant.name) : "Flow Mama",
      capacity: row.capacity,
      bookedCount: row.booked_count,
      status: row.status,
    };
  });

  const orders: AdminOrder[] = (orderRows ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return {
      id: row.id,
      createdAt: row.created_at,
      customerName: customer && "full_name" in customer ? String(customer.full_name) : "Unknown customer",
      email: customer && "email" in customer ? String(customer.email) : "",
      quantity: row.quantity,
      totalPence: row.total_pence ?? 0,
      refundedPence: row.refunded_pence ?? 0,
      status: row.status,
    };
  });

  return { slots, orders };
}
