// src/features/invoices/invoiceService.ts
import { supabase } from "../../../lib/supabaseClient";
import { INVOICE_STATUS, type InvoiceStatus } from "./invoiceTypes";
import type { Order, Invoice } from "../../../types/supabase";

// helper to get today's date as YYYY-MM-DD for the `date` column
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// Generate human-friendly invoice code from order
function generateInvoiceCode(order: Order): string {
  if (order.order_id) {
    // Business ID like ORD0001
    return `INV-${order.order_id}`;
  }

  // Fallback if order_id is missing for some reason
  return `INV-${order.id.slice(0, 8).toUpperCase()}`;
}

/**
 * Ensure there is a Pending invoice for this order.
 * Used when a COD order is Confirmed by the customer (simulate flow).
 *
 * Rules:
 * - If an invoice already exists for this (user_id, order_id) with status "Pending" or "Paid" => do nothing.
 * - If there's a Cancelled invoice, also do nothing for now (keep history).
 * - If no invoice exists => create a new Pending invoice.
 */
export async function ensurePendingInvoiceForOrder(order: Order) {
  if (!order.user_id) return;

  const { data: existing, error } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("user_id", order.user_id)
    .eq("order_id", order.id)
    .maybeSingle();

  if (error) {
    console.error("ensurePendingInvoiceForOrder: fetch error", error);
    return;
  }

  if (existing) {
    // If there's already a Pending or Paid invoice, we don't change it.
    if (existing.status === INVOICE_STATUS.PENDING || existing.status === INVOICE_STATUS.PAID) {
      return;
    }

    // If it's Cancelled, we currently don't re-open or create a new one.
    return;
  }

  const { error: insertError } = await supabase.from("invoices").insert({
    user_id: order.user_id,
    order_id: order.id,
    amount: order.amount ?? 0,
    status: INVOICE_STATUS.PENDING,
    date: getTodayDateString(),
    invoice_code: generateInvoiceCode(order),
  });

  if (insertError) {
    console.error("ensurePendingInvoiceForOrder: insert error", insertError);
  }
}

/**
 * Mark the invoice for this order as Paid.
 *
 * Rules:
 * - If an invoice exists for this (user_id, order_id) => update its status to "Paid" and set `date` = today, `paid_at` = now.
 * - If no invoice exists => create a new "Paid" invoice.
 */
export async function markInvoicePaidForOrder(order: Order) {
  if (!order.user_id) return;

  const now = new Date().toISOString();

  const { data: existing, error } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("user_id", order.user_id)
    .eq("order_id", order.id)
    .maybeSingle();

  if (error) {
    console.error("markInvoicePaidForOrder: fetch error", error);
    throw error; // đừng nuốt lỗi
  }

  // Nếu invoice đã tồn tại → update sang Paid
  if (existing) {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "Paid" as InvoiceStatus,
        date: getTodayDateString(),
        paid_at: now, // <-- cập nhật paid_at
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("markInvoicePaidForOrder: update error", updateError);
      throw updateError; // để biết là nó fail
    }

    return;
  }

  // Nếu chưa có invoice → tạo mới dạng Paid
  const { error: insertError } = await supabase.from("invoices").insert({
    user_id: order.user_id,
    order_id: order.id,
    amount: order.amount ?? 0,
    status: "Paid" as InvoiceStatus,
    date: getTodayDateString(),
    paid_at: now,
    invoice_code: generateInvoiceCode(order),
  });

  if (insertError) {
    console.error("markInvoicePaidForOrder: insert error", insertError);
    throw insertError;
  }
}

/**
 * Delete invoices by a list of order IDs for a specific user.
 * Used when orders are deleted to clean up related invoices.
 */
export async function deleteInvoicesByOrderIds(
  userId: string,
  orderIds: string[]
) {
  if (!userId || orderIds.length === 0) return;

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("user_id", userId)
    .in("order_id", orderIds);

  if (error) {
    console.error("deleteInvoicesByOrderIds: delete error", error);
    throw error;
  }
}

/**
 * Get invoice by order ID and user ID.
 * Returns the invoice if found, null otherwise.
 */
export async function getInvoiceByOrderId(
  orderId: string,
  userId: string
): Promise<Invoice | null> {
  if (!orderId || !userId) return null;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    console.error("getInvoiceByOrderId: fetch error", error);
    return null;
  }

  return data as Invoice | null;
}

