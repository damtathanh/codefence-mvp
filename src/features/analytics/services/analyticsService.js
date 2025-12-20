import { supabase } from "../../../lib/supabaseClient";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { resolveDashboardDateRange } from "../../dashboard/useDashboardStats";
const successStatuses = new Set([
    ORDER_STATUS.ORDER_PAID,
    ORDER_STATUS.COMPLETED,
]);
const boomStatuses = new Set([
    ORDER_STATUS.CUSTOMER_CANCELLED,
    ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ORDER_STATUS.ORDER_REJECTED,
]);
// --- Fetch Functions ---
export async function fetchCodReturnAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("*")
        .eq("user_id", userId)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching COD analytics:", error);
        return { codStatus: [], codByRegion: [] };
    }
    const orders = data || [];
    const codOrders = orders.filter(o => o.is_cod);
    // Status Breakdown
    const statusMap = new Map();
    codOrders.forEach(o => {
        statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    });
    const codStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
    // Region Breakdown
    const regionMap = new Map();
    codOrders.forEach(o => {
        const province = o.province || "Unknown";
        const district = o.district || "Unknown";
        const key = `${province}|${district}`;
        if (!regionMap.has(key)) {
            regionMap.set(key, { province, district, totalCodOrders: 0, failedCodOrders: 0, boomRate: 0 });
        }
        const region = regionMap.get(key);
        region.totalCodOrders++;
        if (boomStatuses.has(o.status))
            region.failedCodOrders++;
    });
    const codByRegion = Array.from(regionMap.values()).map(r => ({
        ...r,
        boomRate: r.totalCodOrders > 0 ? (r.failedCodOrders / r.totalCodOrders) * 100 : 0
    })).sort((a, b) => b.boomRate - a.boomRate);
    return { codStatus, codByRegion };
}
export async function fetchRiskScoreAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("*")
        .eq("user_id", userId)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching risk analytics:", error);
        return { buckets: [] };
    }
    const orders = data || [];
    const codOrders = orders.filter(o => o.is_cod);
    const buckets = {
        "0-30": { label: "0-30", total: 0, success: 0, failed: 0, boomRate: 0 },
        "31-70": { label: "31-70", total: 0, success: 0, failed: 0, boomRate: 0 },
        "71-100": { label: "71-100", total: 0, success: 0, failed: 0, boomRate: 0 },
        "no_score": { label: "No Score", total: 0, success: 0, failed: 0, boomRate: 0 },
    };
    codOrders.forEach(o => {
        let bucketKey = "no_score";
        if (o.risk_score !== null && o.risk_score !== undefined) {
            if (o.risk_score <= 30)
                bucketKey = "0-30";
            else if (o.risk_score <= 70)
                bucketKey = "31-70";
            else
                bucketKey = "71-100";
        }
        const bucket = buckets[bucketKey];
        bucket.total++;
        if (successStatuses.has(o.status))
            bucket.success++;
        if (boomStatuses.has(o.status))
            bucket.failed++;
    });
    const resultBuckets = Object.values(buckets).map(b => ({
        ...b,
        boomRate: b.total > 0 ? (b.failed / b.total) * 100 : 0
    }));
    return { buckets: resultBuckets };
}
export async function fetchVerificationFunnelAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("*")
        .eq("user_id", userId)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching funnel analytics:", error);
        return { steps: [] };
    }
    const orders = data || [];
    const codOrders = orders.filter(o => o.is_cod);
    const created = codOrders.length;
    const confirmation_sent = codOrders.filter(o => o.confirmation_sent_at).length;
    const customer_confirmed = codOrders.filter(o => o.customer_confirmed_at).length;
    const customer_cancelled = codOrders.filter(o => o.status === ORDER_STATUS.CUSTOMER_CANCELLED).length;
    const paid = codOrders.filter(o => o.paid_at || o.status === ORDER_STATUS.ORDER_PAID || o.status === ORDER_STATUS.COMPLETED).length;
    // No response approximation: sent but not confirmed/cancelled/paid yet
    const no_response = Math.max(0, confirmation_sent - (customer_confirmed + customer_cancelled));
    const steps = [
        { key: "created", label: "Created", count: created },
        { key: "confirmation_sent", label: "Confirmation Sent", count: confirmation_sent },
        { key: "customer_confirmed", label: "Confirmed", count: customer_confirmed },
        { key: "customer_cancelled", label: "Cancelled", count: customer_cancelled },
        { key: "no_response", label: "No Response", count: no_response },
        { key: "paid", label: "Paid", count: paid },
    ];
    return { steps };
}
export async function fetchAddressRiskAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("address, status, created_at")
        .eq("user_id", userId)
        .not("address", "is", null)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching address analytics:", error);
        return { addresses: [] };
    }
    const orders = data || [];
    const addressMap = new Map();
    orders.forEach(o => {
        const addr = o.address || "";
        const key = addr.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:]+/g, "");
        if (!key)
            return;
        if (!addressMap.has(key)) {
            addressMap.set(key, {
                address_key: key,
                full_address: addr,
                total_orders: 0,
                success_orders: 0,
                failed_orders: 0,
                boom_orders: 0,
                last_order_at: null
            });
        }
        const stats = addressMap.get(key);
        stats.total_orders++;
        if (successStatuses.has(o.status))
            stats.success_orders++;
        if (boomStatuses.has(o.status)) {
            stats.failed_orders++;
            stats.boom_orders++;
        }
        if (o.created_at) {
            if (!stats.last_order_at || new Date(o.created_at) > new Date(stats.last_order_at)) {
                stats.last_order_at = o.created_at;
            }
        }
    });
    const addresses = Array.from(addressMap.values())
        .filter(a => a.total_orders > 0)
        .sort((a, b) => b.boom_orders - a.boom_orders);
    return { addresses };
}
export async function fetchCustomerAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("phone, status, created_at")
        .eq("user_id", userId)
        .not("phone", "is", null)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching customer analytics:", error);
        return { topBoomCustomers: [], topGoodCustomers: [] };
    }
    const orders = data || [];
    const customerMap = new Map();
    orders.forEach(o => {
        const phone = (o.phone || "").trim();
        if (!phone)
            return;
        if (!customerMap.has(phone)) {
            customerMap.set(phone, {
                phone,
                totalOrders: 0,
                successOrders: 0,
                failedOrders: 0,
                boomRate: 0,
                lastOrderAt: null
            });
        }
        const stats = customerMap.get(phone);
        stats.totalOrders++;
        if (successStatuses.has(o.status))
            stats.successOrders++;
        if (boomStatuses.has(o.status))
            stats.failedOrders++;
        if (o.created_at) {
            if (!stats.lastOrderAt || new Date(o.created_at) > new Date(stats.lastOrderAt)) {
                stats.lastOrderAt = o.created_at;
            }
        }
    });
    const allCustomers = Array.from(customerMap.values()).map(c => ({
        ...c,
        boomRate: c.totalOrders > 0 ? (c.failedOrders / c.totalOrders) * 100 : 0
    }));
    const topBoomCustomers = allCustomers
        .filter(c => c.failedOrders > 0)
        .sort((a, b) => {
        if (b.boomRate !== a.boomRate)
            return b.boomRate - a.boomRate;
        return b.totalOrders - a.totalOrders;
    })
        .slice(0, 20);
    const topGoodCustomers = allCustomers
        .filter(c => c.failedOrders === 0 && c.totalOrders >= 2)
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 20);
    return { topBoomCustomers, topGoodCustomers };
}
export async function fetchProductChannelAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("product_id, product, status")
        .eq("user_id", userId)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching product analytics:", error);
        return { productStats: [], channelStats: [] };
    }
    const orders = data || [];
    const productMap = new Map();
    orders.forEach(o => {
        const key = o.product_id || o.product || "Unknown";
        const name = o.product || "Unknown Product";
        if (!productMap.has(key)) {
            productMap.set(key, {
                product_id: o.product_id || null,
                product_name: name,
                totalOrders: 0,
                failedOrders: 0,
                boomRate: 0
            });
        }
        const stats = productMap.get(key);
        stats.totalOrders++;
        if (boomStatuses.has(o.status))
            stats.failedOrders++;
    });
    const productStats = Array.from(productMap.values())
        .map(p => ({
        ...p,
        boomRate: p.totalOrders > 0 ? (p.failedOrders / p.totalOrders) * 100 : 0
    }))
        .sort((a, b) => b.boomRate - a.boomRate);
    const channelStats = [];
    return { productStats, channelStats };
}
export async function fetchOperationalAnalytics(userId, dateRange, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const { data, error } = await supabase
        .from("analytics_order_facts")
        .select("*")
        .eq("user_id", userId)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    if (error) {
        console.error("Error fetching operational analytics:", error);
        return { avgTimeToConfirmation: null, avgTimeToPaid: null, pendingConfirmationOver24h: 0, deliveringOverXDays: 0 };
    }
    const orders = data || [];
    const codOrders = orders.filter(o => o.is_cod);
    // Avg Time to Confirmation
    let totalConfirmationTime = 0;
    let confirmationCount = 0;
    codOrders.forEach(o => {
        if (o.created_at && o.customer_confirmed_at) {
            const created = new Date(o.created_at).getTime();
            const confirmed = new Date(o.customer_confirmed_at).getTime();
            const diffMinutes = (confirmed - created) / (1000 * 60);
            if (diffMinutes > 0) {
                totalConfirmationTime += diffMinutes;
                confirmationCount++;
            }
        }
    });
    const avgTimeToConfirmation = confirmationCount > 0 ? Math.round(totalConfirmationTime / confirmationCount) : null;
    // Avg Time to Paid
    let totalPaidTime = 0;
    let paidCount = 0;
    orders.forEach(o => {
        if (o.created_at && o.paid_at) {
            const created = new Date(o.created_at).getTime();
            const paid = new Date(o.paid_at).getTime();
            const diffHours = (paid - created) / (1000 * 60 * 60);
            if (diffHours > 0) {
                totalPaidTime += diffHours;
                paidCount++;
            }
        }
    });
    const avgTimeToPaid = paidCount > 0 ? Math.round(totalPaidTime / paidCount) : null;
    // Pending > 24h
    const now = new Date().getTime();
    const pendingStatuses = new Set([
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS.VERIFICATION_REQUIRED,
        ORDER_STATUS.ORDER_CONFIRMATION_SENT
    ]);
    const pendingConfirmationOver24h = codOrders.filter(o => {
        if (!pendingStatuses.has(o.status) || !o.created_at)
            return false;
        const created = new Date(o.created_at).getTime();
        return (now - created) > (24 * 60 * 60 * 1000);
    }).length;
    // Delivering > 3 days
    const deliveringOverXDays = orders.filter(o => {
        if (o.status !== ORDER_STATUS.DELIVERING || !o.shipped_at)
            return false;
        const shipped = new Date(o.shipped_at).getTime();
        return (now - shipped) > (3 * 24 * 60 * 60 * 1000);
    }).length;
    return {
        avgTimeToConfirmation,
        avgTimeToPaid,
        pendingConfirmationOver24h,
        deliveringOverXDays
    };
}
