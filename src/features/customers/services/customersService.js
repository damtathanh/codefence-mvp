import { supabase } from "../../../lib/supabaseClient";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { logUserAction } from "../../../utils/logUserAction";
function mapScoreToLevel(score) {
    if (score === null)
        return "none";
    if (score <= 30)
        return "low";
    if (score <= 70)
        return "medium";
    return "high";
}
const SUCCESS_STATUSES = new Set([
    ORDER_STATUS.ORDER_PAID,
    ORDER_STATUS.COMPLETED,
]);
const CUSTOMER_FAIL_STATUSES = new Set([
    ORDER_STATUS.CUSTOMER_CANCELLED,
    ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ORDER_STATUS.ORDER_REJECTED,
]);
export async function fetchCustomerStatsForUser(userId) {
    // 1. Fetch orders
    const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select([
        "order_id",
        "customer_name",
        "phone",
        "status",
        "risk_score",
        "order_date",
        "created_at",
        "amount",
        "payment_method",
    ].join(","))
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (ordersError || !ordersData) {
        return { data: [], error: ordersError };
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
    const blacklistMap = new Map(); // phone -> created_at
    if (blacklistData) {
        blacklistData.forEach((b) => {
            if (b.phone) {
                const phone = String(b.phone).trim();
                const existing = blacklistMap.get(phone);
                if (!existing || b.created_at < existing) {
                    blacklistMap.set(phone, b.created_at);
                }
            }
        });
    }
    // Group orders by phone
    const grouped = new Map();
    for (const row of ordersData) {
        const phone = (row.phone || "").trim();
        if (!phone)
            continue;
        const list = grouped.get(phone) ?? [];
        list.push(row);
        grouped.set(phone, list);
    }
    const customers = [];
    grouped.forEach((orders, phone) => {
        if (orders.length === 0)
            return;
        const totalOrders = orders.length;
        let successCount = 0;
        let failedCount = 0;
        const codRiskScores = [];
        let lastOrderAt = null;
        let fullName = null;
        for (const order of orders) {
            const status = order.status;
            // Ưu tiên order_date, nếu null thì dùng created_at
            const effectiveDate = order.order_date ?? order.created_at ?? null;
            if (SUCCESS_STATUSES.has(status)) {
                successCount += 1;
            }
            else if (CUSTOMER_FAIL_STATUSES.has(status)) {
                failedCount += 1;
            }
            const isCOD = !order.payment_method || order.payment_method.toUpperCase() === "COD";
            if (isCOD &&
                order.risk_score !== null &&
                order.risk_score !== undefined) {
                codRiskScores.push(order.risk_score);
            }
            if (!lastOrderAt || (effectiveDate && effectiveDate > lastOrderAt)) {
                lastOrderAt = effectiveDate;
                fullName = order.customer_name ?? null;
            }
        }
        // 1. Base Risk Score (avg COD risk_score hoặc default 50)
        let baseRiskScore;
        if (codRiskScores.length > 0) {
            const sum = codRiskScores.reduce((acc, val) => acc + val, 0);
            baseRiskScore = sum / codRiskScores.length;
        }
        else {
            baseRiskScore = 50;
        }
        // 2. Learning Logic theo timeline
        const sortedOrders = [...orders].sort((a, b) => {
            const tA = a.order_date
                ? new Date(a.order_date).getTime()
                : a.created_at
                    ? new Date(a.created_at).getTime()
                    : 0;
            const tB = b.order_date
                ? new Date(b.order_date).getTime()
                : b.created_at
                    ? new Date(b.created_at).getTime()
                    : 0;
            return tA - tB;
        });
        let currentScore = baseRiskScore;
        const blacklistCreatedAt = blacklistMap.get(phone);
        for (const order of sortedOrders) {
            const status = order.status;
            const amount = order.amount || 0;
            const createdAt = order.order_date || order.created_at || "";
            let delta = 0;
            if (SUCCESS_STATUSES.has(status)) {
                delta = -5;
                if (amount >= 1000000) {
                    delta = -10;
                }
            }
            else if (CUSTOMER_FAIL_STATUSES.has(status)) {
                delta = 20;
            }
            // Nếu tại thời điểm order này, phone đã nằm trong blacklist
            // và shop vẫn ship (status != ORDER_REJECTED) → nhân đôi penalty/bonus
            if (blacklistCreatedAt &&
                createdAt > blacklistCreatedAt &&
                status !== ORDER_STATUS.ORDER_REJECTED) {
                delta = delta * 2;
            }
            currentScore += delta;
        }
        // Clamp final score 0–100
        const customerRiskScore = Math.max(0, Math.min(100, currentScore));
        // Map to level
        const customerRiskLevel = mapScoreToLevel(customerRiskScore);
        customers.push({
            phone,
            fullName,
            totalOrders,
            successCount,
            failedCount,
            baseRiskScore: codRiskScores.length > 0 ? baseRiskScore : null,
            customerRiskScore,
            customerRiskLevel,
            lastOrderAt,
        });
    });
    // Sort by lastOrderAt desc
    customers.sort((a, b) => {
        if (!a.lastOrderAt && !b.lastOrderAt)
            return 0;
        if (!a.lastOrderAt)
            return 1;
        if (!b.lastOrderAt)
            return -1;
        return b.lastOrderAt.localeCompare(a.lastOrderAt);
    });
    return { data: customers, error: null };
}
export async function fetchCustomerBlacklist(userId) {
    const { data, error } = await supabase
        .from("customer_blacklist")
        .select("id, phone, reason, created_at")
        .eq("user_id", userId);
    const sorted = data?.slice().sort((a, b) => {
        const aa = a.created_at ?? "";
        const bb = b.created_at ?? "";
        return bb.localeCompare(aa);
    }) ?? [];
    return { data: sorted, error };
}
/**
 * Add phone to blacklist with optional reason.
 * Return shape: { data, error } để CustomersPage destructure được.
 */
export async function addToBlacklist(userId, phone, reason) {
    const { data, error } = await supabase
        .from("customer_blacklist")
        .upsert({
        user_id: userId,
        phone,
        reason: reason ?? null,
        created_at: new Date().toISOString(),
    }, { onConflict: "user_id,phone" })
        .select("id, phone, reason, created_at")
        .single();
    if (!error) {
        const details = {
            phone,
        };
        if (reason && reason.trim()) {
            details.reason = reason.trim();
        }
        await logUserAction({
            userId,
            action: "Add to Blacklist",
            status: "success",
            orderId: "",
            details,
        });
    }
    return {
        data: data ?? null,
        error,
    };
}
/**
 * Remove phone from blacklist.
 * Return shape: { data, error } cho đồng bộ.
 */
export async function removeFromBlacklist(userId, phone) {
    const { error } = await supabase
        .from("customer_blacklist")
        .delete()
        .eq("user_id", userId)
        .eq("phone", phone);
    if (!error) {
        const details = { phone };
        await logUserAction({
            userId,
            action: "Remove from Blacklist",
            status: "success",
            orderId: "",
            details,
        });
    }
    return { data: !error, error };
}
// ==========================
// Orders for a customer
// ==========================
export async function fetchCustomerOrdersForUser(userId, phone) {
    const trimmed = phone.trim();
    if (!trimmed) {
        return { data: [], error: null };
    }
    const { data, error } = await supabase
        .from("orders")
        .select([
        "order_id",
        "customer_name",
        "phone",
        "status",
        "risk_score",
        "order_date",
        "created_at",
        "amount",
        "payment_method",
        "address",
        "address_detail",
        "ward",
        "district",
        "province",
    ].join(","))
        .eq("user_id", userId)
        .eq("phone", trimmed)
        .order("created_at", { ascending: false });
    return {
        data: (data || []),
        error,
    };
}
