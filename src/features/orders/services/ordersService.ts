import { supabase } from "../../../lib/supabaseClient";
import type { Order } from "../../../types/supabase";

export interface FetchOrdersOptions {
  limit?: number;
  offset?: number;
}

export interface InsertOrderPayload {
  user_id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  product_id: string | null;
  product: string;
  amount: number;
  status: string;
  risk_score: number | null;
  risk_level: string | null;
  payment_method: string;
  paid_at: string | null;
}

export interface UpdateOrderPayload {
  status?: string;
  risk_score?: number | null;
  risk_level?: string | null;
  product_id?: string | null;
  confirmation_sent_at?: string | null;
  customer_confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  qr_sent_at?: string | null;
  qr_expired_at?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  completed_at?: string | null;
  verification_reason?: string | null;
  reject_reason?: string | null;
}

/**
 * Fetch orders by user with product join
 */
export async function fetchOrdersByUser(
  userId: string,
  options?: FetchOrdersOptions
) {
  const { limit = 200, offset = 0 } = options ?? {};

  return supabase
    .from("orders")
    .select(`
      *,
      products:product_id (
        id,
        name,
        category
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

/**
 * Insert a single order
 */
export async function insertOrder(payload: InsertOrderPayload) {
  return supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();
}

/**
 * Insert multiple orders (bulk)
 */
export async function insertOrders(payloads: InsertOrderPayload[]) {
  return supabase
    .from("orders")
    .insert(payloads)
    .select();
}

/**
 * Update an order by ID and user_id
 */
export async function updateOrder(
  orderId: string,
  userId: string,
  updates: UpdateOrderPayload
) {
  return supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .eq("user_id", userId)
    .select()
    .single();
}

/**
 * Fetch past orders by phone for risk evaluation (single phone)
 */
export async function fetchPastOrdersByPhone(
  userId: string,
  phone: string
) {
  return supabase
    .from("orders")
    .select("status")
    .eq("user_id", userId)
    .eq("phone", phone);
}

/**
 * Fetch past orders by multiple phones (batch query for risk evaluation)
 */
export async function fetchPastOrdersByPhones(
  userId: string,
  phones: string[]
) {
  if (phones.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from("orders")
    .select("phone, status")
    .eq("user_id", userId)
    .in("phone", phones);
}

/**
 * Delete orders by IDs and user_id
 */
export async function deleteOrders(userId: string, orderIds: string[]) {
  return supabase
    .from("orders")
    .delete()
    .eq("user_id", userId)
    .in("id", orderIds);
}

