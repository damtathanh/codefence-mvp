import type { ZaloGateway } from "./ZaloGateway";
import type { Order } from "../../types/supabase";
import { updateOrder } from "../orders/services/ordersService";
import { insertOrderEvent } from "../orders/services/orderEventsService";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { ensurePendingInvoiceForOrder, markInvoicePaidForOrder } from "../invoices/invoiceService";

type ZaloEventType =
  | 'CONFIRMATION_SENT'
  | 'CUSTOMER_CONFIRMED'
  | 'CUSTOMER_CANCELLED'
  | 'CUSTOMER_PAID'
  | 'QR_SENT';

async function logOrderEvent(orderId: string, event_type: ZaloEventType, payload: any = {}) {
  const { error } = await insertOrderEvent({
    order_id: orderId,
    event_type,
    payload_json: { ...payload, source: 'mock_zalo' },
  });

  if (error) {
    console.error('[mockZaloGateway] Failed to insert order_event', error);
    throw error;
  }
}

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

    await logOrderEvent(order.id, 'CONFIRMATION_SENT', { source: 'mock' });
  },

  async sendQrPayment(order: Order) {
    const now = new Date().toISOString();
    const qrExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await updateOrder(order.id, order.user_id, {
      status: ORDER_STATUS.ORDER_CONFIRMED,
      customer_confirmed_at: now,
      qr_sent_at: now,
      qr_expired_at: qrExpiredAt,
    });

    if (error) {
      console.error('[mockZaloGateway] Failed to send QR payment', error);
      throw error;
    }

    await logOrderEvent(order.id, 'CUSTOMER_CONFIRMED', { source: 'mock' });
    await logOrderEvent(order.id, 'QR_SENT', { source: 'mock', qr_expired_at: qrExpiredAt });
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

  await logOrderEvent(order.id, 'CUSTOMER_CONFIRMED', { source: 'mock' });
  await logOrderEvent(order.id, 'QR_SENT', { source: 'mock', qr_expired_at: qrExpiredAt });

  // Create Pending invoice for COD orders only
  const rawMethod = order.payment_method || 'COD';
  const method = rawMethod.toUpperCase();
  const isCOD = method === 'COD';

  if (isCOD) {
    // Fetch the updated order to ensure we have the latest data
    const updatedOrder = { ...order, status: ORDER_STATUS.CUSTOMER_CONFIRMED };
    await ensurePendingInvoiceForOrder(updatedOrder);
  }
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

  await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { source: 'mock', reason });
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

  // 2) Log event
  await logOrderEvent(order.id, 'CUSTOMER_PAID', { source: 'mock' });

  // 3) Cập nhật Invoice tương ứng
  const updatedOrder: Order = {
    ...order,
    status: ORDER_STATUS.ORDER_PAID,
    paid_at: now,
  };

  try {
    await markInvoicePaidForOrder(updatedOrder);
    
    // 4) Generate and upload PDF if in browser environment
    if (typeof window !== 'undefined' && order.user_id) {
      const { getInvoiceByOrderId } = await import('../invoices/invoiceService');
      const { ensureInvoicePdfStored } = await import('../invoices/invoiceStorage');
      
      const invoice = await getInvoiceByOrderId(order.id, order.user_id);
      if (invoice) {
        try {
          await ensureInvoicePdfStored(invoice, updatedOrder);
        } catch (pdfError) {
          console.error('[mockZaloGateway] Failed to store invoice PDF', pdfError);
          // Don't break the flow if PDF upload fails
        }
      }
    }
  } catch (invoiceError) {
    console.error('[mockZaloGateway] Failed to mark invoice paid', invoiceError);
    // tuỳ m: có thể show toast báo lỗi, nhưng không nuốt im lặng nữa
  }
}


