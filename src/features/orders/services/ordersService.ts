import { supabase } from "../../../lib/supabaseClient";
import type { Order } from "../../../types/supabase";
import { addShippingCost } from "../../shipping/services/shippingService";
import { logOrderEvent } from "./orderEventsService";
import { SHIPPING_COST } from '../../../constants/shipping';
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
  amount?: number;
  discount_amount?: number | null;
  shipping_fee?: number | null;
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
  status?: string | string[];
  riskScore?: string | string[];
  paymentMethod?: string | string[];
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
        query = query.or(`order_id.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%`);
      }
    }

    // Status Filter
    if (filters.status) {
      const raw = Array.isArray(filters.status) ? filters.status : [filters.status];
      const statuses = raw.filter((s) => s && s !== 'all');

      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }
    }

    // Payment Method Filter
    if (filters.paymentMethod) {
      const raw = Array.isArray(filters.paymentMethod) ? filters.paymentMethod : [filters.paymentMethod];
      const methods = raw.filter((m) => m && m !== 'all');

      if (methods.length > 0) {
        const hasCOD = methods.includes('COD');
        const nonCodMethods = methods.filter((m) => m !== 'COD');

        if (hasCOD && nonCodMethods.length > 0) {
          // COD (null or 'COD') OR other methods
          query = query.or(
            [
              'payment_method.eq.COD',
              'payment_method.is.null',
              ...nonCodMethods.map((m) => `payment_method.eq.${m}`),
            ].join(',')
          );
        } else if (hasCOD) {
          // Only COD
          query = query.or('payment_method.eq.COD,payment_method.is.null');
        } else {
          // Only non-COD
          query = query.in('payment_method', nonCodMethods);
        }
      }
    }

    // Risk Score Filter
    if (filters.riskScore) {
      const raw = Array.isArray(filters.riskScore) ? filters.riskScore : [filters.riskScore];
      const risks = raw.filter((r) => r && r !== 'all');

      if (risks.length > 0) {
        // If multiple risk levels are selected, we need OR logic for ranges
        // e.g. (risk <= 30) OR (risk > 70)
        // Supabase .or() with ranges is tricky in one go if not careful.
        // Easier approach: construct a raw OR string.

        const conditions: string[] = [];

        if (risks.includes('low')) {
          conditions.push('risk_score.lte.30');
        }
        if (risks.includes('medium')) {
          // gt 30 AND lte 70. In .or() syntax, we need `and(risk_score.gt.30,risk_score.lte.70)`
          conditions.push('and(risk_score.gt.30,risk_score.lte.70)');
        }
        if (risks.includes('high')) {
          conditions.push('risk_score.gt.70');
        }

        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
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
  const result = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (result.error) {
    console.error(`[updateOrder] Failed to update order ${orderId}:`, result.error);
  }

  // If update succeeded and money-related fields changed, invalidate invoice PDF cache
  if (!result.error && result.data) {
    const hasMoneyChanges =
      updates.amount !== undefined ||
      updates.discount_amount !== undefined ||
      updates.shipping_fee !== undefined;

    if (hasMoneyChanges) {
      // Import dynamically to avoid circular dependency
      const { invalidateInvoicePdfForOrder } = await import('../../invoices/services/invoiceService');
      await invalidateInvoicePdfForOrder(orderId);
    }
  }

  return result;
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
 * Process a Refund for an order (MVP SPEC).
 * 
 * MVP BEHAVIOR:
 * - Updates order.refunded_amount (accumulates)
 * - Logs "REFUND" event
 * - Does NOT change order status
 * - Does NOT change invoice status (invoice stays "Paid")
 * 
 * @param orderId - Order UUID
 * @param refundAmount - Amount to refund (VND)
 * @param note - Reason/note for the refund
 */
export async function processRefund(
  orderId: string,
  refundAmount: number,
  note: string
) {
  // 1. Log REFUND event
  await logOrderEvent(
    orderId,
    "REFUND",
    {
      refund_amount: refundAmount,
      note,
    },
    "orders_service"
  );

  // 2. Fetch current refunded_amount to accumulate safely
  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("refunded_amount")
    .eq("id", orderId)
    .single();

  if (fetchError) throw fetchError;

  // 3. Calculate new accumulated refunded amount
  const newRefundedAmount = (currentOrder.refunded_amount || 0) + refundAmount;

  // 4. Update order with new refunded_amount (MVP: no status changes)
  const { data, error } = await supabase
    .from("orders")
    .update({
      refunded_amount: newRefundedAmount,
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Process a Return (Return to Seller) - MVP SPEC.
 * 
 * MVP BEHAVIOR:
 * - Updates shipping fields: customer_shipping_paid, seller_shipping_paid
 * - Adds shipping cost entry (return direction)
 * - Logs "RETURN" event
 * - Does NOT change order status
 * - Does NOT change invoice status
 * 
 * @param orderId - Order UUID
 * @param customerPays - Whether customer pays return shipping
 * @param customerAmount - Amount customer pays for return shipping
 * @param shopAmount - Amount seller pays for return shipping
 * @param note - Reason/note for the return
 */
export async function processReturn(
  orderId: string,
  customerPays: boolean,
  customerAmount: number,
  shopAmount: number,
  note: string
) {
  // 1. Log RETURN event
  await logOrderEvent(
    orderId,
    "RETURN",
    {
      customer_paid: customerAmount,
      seller_paid: shopAmount,
      carrier_cost: SHIPPING_COST.RETURN_ONE_WAY,
      note,
    },
    "orders_service"
  );

  // 2. Add shipping cost entry (return leg)
  await addShippingCost(orderId, "return", SHIPPING_COST.RETURN_ONE_WAY);

  // 3. Fetch current shipping amounts to accumulate
  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("customer_shipping_paid, seller_shipping_paid")
    .eq("id", orderId)
    .single();

  if (fetchError) throw fetchError;

  // 4. Calculate new accumulated shipping amounts
  const newCustomerPaid = (currentOrder.customer_shipping_paid || 0) + customerAmount;
  const newSellerPaid = (currentOrder.seller_shipping_paid || 0) + shopAmount;

  // 5. Update order with new shipping amounts (MVP: no status changes)
  const { data, error } = await supabase
    .from("orders")
    .update({
      customer_shipping_paid: newCustomerPaid,
      seller_shipping_paid: newSellerPaid,
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Process an Exchange using a transactional RPC function - MVP SPEC.
 * 
 * MVP BEHAVIOR:
 * - Uses Supabase RPC 'process_exchange' (atomic transaction)
 * - RPC handles: logging event, adding shipping costs, updating original order, creating new order
 * - Does NOT change invoice status
 * - Returns both original and new order data
 * 
 * @param orderId - Original order UUID
 * @param customerPays - Whether customer pays exchange shipping
 * @param customerAmount - Amount customer pays for exchange shipping
 * @param shopAmount - Amount seller pays for exchange shipping
 * @param note - Reason/note for the exchange
 */
export async function processExchange(
  orderId: string,
  customerPays: boolean,
  customerAmount: number,
  shopAmount: number,
  note: string
) {
  // Get current user for RPC call
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Call the atomic RPC function (handles all exchange logic in transaction)
  const { data, error } = await supabase.rpc('process_exchange', {
    p_user_id: user.id,
    p_order_id: orderId,
    p_customer_pays: customerPays,
    p_customer_amount: customerAmount,
    p_shop_amount: shopAmount,
    p_note: note,
  });

  if (error) {
    console.error('Exchange RPC failed:', error);
    throw error;
  }

  // Parse the RPC response
  const result = data as {
    original_order: {
      id: string;
      customer_shipping_paid: number;
      seller_shipping_paid: number;
    };
    new_order: any;
  };

  return {
    originalOrder: result.original_order,
    newOrder: result.new_order,
  };
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


/**
 * Mark an order as Paid by ID.
 * Used for manual "Mark as Paid" action from Invoices page.
 */
/**
 * Mark an order as Paid by ID.
 * Used for manual "Mark as Paid" action from Invoices page.
 * NOTE: This only sets paid_at timestamp. It does NOT change the order status.
 * This ensures that orders in DELIVERING or COMPLETED status remain in their correct logistics stage.
 */
export async function markOrderAsPaid(orderId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .update({
      paid_at: now,
    })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    console.error("markOrderAsPaid: update error", error);
    throw error;
  }

  return data;
}

export interface OrderFilterOptions {
  statusOptions: string[];
  paymentMethodOptions: string[];
}

/**
 * Fetch distinct filter options (status, payment method) from all orders for a user
 * Used to populate filter dropdowns with all available values, not just current page
 */
export async function fetchOrderFilterOptions(userId: string): Promise<OrderFilterOptions> {
  // Fetch distinct status values
  const { data: statusData, error: statusError } = await supabase
    .from("orders")
    .select("status")
    .eq("user_id", userId)
    .not("status", "is", null);

  if (statusError) {
    console.error("fetchOrderFilterOptions: status query error", statusError);
    throw statusError;
  }

  const statusOptions = Array.from(
    new Set(
      (statusData || [])
        .map((row) => row.status as string)
        .filter(Boolean)
    )
  ).sort();

  // Fetch distinct payment_method values
  const { data: paymentData, error: paymentError } = await supabase
    .from("orders")
    .select("payment_method")
    .eq("user_id", userId);

  if (paymentError) {
    console.error("fetchOrderFilterOptions: payment_method query error", paymentError);
    throw paymentError;
  }

  const paymentMethodOptions = Array.from(
    new Set(
      (paymentData || []).map((row) => {
        const raw = (row.payment_method as string | null) || "COD";
        const method = raw.trim();
        return method === "" ? "COD" : method; // null/empty => COD
      })
    )
  ).sort();

  return { statusOptions, paymentMethodOptions };
}
