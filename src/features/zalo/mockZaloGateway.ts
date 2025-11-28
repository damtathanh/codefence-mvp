import type { ZaloGateway } from "./ZaloGateway";
import type { Order } from "../../types/supabase";
import { updateOrder } from "../orders/services/ordersService";
import { logOrderEvent } from "../orders/services/orderEventsService";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { ensurePendingInvoiceForOrder, markInvoicePaidForOrder } from "../invoices/services/invoiceService";
import { supabase } from "../../lib/supabaseClient";

export const mockZaloGateway: ZaloGateway = {
  async sendConfirmation(order: Order) {
    const now = new Date().toISOString();

    // Update the order status and confirmation_sent_at timestamp
    const { error } = await updateOrder(order.id, order.user_id, {
      status: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
      confirmation_sent_at: now,
    });

    if (error) {
      console.error('[mockZaloGateway] Failed to send confirmation', error);
      throw error;
    }

    await logOrderEvent(order.id, 'ORDER_CONFIRMATION_SENT', {}, 'mock_zalo');
  },

  async sendQrPayment(order: Order) {
    const now = new Date().toISOString();
    const qrExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await updateOrder(order.id, order.user_id, {
      status: ORDER_STATUS.ORDER_APPROVED,
      customer_confirmed_at: now,
      qr_sent_at: now,
      qr_expired_at: qrExpiredAt,
    });

    if (error) {
      console.error('[mockZaloGateway] Failed to send QR payment', error);
      throw error;
    }

    await logOrderEvent(order.id, 'CUSTOMER_CONFIRMED', { channel: 'zalo' }, 'mock_zalo');
    await logOrderEvent(order.id, 'QR_PAYMENT_LINK_SENT', { qr_expired_at: qrExpiredAt }, 'mock_zalo');
  },
};

// Additional simulation functions (for testing)
export async function simulateCustomerConfirmed(order: Order) {
  const now = new Date().toISOString();
  const qrExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await updateOrder(order.id, order.user_id, {
    status: ORDER_STATUS.CUSTOMER_CONFIRMED,
    customer_confirmed_at: now,
    qr_sent_at: now,
    qr_expired_at: qrExpiredAt,
  });

  if (error) {
    console.error('[mockZaloGateway] Failed to simulate customer confirmed', error);
    throw error;
  }

  await logOrderEvent(order.id, 'CUSTOMER_CONFIRMED', { channel: 'zalo' }, 'mock_zalo');
  await logOrderEvent(order.id, 'QR_PAYMENT_LINK_SENT', { qr_expired_at: qrExpiredAt }, 'mock_zalo');

  // Create Pending invoice for COD orders only - REMOVED: Centralized in updateOrder -> applyInvoiceRules
}

export async function simulateCustomerCancelled(order: Order, reason: string) {
  const now = new Date().toISOString();

  const { error } = await updateOrder(order.id, order.user_id, {
    status: ORDER_STATUS.CUSTOMER_CANCELLED,
    customer_confirmed_at: now,
    cancelled_at: now,
    cancel_reason: reason,
  });

  if (error) {
    console.error('[mockZaloGateway] Failed to simulate customer cancelled', error);
    throw error;
  }

  await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { reason }, 'mock_zalo');
}

export async function simulateCustomerPaid(order: Order) {
  const now = new Date().toISOString();

  // 1) Cập nhật Order sang Order Paid + paid_at
  const { error } = await updateOrder(order.id, order.user_id, {
    status: ORDER_STATUS.ORDER_PAID,
    paid_at: now,
  });

  if (error) {
    console.error('[mockZaloGateway] Failed to simulate customer paid', error);
    throw error;
  }

  // 2) Log event - REMOVED: Centralized in markInvoicePaidForOrder
  // await logOrderEvent(order.id, 'customer_paid', { source: 'mock' });

  // 3) Cập nhật Invoice tương ứng
  // REMOVED: Centralized in updateOrder -> applyInvoiceRules
  // const updatedOrder: Order = { ...order, status: ORDER_STATUS.ORDER_PAID, paid_at: now };
  // await markInvoicePaidForOrder(updatedOrder);
}


