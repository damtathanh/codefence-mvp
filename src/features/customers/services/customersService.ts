import { supabase } from "../../../lib/supabaseClient";
import type { Order } from "../../../types/supabase";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import type { RiskLevel } from "../../../utils/riskEngine";


export interface CustomerStats {
  phone: string;
  lastName: string | null;
  totalOrders: number;
  successCount: number;
  failedCount: number;
  baseRiskScore: number | null;
  customerRiskScore: number | null;
  customerRiskLevel: RiskLevel;
  lastOrderAt: string | null;
}

function mapScoreToLevel(score: number | null): RiskLevel {
  if (score === null) return "none";
  if (score <= 30) return "low";
  if (score <= 70) return "medium";
  return "high";
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
        "amount",
        "payment_method"
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
    .select("phone, created_at")
    .eq("user_id", userId);

  if (blacklistError) {
    console.error("Error fetching blacklist in customer stats:", blacklistError);
  }

  // Map phone -> earliest blacklist created_at
  const blacklistMap = new Map<string, string>(); // phone -> created_at
  if (blacklistData) {
    blacklistData.forEach((b) => {
      if (b.phone) {
        const phone = b.phone.trim();
        const existing = blacklistMap.get(phone);
        if (!existing || b.created_at < existing) {
          blacklistMap.set(phone, b.created_at);
        }
      }
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
    const codRiskScores: number[] = [];

    let lastOrderAt: string | null = null;
    let lastName: string | null = null;

    // First pass: basic stats and collect COD scores
    for (const order of orders) {
      const status = order.status;
      const createdAt = order.created_at ?? null;

      if (SUCCESS_STATUSES.has(status)) {
        successCount += 1;
      } else if (CUSTOMER_FAIL_STATUSES.has(status)) {
        failedCount += 1;
      }

      // Only consider COD orders for base risk score calculation
      const isCOD = !order.payment_method || order.payment_method.toUpperCase() === "COD";
      if (isCOD && order.risk_score !== null && order.risk_score !== undefined) {
        codRiskScores.push(order.risk_score);
      }

      if (!lastOrderAt || (createdAt && createdAt > lastOrderAt)) {
        lastOrderAt = createdAt;
        lastName = extractLastName(order.customer_name ?? null);
      }
    }

    // 1. Calculate Base Risk Score
    let baseRiskScore: number;
    if (codRiskScores.length > 0) {
      const sum = codRiskScores.reduce((acc, val) => acc + val, 0);
      baseRiskScore = sum / codRiskScores.length;
    } else {
      baseRiskScore = 50; // Default if no COD risk scores
    }

    // 2. Calculate Customer Risk Score (Learning Logic)
    // Sort orders chronologically (oldest first)
    const sortedOrders = [...orders].sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tA - tB;
    });

    let currentScore = baseRiskScore;
    const blacklistCreatedAt = blacklistMap.get(phone);

    for (const order of sortedOrders) {
      const status = order.status;
      const amount = order.amount || 0;
      const createdAt = order.created_at || "";

      let delta = 0;

      if (SUCCESS_STATUSES.has(status)) {
        delta = -5;
        if (amount >= 1_000_000) {
          delta = -10;
        }
      } else if (CUSTOMER_FAIL_STATUSES.has(status)) {
        delta = 20;
      }

      // Check blacklist multiplier
      // "If, at the time this order was created, the (user_id, phone) already exists in customer_blacklist"
      // AND status is NOT REJECTED (shop ignored blacklist)
      if (blacklistCreatedAt && createdAt > blacklistCreatedAt && status !== ORDER_STATUS.ORDER_REJECTED) {
        // Double the effect
        delta *= 2;
      }

      currentScore += delta;
    }

    // Clamp final score
    const customerRiskScore = Math.max(0, Math.min(100, currentScore));

    // Map to level
    const customerRiskLevel = mapScoreToLevel(customerRiskScore);

    customers.push({
      phone,
      lastName,
      totalOrders,
      successCount,
      failedCount,
      baseRiskScore: codRiskScores.length > 0 ? baseRiskScore : null,
      customerRiskScore,
      customerRiskLevel,
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
  const { data, error } = await supabase
    .from("customer_blacklist")
    .insert([{ user_id: userId, phone, reason: reason ?? null }])
    .select()
    .single();

  if (!error) {
    // Trigger risk re-evaluation for pending orders
    await supabase.rpc('reevaluate_risk_for_phone', {
      p_user_id: userId,
      p_phone: phone
    });
  }

  return { data, error };
}

export async function removeFromBlacklist(userId: string, phone: string) {
  return await supabase
    .from("customer_blacklist")
    .delete()
    .eq("user_id", userId)
    .eq("phone", phone);
}

export async function fetchCustomerOrdersForUser(userId: string, phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { data: [] as Order[], error: null };
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      [
        "order_id",
        "customer_name",
        "phone",
        "status",
        "risk_score",
        "created_at",
        "amount",
        "payment_method",
        "address",
        "address_detail",
        "ward",
        "district",
        "province",
      ].join(",")
    )
    .eq("user_id", userId)
    .eq("phone", trimmed)
    .order("created_at", { ascending: false });

  return {
    data: (data || []) as unknown as Order[],
    error,
  };
}
