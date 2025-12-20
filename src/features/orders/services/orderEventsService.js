import { supabase } from "../../../lib/supabaseClient";
/**
 * Fetch order events for a specific order
 */
export async function fetchOrderEvents(orderId) {
    return supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
}
/**
 * Insert a single order event
 */
export async function insertOrderEvent(payload) {
    const { data, error } = await supabase
        .from("order_events")
        .insert(payload)
        .select()
        .single();
    if (error) {
        console.error("[insertOrderEvent] error", error);
        throw error;
    }
    return data;
}
/**
 * Insert multiple order events (bulk)
 */
export async function insertOrderEvents(payloads) {
    const { data, error } = await supabase
        .from("order_events")
        .insert(payloads)
        .select();
    if (error) {
        console.error("[insertOrderEvents] error", error);
        throw error;
    }
    return (data || []);
}
/**
 * Unified helper to log an order event.
 * This matches how other services call logOrderEvent(orderId, type, metadata, source).
 */
export async function logOrderEvent(orderId, eventType, metadata = {}, source = "system") {
    const cleanedMetadata = Object.fromEntries(Object.entries(metadata ?? {}).filter(([, v]) => v !== undefined && v !== ""));
    const payload = {
        order_id: orderId,
        event_type: eventType,
        payload_json: {
            ...cleanedMetadata,
            source,
        },
    };
    return insertOrderEvent(payload);
}
/**
 * Log order paid event (manual action from Invoices page)
 */
export async function logOrderPaidEvent(orderId) {
    return logOrderEvent(orderId, "ORDER_PAID", { source: "manual_invoice_mark_paid" }, "invoice_page");
}
