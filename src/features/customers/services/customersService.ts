import { supabase } from "../../../lib/supabaseClient";
import type { Order } from "../../../types/supabase";
import { ORDER_STATUS } from "../../../constants/orderStatus";


export interface CustomerStats {
  phone: string;
  lastName: string | null;
  totalOrders: number;
  successCount: number;
  failedCount: number;
  baseRiskScore: number | null;
  customerRiskScore: number | null;
  lastOrderAt: string | null;
}



function extractLastName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1] : null;
}

const SUCCESS_STATUSES = new Set<string>([
  ORDER_STATUS.ORDER_PAID,
  ORDER_STATUS.COMPLETED,
]);

const CUSTOMER_FAIL_STATUSES = new Set<string>([
  ORDER_STATUS.CUSTOMER_CANCELLED,
  ORDER_STATUS.CUSTOMER_UNREACHABLE,
  ORDER_STATUS.ORDER_REJECTED,
]);

// ⛔⛔⛔ CHỖ QUAN TRỌNG NHẤT
// PHẢI CÓ EXPORT NÀY
export async function fetchCustomerStatsForUser(userId: string) {
  // 1. Fetch orders
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select(
      [
        "order_id",
        "customer_name",
        "phone",
        "status",
        "risk_score",
        "created_at",
      ].join(",")
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersError || !ordersData) {
    return { data: [] as CustomerStats[], error: ordersError };
  }

  // 2. Fetch blacklist for this user
  const { data: blacklistData, error: blacklistError } = await supabase
    .from("customer_blacklist")
    .select("phone")
    .eq("user_id", userId);

  if (blacklistError) {
    // If blacklist fetch fails, we can either fail or proceed without blacklist.
    // Proceeding seems safer to show at least some data, but let's log it.
    console.error("Error fetching blacklist in customer stats:", blacklistError);
  }

  const blacklistedPhones = new Set<string>();
  if (blacklistData) {
    blacklistData.forEach((b) => {
      if (b.phone) blacklistedPhones.add(b.phone.trim());
    });
  }

  const grouped = new Map<string, Order[]>();

  for (const row of ordersData as unknown as Order[]) {
    const phone = (row.phone || "").trim();
    if (!phone) continue;
    const list = grouped.get(phone) ?? [];
    list.push(row);
    grouped.set(phone, list);
  }

  const customers: CustomerStats[] = [];

  grouped.forEach((orders, phone) => {
    if (orders.length === 0) return;

    const totalOrders = orders.length;
    let successCount = 0;
    let failedCount = 0;
    const riskScores: number[] = [];

    let lastOrderAt: string | null = null;
    let lastName: string | null = null;

    for (const order of orders) {
      const status = order.status;
      const createdAt = order.created_at ?? null;

      if (SUCCESS_STATUSES.has(status)) {
        successCount += 1;
      } else if (CUSTOMER_FAIL_STATUSES.has(status)) {
        failedCount += 1;
      }

      if (order.risk_score !== null && order.risk_score !== undefined) {
        riskScores.push(order.risk_score);
      }

      if (!lastOrderAt || (createdAt && createdAt > lastOrderAt)) {
        lastOrderAt = createdAt;
        lastName = extractLastName(order.customer_name ?? null);
      }
    }

    // Calculate base average risk
    let baseAvg: number;
    if (riskScores.length > 0) {
      const sum = riskScores.reduce((acc, val) => acc + val, 0);
      baseAvg = sum / riskScores.length;
    } else {
      // If no risk scores, default to 0 so we have a number
      baseAvg = 0;
    }

    // Apply blacklist bonus
    const isBlacklisted = blacklistedPhones.has(phone);
    let finalScore = baseAvg;

    if (isBlacklisted) {
      finalScore += 50;
    }

    // Clamp to 0-100
    finalScore = Math.max(0, Math.min(100, finalScore));

    // If there were absolutely no risk scores and not blacklisted,
    // baseAvg is 0, finalScore is 0.
    // If we want to distinguish "no data" from "0 risk", we could use null,
    // but the requirement says "Prefer 0 so we always have a number".
    // However, if riskScores is empty AND not blacklisted, maybe 0 is fine.

    customers.push({
      phone,
      lastName,
      totalOrders,
      successCount,
      failedCount,
      baseRiskScore: riskScores.length > 0 ? baseAvg : null, // Keep base as null if no data for reference
      customerRiskScore: finalScore,
      lastOrderAt,
    });
  });

  customers.sort((a, b) => {
    if (!a.lastOrderAt && !b.lastOrderAt) return 0;
    if (!a.lastOrderAt) return 1;
    if (!b.lastOrderAt) return -1;
    return a.lastOrderAt.localeCompare(b.lastOrderAt) * -1;
  });

  return { data: customers, error: null };
}

// ==========================
// Customer Blacklist
// ==========================

export interface CustomerBlacklistEntry {
  id: string;
  phone: string;
  reason: string | null;
  created_at: string;
}

export async function fetchCustomerBlacklist(userId: string) {
  const { data, error } = await supabase
    .from("customer_blacklist")
    .select("id, phone, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
}

export async function addToBlacklist(userId: string, phone: string, reason?: string) {
  return await supabase
    .from("customer_blacklist")
    .insert([{ user_id: userId, phone, reason: reason ?? null }])
    .select()
    .single();
}

export async function removeFromBlacklist(userId: string, phone: string) {
  return await supabase
    .from("customer_blacklist")
    .delete()
    .eq("user_id", userId)
    .eq("phone", phone);
}
