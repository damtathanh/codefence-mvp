import { ORDER_STATUS } from "../../../constants/orderStatus";
import { InvoicesRepository } from "../repositories/invoicesRepository";
import { INVOICE_STATUS, type InvoiceStatus } from "./invoiceTypes";
import type { Order, Invoice } from "../../../types/supabase";
import { logOrderEvent } from "../../orders/services/orderEventsService";

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

  const { data: existing, error } = await InvoicesRepository.getInvoiceByOrderId(order.id, order.user_id);

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

  const { error: insertError } = await InvoicesRepository.insertInvoice({
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

  const { data: existing, error } =
    await InvoicesRepository.getInvoiceByOrderId(order.id, order.user_id);

  if (error) {
    console.error("markInvoicePaidForOrder: fetch error", error);
    throw error;
  }

  // ĐÃ CÓ INVOICE
  if (existing) {
    // ❗ Nếu đã Paid rồi thì thôi, không update, không log thêm event PAID
    if (
      existing.status === INVOICE_STATUS.PAID ||
      existing.status === "Paid"
    ) {
      return existing;
    }

    const { error: updateError } =
      await InvoicesRepository.updateInvoice(existing.id, {
        status: INVOICE_STATUS.PAID,
        paid_at: now,
        // giữ nguyên date cũ nếu có, nếu không thì gán hôm nay
        date: existing.date ?? getTodayDateString(),
      });

    if (updateError) {
      console.error("markInvoicePaidForOrder: update error", updateError);
      throw updateError;
    }

    // Log đúng 1 lần sự kiện PAID
    await logOrderEvent(
      order.id,
      "PAID",
      {
        amount: order.amount,
        paid_at: now,
      },
      "invoice_service"
    );

    return existing;
  }

  // CHƯA CÓ INVOICE -> tạo mới invoice Paid
  const { error: insertError } = await InvoicesRepository.insertInvoice({
    user_id: order.user_id,
    order_id: order.id,
    amount: order.amount ?? 0,
    status: INVOICE_STATUS.PAID,
    date: getTodayDateString(),
    paid_at: now,
    invoice_code: generateInvoiceCode(order),
  });

  if (insertError) {
    console.error("markInvoicePaidForOrder: insert error", insertError);
    throw insertError;
  }

  await logOrderEvent(
    order.id,
    "PAID",
    {
      amount: order.amount,
      paid_at: now,
    },
    "invoice_service"
  );
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

  const { error } = await InvoicesRepository.deleteInvoicesByOrderIds(userId, orderIds);

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

  const { data, error } = await InvoicesRepository.getInvoiceByOrderId(orderId, userId);

  if (error) {
    console.error("getInvoiceByOrderId: fetch error", error);
    return null;
  }

  return data as Invoice | null;
}

export interface InvoiceFilters {
  searchQuery?: string;
  status?: string | string[];
  date?: string;
}

/**
 * Fetch invoices by user with pagination and filters
 */
export async function fetchInvoicesByUser(
  userId: string,
  page: number,
  pageSize: number,
  filters?: InvoiceFilters
) {
  const { data, error, count } = await InvoicesRepository.fetchInvoicesByUser(userId, page, pageSize, filters);

  return {
    invoices: data ?? [],
    totalCount: count ?? 0,
    pageSize,
    error
  };
}

/**
 * Invalidate invoice PDF cache for an order.
 * Clears pdf_url so the next download will regenerate the PDF with fresh data.
 * Call this after updating order fields that affect the invoice (amount, discount, shipping).
 */
export async function invalidateInvoicePdfForOrder(orderId: string) {
  if (!orderId) return;

  // Find invoices for this order
  const { data: invoices, error } = await InvoicesRepository.getInvoicesByOrderId(orderId);

  if (error) {
    console.error('Failed to load invoices for order to invalidate PDF', error);
    return;
  }

  if (!invoices || invoices.length === 0) return;

  const invoiceIds = invoices.map((inv) => inv.id);

  // Clear pdf_url to force regeneration on next download
  const { error: updateError } = await InvoicesRepository.invalidateInvoicePdfs(invoiceIds);

  if (updateError) {
    console.error('Failed to invalidate invoice PDFs for order', orderId, updateError);
  }
}


/**
 * Mark a specific invoice as Paid by ID.
 * Used for manual "Mark as Paid" action from Invoices page.
 */
export async function markInvoiceAsPaid(invoiceId: string) {
  const now = new Date().toISOString();

  const { data, error } = await InvoicesRepository.updateInvoice(invoiceId, {
    status: "Paid" as InvoiceStatus,
    paid_at: now,
    date: getTodayDateString(),
  });

  if (error) {
    console.error("markInvoiceAsPaid: update error", error);
    throw error;
  }

  return data;
}

/**
 * Apply business rules for invoice creation/updates based on order status changes.
 * This should be called whenever an order is updated.
 */
export async function applyInvoiceRules(order: Order) {
  if (!order || !order.status) return;

  const status = order.status;
  const riskScore = order.risk_score;
  const paymentMethod = (order.payment_method || "COD").toUpperCase(); // Default COD
  const isCOD = paymentMethod === "COD";

  // 1. PAID logic (mọi payment method)
  // => Chỉ khi status là 1 trong các trạng thái "đã thanh toán" RÕ RÀNG
  //    (Simulate Paid, QR callback, non-COD prepaid...)
  const paidStatuses = [
    ORDER_STATUS.ORDER_PAID, // dùng hằng số
    "PAID",                  // phòng sau này có status kiểu PAID
    "CUSTOMER_PAID",
  ];

  if (paidStatuses.includes(status)) {
    // Order đã ở trạng thái đã thanh toán -> đảm bảo Invoice = Paid
    await markInvoicePaidForOrder(order);
    return; // Paid override mọi trạng thái Pending
  }

  // 2. PENDING logic (COD ONLY)
  if (isCOD) {
    // A. COD Low Risk: auto approve -> tạo Pending khi Order Approved
    if (
      riskScore != null &&
      riskScore <= 30 &&
      status === ORDER_STATUS.ORDER_APPROVED
    ) {
      await ensurePendingInvoiceForOrder(order);
      return;
    }

    // B. COD Medium/High Risk: chỉ sau khi Customer Confirmed mới tạo Pending
    //    (risk_score > 30 hoặc null)
    if (
      (riskScore == null || riskScore > 30) &&
      status === ORDER_STATUS.CUSTOMER_CONFIRMED
    ) {
      await ensurePendingInvoiceForOrder(order);
      return;
    }
  }

  // Các trạng thái khác (Start Delivery, Completed, Return, Exchange...)
  // => KHÔNG tạo/đụng gì tới Invoice ở đây.
}