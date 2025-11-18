import { supabase } from "../../../lib/supabaseClient";
import type { OrderEvent } from "../../../types/supabase";

export interface InsertOrderEventPayload {
  order_id: string;
  event_type: string;
  payload_json: any;
}

/**
 * Fetch order events for a specific order
 */
export async function fetchOrderEvents(orderId: string) {
  return supabase
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
}

/**
 * Insert a single order event
 */
export async function insertOrderEvent(payload: InsertOrderEventPayload) {
  return supabase
    .from("order_events")
    .insert(payload);
}

/**
 * Insert multiple order events (bulk)
 */
export async function insertOrderEvents(payloads: InsertOrderEventPayload[]) {
  return supabase
    .from("order_events")
    .insert(payloads);
}

