import { supabase } from "../../../lib/supabaseClient";
import { ORDER_STATUS } from "../../../constants/orderStatus";
/**
 * Normalize an address string into a key used for grouping.
 */
export function makeAddressKey(address) {
    if (!address)
        return null;
    return address
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[.,;:]+/g, "");
}
const successStatuses = new Set([
    ORDER_STATUS.ORDER_PAID,
    ORDER_STATUS.COMPLETED,
]);
const boomStatuses = new Set([
    ORDER_STATUS.CUSTOMER_CANCELLED,
    ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ORDER_STATUS.ORDER_REJECTED,
]);
/**
 * Fetch phone-level outcome stats for a set of phones.
 */
export async function fetchPhoneHistoryForUser(userId, phones) {
    const uniquePhones = Array.from(new Set(phones.filter((p) => p && p.trim()).map((p) => p.trim())));
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
    const result = {};
    for (const row of (data || [])) {
        const phone = (row.phone || "").trim();
        if (!phone)
            continue;
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
export async function fetchAddressHistoryForUser(userId, addresses) {
    const keys = Array.from(new Set(addresses
        .map((addr) => makeAddressKey(addr))
        .filter((k) => Boolean(k))));
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
    const result = {};
    for (const row of (data || [])) {
        const addr = row.address || "";
        const key = makeAddressKey(addr);
        if (!key || !keySet.has(key))
            continue;
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
export async function fetchAreaHistoryForUser(_userId, _areas) {
    // TODO: When orders table gains structured area fields (province/district/ward/street),
    // implement aggregation logic here.
    return [];
}
