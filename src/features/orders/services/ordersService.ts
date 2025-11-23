import { supabase } from "../../../lib/supabaseClient";
import type { Order } from "../../../types/supabase";
import { chunkArray } from "../../../utils/chunk";

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
  address_detail?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
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
  address?: string | null;
  address_detail?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
}

/**
 * Fetch orders by user with product join
 */
export interface OrderFilters {
  searchQuery?: string;
  status?: string;
  riskScore?: string;
  paymentMethod?: string;
}

export async function fetchOrdersByUser(
  userId: string,
  page: number,
  pageSize: number,
  filters?: OrderFilters
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(`
      *,
      products:product_id (
        id,
        name,
        category
      )
    `, { count: 'exact' })
    .eq("user_id", userId);

  // Apply filters
  if (filters) {
    if (filters.searchQuery) {
      const term = filters.searchQuery.trim();
      if (term) {
        query = query.or(`order_id.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%,id.ilike.%${term}%`);
      }
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      if (filters.paymentMethod === 'COD') {
        // COD is typically null or 'COD'
        query = query.or('payment_method.eq.COD,payment_method.is.null');
      } else {
        query = query.eq('payment_method', filters.paymentMethod);
      }
    }

    if (filters.riskScore && filters.riskScore !== 'all') {
      switch (filters.riskScore) {
        case 'low':
          query = query.lte('risk_score', 30);
          break;
        case 'medium':
          query = query.gt('risk_score', 30).lte('risk_score', 70);
          break;
        case 'high':
          query = query.gt('risk_score', 70);
          break;
      }
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    orders: data ?? [],
    totalCount: count ?? 0,
    pageSize,
    error
  };
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

  const phoneChunks = chunkArray(phones);
  let allData: { phone: string; status: string }[] = [];

  for (const chunk of phoneChunks) {
    const { data, error } = await supabase
      .from("orders")
      .select("phone, status")
      .eq("user_id", userId)
      .in("phone", chunk);

    if (error) {
      return { data: null, error };
    }

    if (data) {
      // Supabase returns data as any[] or typed if generic provided. 
      // We can cast or just spread.
      allData = [...allData, ...data as { phone: string; status: string }[]];
    }
  }

  return { data: allData, error: null };
}

/**
 * Delete orders by IDs and user_id
 */
export async function deleteOrders(userId: string, orderIds: string[]) {
  if (!orderIds.length) return;

  // Ideal long-term solution: Enforce ON DELETE CASCADE foreign key between orders(id) and invoices(order_id) in the database.
  // For now, we enforce cascade delete in the service layer.

  // 1) Delete related invoices
  const { error: invoiceError } = await supabase
    .from('invoices')
    .delete()
    .in('order_id', orderIds);

  if (invoiceError) {
    console.error('Failed to delete related invoices', invoiceError);
    throw invoiceError;
  }

  // 2) Delete orders
  return supabase
    .from("orders")
    .delete()
    .eq("user_id", userId)
    .in("id", orderIds);
}

