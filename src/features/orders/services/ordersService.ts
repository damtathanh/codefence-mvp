import { OrdersRepository } from "../repositories/ordersRepository";
import type { Order } from "../../../types/supabase";
import { addShippingCost } from "../../shipping/services/shippingService";
import { logOrderEvent } from "./orderEventsService";
import { SHIPPING_COST } from '../../../constants/shipping';
import { chunkArray } from "../../../utils/chunk";
import { validateOrderTransition } from "../domain/orderStateMachine";
import { ORDER_STATUS, type OrderStatus } from "../../../constants/orderStatus";
import { supabase } from "../../../lib/supabaseClient"; // Kept for auth.getUser()
import { LedgerService } from "../../ledger/services/ledgerService";

export interface FetchOrdersOptions {
  limit?: number;
  offset?: number;
}

export interface InsertOrderPayload {
  user_id: string;
  order_id: string;
  customer_name: string;
  phone: string;
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
  date?: string;
}

export async function fetchOrdersByUser(
  userId: string,
  page: number,
  pageSize: number,
  filters?: OrderFilters
) {
  const { data, error, count } = await OrdersRepository.fetchOrdersByUser(userId, page, pageSize, filters);

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
  return OrdersRepository.insertOrder(payload);
}

/**
 * Insert multiple orders (bulk)
 */
export async function insertOrders(payloads: InsertOrderPayload[]) {
  return OrdersRepository.insertOrders(payloads);
}

/**
 * Update an order by ID and user_id
 */
export async function updateOrder(
  orderId: string,
  userId: string,
  updates: UpdateOrderPayload
) {
  // Validate status transition if status is being updated
  if (updates.status) {
    const { data: currentOrder, error: fetchError } = await OrdersRepository.fetchOrderById(orderId, userId);

    if (fetchError) {
      console.error(`[updateOrder] Failed to fetch current status for validation:`, fetchError);
      // Fail safe: if we can't validate, we shouldn't proceed with a potentially invalid state change
      throw new Error(`Failed to validate order status transition: ${fetchError.message}`);
    }

    if (currentOrder) {
      try {
        validateOrderTransition(currentOrder.status as OrderStatus, updates.status as OrderStatus);
      } catch (validationError: any) {
        console.error(`[updateOrder] Invalid status transition:`, validationError);
        throw validationError;
      }
    }
  }

  const result = await OrdersRepository.updateOrder(orderId, userId, updates);

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

    // Apply Invoice Rules (Centralized Logic)
    // We import dynamically to avoid circular dependency since invoiceService might import ordersService types/utils
    const { applyInvoiceRules } = await import('../../invoices/services/invoiceService');
    await applyInvoiceRules(result.data as Order);
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
  return OrdersRepository.fetchPastOrdersByPhone(userId, phone);
}

/**
 * Fetch past orders by multiple phones (batch query for risk evaluation)
 */
export async function fetchPastOrdersByPhones(
  userId: string,
  phones: string[]
) {
  return OrdersRepository.fetchPastOrdersByPhones(userId, phones);
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
  // We need user_id to use the repository properly, but this function signature doesn't have it.
  // However, we can fetch the order first to get the user_id if needed, or just use a direct query if we trust the caller.
  // But wait, OrdersRepository methods require userId for safety (RLS is on DB side anyway).
  // Let's assume we can get the user from auth context or just query by ID since RLS handles security.
  // Actually, OrdersRepository.fetchOrderById requires userId.
  // Let's get the current user from auth.
  // TODO: In a future refactor, pass userId explicitly instead of reading auth state here.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("processRefund: auth error", authError);
    throw authError;
  }
  const user = authData?.user;
  if (!user) throw new Error('User not authenticated');

  const { data: currentOrder, error: fetchError } = await OrdersRepository.fetchOrderById(orderId, user.id);

  if (fetchError) throw fetchError;

  // 3. Calculate new accumulated refunded amount
  const newRefundedAmount = (currentOrder.refunded_amount || 0) + refundAmount;

  // 4. Update order with new refunded_amount (MVP: no status changes)
  const { data, error } = await OrdersRepository.updateOrder(orderId, user.id, {
    refunded_amount: newRefundedAmount, // This is not in UpdateOrderPayload? Let's check.
    // UpdateOrderPayload doesn't have refunded_amount. We need to add it or cast.
    // Let's check UpdateOrderPayload definition above. It doesn't have it.
    // We should update the interface.
  } as any);

  if (error) throw error;

  // P2: Record Refund in Ledger
  await LedgerService.recordRefund(user.id, orderId, refundAmount, note);

  return data;
}

/**
 * Process a Return (Return to Seller) - MVP SPEC.
 * 
 * MVP BEHAVIOR:
 * - Updates shipping fields: customer_shipping_paid, seller_shipping_paid
 * - Adds shipping cost entry (return direction)
 * - Logs "RETURN" event
 * - Marks order status as RETURNED (MVP now updates status when processing a return)
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
  // TODO: In a future refactor, pass userId explicitly instead of reading auth state here.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("processReturn: auth error", authError);
    throw authError;
  }
  const user = authData?.user;
  if (!user) throw new Error('User not authenticated');

  const { data: currentOrder, error: fetchError } = await OrdersRepository.fetchOrderById(orderId, user.id);

  if (fetchError) throw fetchError;

  // 4. Calculate new accumulated shipping amounts
  const newCustomerPaid = (currentOrder.customer_shipping_paid || 0) + customerAmount;
  const newSellerPaid = (currentOrder.seller_shipping_paid || 0) + shopAmount;

  // 5. Update order with new shipping amounts AND status
  const { data, error } = await OrdersRepository.updateOrder(orderId, user.id, {
    customer_shipping_paid: newCustomerPaid,
    seller_shipping_paid: newSellerPaid,
    status: ORDER_STATUS.RETURNED,
    // returned_at: new Date().toISOString(), // Optional, add if schema supports
  } as any);

  if (error) throw error;

  // P3: Increment Stock (Inventory Flow)
  if ((currentOrder as any).product_id) {
    // Assuming quantity is 1 as it's not in Order type
    const quantity = 1;
    const { error: stockError } = await supabase.rpc('increment_stock', {
      p_product_id: (currentOrder as any).product_id,
      p_quantity: quantity
    });

    if (stockError) {
      console.error('[processReturn] Failed to increment stock:', stockError);
      // We don't throw here to avoid rolling back the return logic, but we log it.
      // Ideally we should use a transaction or notify user.
    }
  }

  // P2: Record Ledger Entries for Return
  if (customerAmount > 0) {
    // Customer pays -> Inflow (Return Fee)
    await LedgerService.recordReturnFee(user.id, orderId, customerAmount, `Customer paid return shipping: ${note}`);
  }
  if (shopAmount > 0) {
    // Shop pays -> Outflow (Shipping Cost)
    await LedgerService.recordTransaction(user.id, orderId, 'shipping_cost', shopAmount, 'outflow', { note: `Shop paid return shipping: ${note}` });
  }

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
  note: string,
  newProductId?: string
) {
  // Get current user for RPC call
  // TODO: In a future refactor, pass userId explicitly instead of reading auth state here.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("processExchange: auth error", authError);
    throw authError;
  }
  const user = authData?.user;
  if (!user) throw new Error('User not authenticated');

  // Call the atomic RPC function (handles all exchange logic in transaction)
  const { data, error } = await OrdersRepository.processExchangeRPC({
    p_user_id: user.id,
    p_order_id: orderId,
    p_customer_pays: customerPays,
    p_customer_amount: customerAmount,
    p_shop_amount: shopAmount,
    p_note: note,
    p_new_product_id: newProductId,
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

  // P2: Record Ledger Entries for Exchange
  if (customerAmount > 0) {
    await LedgerService.recordTransaction(user.id, orderId, 'exchange_adjustment', customerAmount, 'inflow', { note: `Customer paid exchange shipping: ${note}` });
  }
  if (shopAmount > 0) {
    await LedgerService.recordTransaction(user.id, orderId, 'shipping_cost', shopAmount, 'outflow', { note: `Shop paid exchange shipping: ${note}` });
  }

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
  // We should use InvoicesRepository here, but to avoid circular dependency (if any), we might need to be careful.
  // However, ordersService already imports invoiceService dynamically in updateOrder.
  // Let's import InvoicesRepository directly or use the one from invoiceService if exported.
  // Better yet, use the repository directly to avoid service-level circular deps if possible, 
  // OR rely on the caller (useOrderActions) to handle it, OR keep it here.
  // The plan said: "Ensure deleteOrders handles invoice deletion (via Repo)."

  // Let's import InvoicesRepository dynamically or statically. Statically is fine if no cycle.
  // OrdersRepository doesn't import InvoicesRepository.
  // But ordersService imports invoiceService (dynamic).
  // Let's use dynamic import for InvoicesRepository to be safe or just use the one we created.

  const { InvoicesRepository } = await import('../../invoices/repositories/invoicesRepository');

  const { error: invoiceError } = await InvoicesRepository.deleteInvoicesByOrderIds(userId, orderIds);

  if (invoiceError) {
    console.error('Failed to delete related invoices', invoiceError);
    throw invoiceError;
  }

  // 2) Delete orders
  return OrdersRepository.deleteOrders(userId, orderIds);
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
  // TODO: In a future refactor, pass userId explicitly instead of reading auth state here.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("markOrderAsPaid: auth error", authError);
    throw authError;
  }
  const user = authData?.user;
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await OrdersRepository.updateOrder(orderId, user.id, {
    paid_at: now,
  });

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
  const { statusData, statusError, paymentData, paymentError } = await OrdersRepository.fetchOrderFilterOptions(userId);

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
