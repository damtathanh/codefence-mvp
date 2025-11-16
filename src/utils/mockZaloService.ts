import { supabase } from '../lib/supabaseClient';
import type { Order } from '../types/supabase';

type ZaloEventType =
  | 'CONFIRMATION_SENT'
  | 'CUSTOMER_CONFIRMED'
  | 'CUSTOMER_CANCELLED'
  | 'CUSTOMER_PAID'
  | 'QR_SENT';

async function logOrderEvent(orderId: string, event_type: ZaloEventType, payload: any = {}) {
  const { error } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type,
    payload_json: payload,
  });

  if (error) {
    console.error('[mockZaloService] Failed to insert order_event', error);
    throw error;
  }
}

export async function sendConfirmation(order: Order) {
  const now = new Date().toISOString();

  // Update the order status and confirmation_sent_at timestamp
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'Order Confirmation Sent',
      confirmation_sent_at: now,
    })
    .eq('id', order.id);

  if (error) {
    console.error('[mockZaloService] Failed to send confirmation', error);
    throw error;
  }

  await logOrderEvent(order.id, 'CONFIRMATION_SENT', { source: 'mock' });
}

export async function simulateCustomerConfirmed(order: Order) {
  const now = new Date().toISOString();
  const qrExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'Order Confirmed',
      customer_confirmed_at: now,
      qr_sent_at: now,
      qr_expired_at: qrExpiredAt,
    })
    .eq('id', order.id);

  if (error) {
    console.error('[mockZaloService] Failed to simulate customer confirmed', error);
    throw error;
  }

  await logOrderEvent(order.id, 'CUSTOMER_CONFIRMED', { source: 'mock' });
  await logOrderEvent(order.id, 'QR_SENT', { source: 'mock', qr_expired_at: qrExpiredAt });
}

export async function simulateCustomerCancelled(order: Order, reason: string) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'Customer Cancelled',
      customer_confirmed_at: now,
      cancelled_at: now,
      cancel_reason: reason,
    })
    .eq('id', order.id);

  if (error) {
    console.error('[mockZaloService] Failed to simulate customer cancelled', error);
    throw error;
  }

  await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { source: 'mock', reason });
}

export async function simulateCustomerPaid(order: Order) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'Order Paid',
      paid_at: now,
    })
    .eq('id', order.id);

  if (error) {
    console.error('[mockZaloService] Failed to simulate customer paid', error);
    throw error;
  }

  await logOrderEvent(order.id, 'CUSTOMER_PAID', { source: 'mock' });
}

