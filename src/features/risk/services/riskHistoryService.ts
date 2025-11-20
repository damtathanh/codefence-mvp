import { supabase } from "../../../lib/supabaseClient";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import type { Order, RiskLevel } from "../../../types/supabase";

export interface CustomerOutcomeStats {
  phone: string;
  total_orders: number;
  success_orders: number;
  failed_orders: number;
  boom_orders: number;
}

export interface AddressOutcomeStats {
  address_key: string;
  full_address: string | null;
  total_orders: number;
  success_orders: number;
  failed_orders: number;
  boom_orders: number;
}

export interface AreaOutcomeStats {
  province: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  total_orders: number;
  success_orders: number;
  failed_orders: number;
  boom_orders: number;
}

/**
 * Normalize an address string into a key used for grouping.
 */
export function makeAddressKey(address: string | null | undefined): string | null {
  if (!address) return null;
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+/g, "");
}

const successStatuses = new Set<string>([
  ORDER_STATUS.ORDER_PAID,
  ORDER_STATUS.COMPLETED,
]);

const boomStatuses = new Set<string>([
  ORDER_STATUS.CUSTOMER_CANCELLED,
  ORDER_STATUS.CUSTOMER_UNREACHABLE,
  ORDER_STATUS.ORDER_REJECTED,
]);

/**
 * Fetch phone-level outcome stats for a set of phones.
 */
export async function fetchPhoneHistoryForUser(
  userId: string,
  phones: string[]
): Promise<Record<string, CustomerOutcomeStats>> {
  const uniquePhones = Array.from(
    new Set(phones.filter((p) => p && p.trim()).map((p) => p.trim()))
  );

  if (uniquePhones.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("orders")
    .select("phone, status")
    .eq("user_id", userId)
    .in("phone", uniquePhones);

  if (error) {
    console.error("Error fetching phone history:", error);
    throw error;
  }

  const result: Record<string, CustomerOutcomeStats> = {};

  for (const row of (data || []) as Pick<Order, "phone" | "status">[]) {
    const phone = (row.phone || "").trim();
    if (!phone) continue;
    if (!result[phone]) {
      result[phone] = {
        phone,
        total_orders: 0,
        success_orders: 0,
        failed_orders: 0,
        boom_orders: 0,
      };
    }

    const stats = result[phone];
    stats.total_orders += 1;

    if (successStatuses.has(row.status)) {
      stats.success_orders += 1;
    }

    if (boomStatuses.has(row.status)) {
      stats.failed_orders += 1;
      stats.boom_orders += 1;
    }
  }

  return result;
}

/**
 * Fetch address-level outcome stats for a set of addresses.
 */
export async function fetchAddressHistoryForUser(
  userId: string,
  addresses: string[]
): Promise<Record<string, AddressOutcomeStats>> {
  const keys = Array.from(
    new Set(
      addresses
        .map((addr) => makeAddressKey(addr))
        .filter((k): k is string => Boolean(k))
    )
  );

  if (keys.length === 0) {
    return {};
  }

  // For now, fetch all orders with non-null address for this user and filter in JS.
  const { data, error } = await supabase
    .from("orders")
    .select("address, status")
    .eq("user_id", userId)
    .not("address", "is", null);

  if (error) {
    console.error("Error fetching address history:", error);
    throw error;
  }

  const keySet = new Set(keys);
  const result: Record<string, AddressOutcomeStats> = {};

  for (const row of (data || []) as Pick<Order, "address" | "status">[]) {
    const addr = row.address || "";
    const key = makeAddressKey(addr);
    if (!key || !keySet.has(key)) continue;

    if (!result[key]) {
      result[key] = {
        address_key: key,
        full_address: addr,
        total_orders: 0,
        success_orders: 0,
        failed_orders: 0,
        boom_orders: 0,
      };
    }

    const stats = result[key];
    stats.total_orders += 1;

    if (successStatuses.has(row.status)) {
      stats.success_orders += 1;
    }

    if (boomStatuses.has(row.status)) {
      stats.failed_orders += 1;
      stats.boom_orders += 1;
    }
  }

  return result;
}

/**
 * Fetch area-level outcome stats for a set of areas.
 * NOTE: Currently a placeholder – orders table does not have structured area columns.
 */
export async function fetchAreaHistoryForUser(
  _userId: string,
  _areas: { province?: string | null; district?: string | null; ward?: string | null; street?: string | null }[]
): Promise<AreaOutcomeStats[]> {
  // TODO: When orders table gains structured area fields (province/district/ward/street),
  // implement aggregation logic here.
  return [];
}

