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
  const updatedOrder: Order = {
    ...order,
    status: ORDER_STATUS.ORDER_PAID,
    paid_at: now,
  };

  try {
    await markInvoicePaidForOrder(updatedOrder);

    // 4) Generate and upload PDF if in browser environment
    if (typeof window !== 'undefined' && order.user_id) {
      const { getInvoiceByOrderId } = await import('../invoices/services/invoiceService');
      const { ensureInvoicePdfStored } = await import('../invoices/services/invoiceStorage');

      const invoice = await getInvoiceByOrderId(order.id, order.user_id);
      if (invoice) {
        try {
          // Fetch seller profile for PDF generation
          let sellerProfile = {
            company_name: undefined,
            email: undefined,
            phone: undefined,
            website: undefined,
            address: undefined,
          };

          const { data: profileData } = await supabase
            .from("users_profile")
            .select("company_name, email, phone, website, address")
            .eq("id", order.user_id)
            .maybeSingle();

          if (profileData) {
            sellerProfile = {
              company_name: profileData.company_name || undefined,
              email: profileData.email || undefined,
              phone: profileData.phone || undefined,
              website: (profileData as any).website || undefined,
              address: (profileData as any).address || undefined,
            };
          }

          await ensureInvoicePdfStored(invoice, updatedOrder, sellerProfile);
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


