import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth";
import { ORDER_STATUS } from "../../constants/orderStatus";
/**
 * Hook that loads orders for the current user in the given date range,
 * computes all dashboard metrics and chart data.
 */
export function useDashboardStats(dateRange, customFrom, customTo) {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [provinceRevenue, setProvinceRevenue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!user)
            return;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { from, to } = resolveDashboardDateRange(dateRange, customFrom, customTo);
                const fromStr = from.toISOString().slice(0, 10); // 'YYYY-MM-DD'
                const toStr = to.toISOString().slice(0, 10);
                // Lọc theo order_date (business date) + chỉ select cột cần thiết
                const { data, error } = await supabase
                    .from("orders")
                    .select([
                    "id",
                    "user_id",
                    "order_id",
                    "customer_name",
                    "phone",
                    "address",
                    "amount",
                    "payment_method",
                    "status",
                    "risk_score",
                    "risk_level",
                    "discount_amount",
                    "shipping_fee",
                    "channel",
                    "source",
                    "order_date",
                    "created_at",
                    "refunded_amount",
                    "customer_shipping_paid",
                    "seller_shipping_paid",
                    "paid_at",
                    "customer_confirmed_at",
                    "province",
                    "district",
                    "ward",
                    "product",
                ].join(","))
                    .eq("user_id", user.id)
                    .gte("order_date", from.toISOString())
                    .lte("order_date", to.toISOString())
                    .order("order_date", { ascending: true });
                if (error)
                    throw error;
                setOrders(data ?? []);
                // Lấy top revenue theo province (only paid orders, logic nằm trong function SQL)
                const { data: provinceData, error: provinceError } = await supabase.rpc("get_revenue_by_province", {
                    _from: fromStr,
                    _to: toStr,
                });
                if (provinceError) {
                    console.error("[Dashboard] Failed to load province revenue", provinceError);
                    setProvinceRevenue([]);
                }
                else {
                    setProvinceRevenue(provinceData ?? []);
                }
            }
            catch (err) {
                console.error("[Dashboard] Failed to load orders", err);
                setError(err.message ?? "Failed to load dashboard data");
            }
            finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [user, dateRange, customFrom, customTo]);
    const aggregation = useMemo(() => getAggregationMode(orders), [orders]);
    const stats = useMemo(() => computeStats(orders), [orders]);
    const ordersChart = useMemo(() => buildOrdersDashboard(orders, aggregation), [orders, aggregation]);
    const revenueChart = useMemo(() => buildRevenueDashboard(orders, aggregation), [orders, aggregation]);
    const topProductsChart = useMemo(() => buildTopProductsChart(orders), [orders]);
    const ordersByProvinceChart = useMemo(() => buildOrdersByProvinceChart(orders), [orders]);
    const ordersByProductChart = useMemo(() => buildOrdersByProductChart(orders), [orders]);
    const highRiskOrders = useMemo(() => orders.filter((o) => o.risk_level &&
        o.risk_level.toLowerCase() === "high" &&
        (o.status === ORDER_STATUS.PENDING_REVIEW ||
            o.status === ORDER_STATUS.VERIFICATION_REQUIRED ||
            o.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT)), [orders]);
    const riskDistribution = useMemo(() => ({
        low: stats.riskLow,
        medium: stats.riskMedium,
        high: stats.riskHigh,
    }), [stats]);
    const riskStats = useMemo(() => computeRiskStats(orders), [orders]);
    const geoRiskStats = useMemo(() => computeGeoRiskStats(orders), [orders]);
    const productStats = useMemo(() => computeProductStats(orders), [orders]);
    const channelStats = useMemo(() => computeChannelStats(orders), [orders]);
    const sourceStats = useMemo(() => computeSourceStats(orders), [orders]);
    // Customer stats requires additional data, computed separately below
    const [allOrdersForCustomers, setAllOrdersForCustomers] = useState([]);
    useEffect(() => {
        if (!user)
            return;
        const fetchAllOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("phone, order_date")
                    .eq("user_id", user.id)
                    .not("phone", "is", null)
                    .order("order_date", { ascending: true });
                if (error)
                    throw error;
                setAllOrdersForCustomers(data ?? []);
            }
            catch (err) {
                console.error("[Dashboard] Failed to load customer data", err);
            }
        };
        void fetchAllOrders();
    }, [user]);
    const customerStats = useMemo(() => computeCustomerStats(orders, allOrdersForCustomers, dateRange, customFrom, customTo), [orders, allOrdersForCustomers, dateRange, customFrom, customTo]);
    const customerActivitySeries = useMemo(() => {
        if (!orders.length || !allOrdersForCustomers.length)
            return [];
        const { from, to } = resolveDashboardDateRange(dateRange, customFrom, customTo);
        const phoneFirstOrderMap = buildPhoneFirstOrderMap(allOrdersForCustomers);
        const map = new Map();
        for (const order of orders) {
            const phone = order.phone?.trim();
            if (!phone)
                continue;
            const baseDate = order.order_date
                ? order.order_date.slice(0, 10)
                : order.created_at
                    ? order.created_at.slice(0, 10)
                    : null;
            if (!baseDate)
                continue;
            const firstOrderDate = phoneFirstOrderMap.get(phone);
            if (!firstOrderDate)
                continue;
            const firstDate = new Date(firstOrderDate);
            const bucket = map.get(baseDate) ??
                {
                    newCustomers: new Set(),
                    returningCustomers: new Set(),
                };
            if (firstDate >= from && firstDate <= to) {
                bucket.newCustomers.add(phone);
            }
            else if (firstDate < from) {
                bucket.returningCustomers.add(phone);
            }
            map.set(baseDate, bucket);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([date, bucket]) => ({
            date,
            newCustomers: bucket.newCustomers.size,
            returningCustomers: bucket.returningCustomers.size,
        }));
    }, [orders, allOrdersForCustomers, dateRange, customFrom, customTo]);
    const customersByProvince = useMemo(() => {
        if (!orders.length)
            return [];
        const map = new Map();
        for (const order of orders) {
            const phone = order.phone?.trim();
            if (!phone)
                continue;
            const province = order.province?.trim() || "Unknown";
            const set = map.get(province) ?? new Set();
            set.add(phone);
            map.set(province, set);
        }
        const all = Array.from(map.entries()).map(([province, set]) => ({
            province,
            customerCount: set.size,
        }));
        all.sort((a, b) => b.customerCount - a.customerCount);
        return all.slice(0, 5);
    }, [orders]);
    const customersByProduct = useMemo(() => {
        if (!orders.length)
            return [];
        const map = new Map();
        for (const order of orders) {
            const phone = order.phone?.trim();
            if (!phone)
                continue;
            const rawName = (order.product ?? "").trim();
            const name = rawName || "Unknown Product";
            const set = map.get(name) ?? new Set();
            set.add(phone);
            map.set(name, set);
        }
        const all = Array.from(map.entries()).map(([productName, set]) => ({
            productName,
            customerCount: set.size,
        }));
        all.sort((a, b) => b.customerCount - a.customerCount);
        return all.slice(0, 5);
    }, [orders]);
    const customersByPaymentMethod = useMemo(() => {
        if (!orders.length)
            return [];
        const map = new Map();
        for (const order of orders) {
            const phone = order.phone?.trim();
            if (!phone)
                continue;
            const raw = (order.payment_method || "").trim().toUpperCase();
            let label;
            if (!raw || raw === "COD")
                label = "COD";
            else if (raw === "PREPAID" ||
                raw === "PAID" ||
                raw === "ONLINE" ||
                raw.includes("WALLET")) {
                label = "Prepaid";
            }
            else if (raw.includes("BANK") || raw.includes("TRANSFER")) {
                label = "BANK";
            }
            else {
                label = raw || "Other";
            }
            const set = map.get(label) ?? new Set();
            set.add(phone);
            map.set(label, set);
        }
        const all = Array.from(map.entries()).map(([paymentMethod, set]) => ({
            paymentMethod,
            customerCount: set.size,
        }));
        all.sort((a, b) => b.customerCount - a.customerCount);
        return all;
    }, [orders]);
    const customerFrequencyBuckets = useMemo(() => {
        if (!allOrdersForCustomers.length) {
            return [
                { label: "1 order", customers: 0 },
                { label: "2–3 orders", customers: 0 },
                { label: "4–5 orders", customers: 0 },
                { label: "6+ orders", customers: 0 },
            ];
        }
        const counts = new Map();
        for (const order of allOrdersForCustomers) {
            const phone = order.phone?.trim();
            if (!phone)
                continue;
            counts.set(phone, (counts.get(phone) ?? 0) + 1);
        }
        let bucket1 = 0;
        let bucket2_3 = 0;
        let bucket4_5 = 0;
        let bucket6plus = 0;
        for (const count of counts.values()) {
            if (count <= 1)
                bucket1++;
            else if (count <= 3)
                bucket2_3++;
            else if (count <= 5)
                bucket4_5++;
            else
                bucket6plus++;
        }
        return [
            { label: "1 order", customers: bucket1 },
            { label: "2–3 orders", customers: bucket2_3 },
            { label: "4–5 orders", customers: bucket4_5 },
            { label: "6+ orders", customers: bucket6plus },
        ];
    }, [allOrdersForCustomers]);
    const verificationOutcomes = useMemo(() => buildVerificationOutcomeSeries(orders, aggregation), [orders, aggregation]);
    const funnelSummary = useMemo(() => computeFunnelSummaryStats(orders), [orders]);
    const funnelStageSeries = useMemo(() => buildFunnelStageSeries(orders, aggregation), [orders, aggregation]);
    const cancelReasonBreakdown = useMemo(() => buildCancelReasonBreakdown(orders), [orders]);
    const rejectReasonBreakdown = useMemo(() => buildRejectReasonBreakdown(orders), [orders]);
    const timeToConfirmSeries = useMemo(() => buildTimeToConfirmSeries(orders, aggregation), [orders, aggregation]);
    return {
        loading,
        error,
        stats,
        ordersChart,
        revenueChart,
        provinceRevenue,
        riskDistribution,
        highRiskOrders,
        riskStats,
        geoRiskStats,
        customerStats,
        productStats,
        channelStats,
        topProductsChart,
        ordersByProvinceChart,
        ordersByProductChart,
        customerActivitySeries,
        customersByProvince,
        customersByProduct,
        customersByPaymentMethod,
        customerFrequencyBuckets,
        sourceStats,
        funnelSummary,
        funnelStageSeries,
        cancelReasonBreakdown,
        rejectReasonBreakdown,
        timeToConfirmSeries,
        verificationOutcomes,
    };
}
export function resolveDashboardDateRange(range, customFrom, customTo) {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    if (range === "today") {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { from: start, to: end };
    }
    if (range === "last_week") {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        return { from: start, to: end };
    }
    if (range === "last_month") {
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        return { from: start, to: end };
    }
    // custom
    if (range === "custom" && customFrom && customTo) {
        const from = new Date(customFrom);
        const to = new Date(customTo);
        to.setHours(23, 59, 59, 999);
        return { from, to };
    }
    // fallback: last 7 days
    const fallbackStart = new Date(now);
    fallbackStart.setDate(fallbackStart.getDate() - 6);
    fallbackStart.setHours(0, 0, 0, 0);
    return { from: fallbackStart, to: end };
}
function getAggregationMode(orders) {
    if (orders.length === 0)
        return "day";
    const dates = orders
        .map((o) => (o.order_date ?? o.created_at)?.slice(0, 10))
        .filter(Boolean);
    if (dates.length === 0)
        return "day";
    dates.sort();
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    const diffDays = Math.round((last.getTime() - first.getTime()) / 86400000) + 1;
    return diffDays > 60 ? "month" : "day";
}
function isCOD(order) {
    const method = (order.payment_method || "").toUpperCase();
    return method === "" || method === "COD";
}
// Helper: Order has ever been paid
function hasBeenPaid(order) {
    return !!order.paid_at;
}
// New Helper: Customer has confirmed (for COD)
function hasBeenCustomerConfirmed(order) {
    // Chỉ xét COD Medium/High
    const level = order.risk_level?.toLowerCase();
    if (!isCOD(order))
        return false;
    if (level !== "medium" && level !== "high")
        return false;
    // Khách THỰC SỰ bấm Confirm
    return (!!order.customer_confirmed_at ||
        order.status === ORDER_STATUS.CUSTOMER_CONFIRMED ||
        order.status === ORDER_STATUS.DELIVERING ||
        order.status === ORDER_STATUS.COMPLETED);
}
// New Helper: COD Payment Pending – COD confirmed/delivering/completed but NOT paid
function isCodPaymentPending(order) {
    if (!isCOD(order))
        return false;
    const risk = (order.risk_level || "").toLowerCase();
    // Nếu đã trả tiền rồi thì không còn pending
    if (hasBeenPaid(order))
        return false;
    // Nếu là các trạng thái đã “chết” thì không pending nữa
    const isCancelledOrFailed = order.status === ORDER_STATUS.CUSTOMER_CANCELLED ||
        order.status === ORDER_STATUS.ORDER_REJECTED ||
        order.status === ORDER_STATUS.CUSTOMER_UNREACHABLE;
    if (isCancelledOrFailed)
        return false;
    // 1) LOW RISK — tất cả đơn COD low, chưa huỷ, chưa trả tiền => pending
    if (risk === "low" || !risk) {
        return true;
    }
    // 2) MEDIUM/HIGH RISK — chỉ pending nếu khách đã Confirm (hoặc các stage sau đó)
    if (risk === "medium" || risk === "high") {
        return hasBeenCustomerConfirmed(order);
    }
    return false;
}
// ---- FUNNEL HELPERS ----
function isCustomerCancelled(order) {
    return order.status === ORDER_STATUS.CUSTOMER_CANCELLED;
}
function isRejectedByShop(order) {
    return order.status === ORDER_STATUS.ORDER_REJECTED;
}
// Các trạng thái vẫn đang “chưa duyệt” cho Medium/High
const FUNNEL_PENDING_STATUSES = new Set([
    ORDER_STATUS.PENDING_REVIEW,
    ORDER_STATUS.VERIFICATION_REQUIRED,
    ORDER_STATUS.ORDER_CONFIRMATION_SENT,
]);
// COD đã được Approved:
// - Low risk COD: auto approved (trừ khi bị reject thẳng)
// - Medium/High: không còn ở pending + không bị reject
function isApprovedCod(order) {
    if (!isCOD(order))
        return false;
    if (isRejectedByShop(order))
        return false;
    const level = order.risk_level?.toLowerCase() || "";
    // Low risk → auto approved
    if (level === "low" || !level) {
        return true;
    }
    // Medium / High → approved khi đã ra khỏi pending
    if (FUNNEL_PENDING_STATUSES.has(order.status)) {
        return false;
    }
    return true;
}
function computeStats(orders) {
    const totalOrders = orders.length;
    const codOrders = orders.filter(isCOD).length;
    const prepaidOrders = totalOrders - codOrders;
    const pendingStatuses = new Set([
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS.VERIFICATION_REQUIRED,
        ORDER_STATUS.ORDER_CONFIRMATION_SENT,
    ]);
    const verifiedPositiveStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CONFIRMED,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);
    const verifiedNegativeStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
    ]);
    const cancelledStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);
    // Pending verification (all)
    const pendingVerification = orders.filter((o) => pendingStatuses.has(o.status)).length;
    // GROSS REVENUE – all PAID orders
    const paidOrdersForRevenue = orders.filter((o) => hasBeenPaid(o));
    const grossRevenue = paidOrdersForRevenue.reduce((sum, o) => sum + (o.amount ?? 0), 0);
    // REFUNDS
    const refundAmount = orders.reduce((sum, o) => sum + (o.refunded_amount ?? 0), 0);
    // LOGISTICS COST
    const logisticsCost = orders.reduce((sum, o) => sum + (o.seller_shipping_paid ?? 0), 0);
    // NET REVENUE
    const netRevenue = grossRevenue - refundAmount - logisticsCost;
    // SHIPPING PROFIT
    const totalCustomerShippingPaid = orders.reduce((sum, o) => sum + (o.customer_shipping_paid ?? 0), 0);
    const shippingProfit = totalCustomerShippingPaid - logisticsCost;
    // AVG ORDER VALUE
    const avgOrderValue = paidOrdersForRevenue.length > 0
        ? Math.round(grossRevenue / paidOrdersForRevenue.length)
        : 0;
    // Verified outcomes (COD only)
    const verifiedOutcomeCOD = orders.filter((o) => isCOD(o) &&
        (verifiedPositiveStatuses.has(o.status) ||
            verifiedNegativeStatuses.has(o.status)));
    const verifiedOutcomeCount = verifiedOutcomeCOD.length;
    const verifiedOutcomeRate = codOrders > 0
        ? Math.round((verifiedOutcomeCount / codOrders) * 1000) / 10
        : 0;
    // CONVERTED REVENUE – COD orders that have been paid
    const convertedOrdersList = orders.filter((o) => isCOD(o) && hasBeenPaid(o));
    const convertedOrders = convertedOrdersList.length;
    const convertedRevenue = convertedOrdersList.reduce((sum, o) => sum + (o.amount ?? 0), 0);
    const convertedRate = codOrders > 0
        ? Math.round((convertedOrders / codOrders) * 1000) / 10
        : 0;
    // PENDING REVENUE – COD pending but not paid
    const pendingRevenueOrders = orders.filter((o) => isCodPaymentPending(o));
    const pendingRevenue = pendingRevenueOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
    // CONFIRMED COD REVENUE – ever customer confirmed
    const confirmedCodOrders = orders.filter((o) => isCOD(o) && hasBeenCustomerConfirmed(o));
    const confirmedCodRevenue = confirmedCodOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
    // DELIVERED NOT PAID – COMPLETED COD but not paid_at
    const deliveredNotPaidOrders = orders.filter((o) => isCOD(o) &&
        o.status === ORDER_STATUS.COMPLETED &&
        !o.paid_at);
    const deliveredNotPaidRevenue = deliveredNotPaidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
    // Cancelled COD
    const codCancelled = orders.filter((o) => isCOD(o) && cancelledStatuses.has(o.status)).length;
    const codConfirmed = orders.filter((o) => isCOD(o) && hasBeenCustomerConfirmed(o)).length;
    const customerResponses = codCancelled + codConfirmed;
    const cancelRate = customerResponses > 0
        ? Math.round((codCancelled / customerResponses) * 1000) / 10
        : 0;
    // Risk counters
    let riskLow = 0;
    let riskMedium = 0;
    let riskHigh = 0;
    for (const o of orders) {
        const level = o.risk_level?.toLowerCase();
        if (level === "low")
            riskLow++;
        else if (level === "medium")
            riskMedium++;
        else if (level === "high")
            riskHigh++;
    }
    return {
        totalOrders,
        codOrders,
        prepaidOrders,
        grossRevenue,
        refundAmount,
        logisticsCost,
        netRevenue,
        shippingProfit,
        totalRevenue: grossRevenue,
        avgOrderValue,
        pendingVerification,
        verifiedOutcomeCount,
        verifiedOutcomeRate,
        convertedRevenue,
        convertedOrders,
        convertedRate,
        cancelRate,
        riskLow,
        riskMedium,
        riskHigh,
        codCancelled,
        codConfirmed,
        customerResponses,
        pendingRevenue,
        confirmedCodRevenue,
        deliveredNotPaidRevenue,
    };
}
function computeRiskStats(orders) {
    const codOrders = orders.filter(isCOD);
    const codWithScore = codOrders.filter((o) => typeof o.risk_score === "number");
    // === Avg risk score ===
    const avgRiskScore = codWithScore.length > 0
        ? Math.round((codWithScore.reduce((sum, o) => sum + o.risk_score, 0) /
            codWithScore.length) *
            10) / 10
        : null;
    // === Counters theo level ===
    const highRiskOrders = codOrders.filter((o) => o.risk_level?.toLowerCase() === "high").length;
    const mediumRiskOrders = codOrders.filter((o) => o.risk_level?.toLowerCase() === "medium").length;
    const lowRiskOrders = codOrders.filter((o) => o.risk_level?.toLowerCase() === "low").length;
    // === 1) Risk score over time (avg per day) ===
    const byDate = new Map();
    for (const o of codWithScore) {
        const baseDate = (o.order_date ? o.order_date.slice(0, 10) : undefined) ??
            (o.created_at ? o.created_at.slice(0, 10) : undefined) ??
            null;
        if (!baseDate)
            continue;
        const entry = byDate.get(baseDate) ?? { total: 0, count: 0 };
        entry.total += o.risk_score;
        entry.count++;
        byDate.set(baseDate, entry);
    }
    const scoreOverTime = Array.from(byDate.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, { total, count }]) => ({
        date,
        avgScore: Math.round((total / count) * 10) / 10,
    }));
    // === 2) Risk by province (avg score) ===
    const byProvinceMap = new Map();
    for (const o of codWithScore) {
        const province = o.province?.trim();
        if (!province)
            continue;
        const entry = byProvinceMap.get(province) ?? { total: 0, count: 0 };
        entry.total += o.risk_score;
        entry.count++;
        byProvinceMap.set(province, entry);
    }
    const byProvince = Array.from(byProvinceMap.entries())
        .map(([province, { total, count }]) => ({
        province,
        avgScore: Math.round((total / count) * 10) / 10,
    }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5); // top 5 province
    // === 3) Risk by product (avg score) ===
    const byProductMap = new Map();
    for (const o of codWithScore) {
        const rawName = (o.product ?? "").trim();
        const name = rawName || "Unknown Product";
        const key = name; // đơn giản dùng name làm key
        const entry = byProductMap.get(key) ?? { name, total: 0, count: 0 };
        entry.total += o.risk_score;
        entry.count++;
        byProductMap.set(key, entry);
    }
    const byProduct = Array.from(byProductMap.values())
        .map(({ name, total, count }) => ({
        productName: name,
        avgScore: Math.round((total / count) * 10) / 10,
    }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5); // top 5 product
    // === 4) Repeat offenders (customers with >= 2 high-risk COD orders) ===
    const repeatMap = new Map();
    for (const o of codOrders) {
        if (o.risk_level?.toLowerCase() !== "high")
            continue;
        const key = o.phone?.trim() ||
            o.customer_name?.trim() ||
            "Unknown Customer";
        const current = repeatMap.get(key) ?? 0;
        repeatMap.set(key, current + 1);
    }
    const repeatOffenders = Array.from(repeatMap.entries())
        .filter(([_, orders]) => orders >= 2)
        .map(([customer, orders]) => ({ customer, orders }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);
    return {
        avgRiskScore,
        highRiskOrders,
        mediumRiskOrders,
        lowRiskOrders,
        scoreOverTime,
        byProvince,
        byProduct,
        repeatOffenders,
    };
}
function computeGeoRiskStats(orders) {
    const paidStatuses = new Set([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);
    const boomStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);
    // Group by province
    const provinceMap = new Map();
    for (const order of orders) {
        const province = order.province?.trim();
        if (!province)
            continue;
        if (!provinceMap.has(province)) {
            provinceMap.set(province, {
                orders: [],
                codOrders: [],
                paidOrders: [],
            });
        }
        const group = provinceMap.get(province);
        group.orders.push(order);
        if (isCOD(order))
            group.codOrders.push(order);
        if (paidStatuses.has(order.status))
            group.paidOrders.push(order);
    }
    const provinceStats = [];
    for (const [province, group] of provinceMap.entries()) {
        // risk score trung bình chỉ tính cho COD có risk_score
        const codWithScore = group.codOrders.filter((o) => o.risk_score !== null && o.risk_score !== undefined);
        const avgRiskScore = codWithScore.length > 0
            ? Math.round((codWithScore.reduce((sum, o) => sum + (o.risk_score || 0), 0) /
                codWithScore.length) *
                10) / 10
            : null;
        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
        const codOrdersCount = group.codOrders.length;
        const boomCodOrders = group.codOrders.filter((o) => boomStatuses.has(o.status));
        const boomRate = codOrdersCount > 0
            ? Math.round((boomCodOrders.length / codOrdersCount) * 1000) / 10
            : 0;
        const prepaidOrdersCount = group.orders.length - codOrdersCount;
        provinceStats.push({
            province,
            orderCount: group.orders.length,
            avgRiskScore,
            totalRevenue,
            codOrdersCount,
            prepaidOrdersCount,
            boomRate,
        });
    }
    const statsWithRisk = provinceStats.filter((p) => p.avgRiskScore !== null);
    const highestRiskProvince = statsWithRisk.length > 0
        ? statsWithRisk.reduce((max, curr) => curr.avgRiskScore > max.avgRiskScore ? curr : max)
        : undefined;
    const safestProvince = statsWithRisk.length > 0
        ? statsWithRisk.reduce((min, curr) => curr.avgRiskScore < min.avgRiskScore ? curr : min)
        : undefined;
    const topRevenueProvince = provinceStats.length > 0
        ? provinceStats.reduce((max, curr) => curr.totalRevenue > max.totalRevenue ? curr : max)
        : undefined;
    const districtsByProvince = buildDistrictsByProvince(orders);
    return {
        highestRiskProvince,
        safestProvince,
        topRevenueProvince,
        provinces: provinceStats,
        districtsByProvince,
    };
}
function computeProductStats(orders) {
    const paidStatuses = new Set([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);
    const boomStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);
    // Group by product
    const productMap = new Map();
    for (const order of orders) {
        const key = order.product_id || order.product || "Unknown";
        const name = order.product || "Unknown Product";
        if (!productMap.has(key)) {
            productMap.set(key, {
                productId: order.product_id || null,
                productName: name,
                orders: [],
                codOrders: [],
                paidOrders: [],
                boomOrders: [],
            });
        }
        const group = productMap.get(key);
        group.orders.push(order);
        if (paidStatuses.has(order.status)) {
            group.paidOrders.push(order);
        }
        if (isCOD(order)) {
            group.codOrders.push(order);
            if (boomStatuses.has(order.status)) {
                group.boomOrders.push(order);
            }
        }
    }
    const productAggs = [];
    for (const [, group] of productMap.entries()) {
        const orderCount = group.orders.length;
        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
        const codOrdersCount = group.codOrders.length;
        const boomCodOrders = group.codOrders.filter((o) => boomStatuses.has(o.status));
        const boomRate = codOrdersCount > 0
            ? Math.round((boomCodOrders.length / codOrdersCount) * 1000) / 10
            : 0;
        // 👇 đúng ra phải push vào productAggs
        productAggs.push({
            productId: group.productId,
            productName: group.productName,
            orderCount,
            totalRevenue,
            boomRate,
        });
    }
    const topProductByRevenue = productAggs.length > 0
        ? productAggs.reduce((max, curr) => curr.totalRevenue > max.totalRevenue ? curr : max)
        : undefined;
    const topProductByOrders = productAggs.length > 0
        ? productAggs.reduce((max, curr) => curr.orderCount > max.orderCount ? curr : max)
        : undefined;
    // For boom rate, require minimum 10 COD orders to avoid noise
    const productsWithMinVolume = productAggs.filter((p) => {
        const key = p.productId || p.productName;
        const group = productMap.get(key);
        return group && group.codOrders.length >= 10;
    });
    const topBoomRateProduct = productsWithMinVolume.length > 0
        ? productsWithMinVolume.reduce((max, curr) => curr.boomRate > max.boomRate ? curr : max)
        : undefined;
    const totalPaidOrders = orders.filter((o) => paidStatuses.has(o.status));
    const avgRevenuePerUnit = totalPaidOrders.length > 0
        ? Math.round(totalPaidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0) / totalPaidOrders.length)
        : 0;
    return {
        topProductByRevenue,
        topProductByOrders,
        avgRevenuePerUnit,
        topBoomRateProduct,
    };
}
function computeChannelStats(orders) {
    const paidStatuses = new Set([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);
    const boomStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);
    // Group by channel
    const channelMap = new Map();
    for (const order of orders) {
        const channel = order.channel?.trim() || "Unknown";
        if (!channelMap.has(channel)) {
            channelMap.set(channel, {
                orders: [],
                codOrders: [],
                paidOrders: [],
                boomOrders: [],
                convertedOrders: [],
            });
        }
        const group = channelMap.get(channel);
        group.orders.push(order);
        if (paidStatuses.has(order.status)) {
            group.paidOrders.push(order);
        }
        if (isCOD(order)) {
            group.codOrders.push(order);
            if (boomStatuses.has(order.status)) {
                group.boomOrders.push(order);
            }
            if (paidStatuses.has(order.status)) {
                group.convertedOrders.push(order);
            }
        }
    }
    const channelAggs = [];
    for (const [channel, group] of channelMap.entries()) {
        const orderCount = group.orders.length;
        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
        const cancelRate = group.codOrders.length > 0
            ? Math.round((group.boomOrders.length / group.codOrders.length) *
                1000) / 10
            : 0;
        const conversionRate = group.codOrders.length > 0
            ? Math.round((group.convertedOrders.length / group.codOrders.length) *
                1000) / 10
            : 0;
        channelAggs.push({
            channel,
            orderCount,
            totalRevenue,
            cancelRate,
            conversionRate,
        });
    }
    const topChannelByRevenue = channelAggs.length > 0
        ? channelAggs.reduce((max, curr) => curr.totalRevenue > max.totalRevenue ? curr : max)
        : undefined;
    // For boom channel, require minimum volume
    const channelsWithMinVolume = channelAggs.filter((c) => {
        const group = channelMap.get(c.channel);
        return group && group.codOrders.length >= 10;
    });
    const highestBoomChannel = channelsWithMinVolume.length > 0
        ? channelsWithMinVolume.reduce((max, curr) => curr.cancelRate > max.cancelRate ? curr : max)
        : undefined;
    const totalChannels = channelMap.size;
    const allCodOrders = orders.filter(isCOD);
    const allConvertedOrders = allCodOrders.filter((o) => paidStatuses.has(o.status));
    const overallConversionRate = allCodOrders.length > 0
        ? Math.round((allConvertedOrders.length / allCodOrders.length) * 1000) / 10
        : 0;
    return {
        totalChannels,
        topChannelByRevenue,
        highestBoomChannel,
        overallConversionRate,
        channels: channelAggs,
    };
}
function computeSourceStats(orders) {
    const paidStatuses = new Set([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);
    const boomStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);
    // Group by source
    const sourceMap = new Map();
    for (const order of orders) {
        const rawSource = order.source?.trim();
        const source = rawSource && rawSource.length > 0 ? rawSource : "Unknown";
        if (!sourceMap.has(source)) {
            sourceMap.set(source, {
                orders: [],
                codOrders: [],
                paidOrders: [],
                boomOrders: [],
                convertedOrders: [],
            });
        }
        const group = sourceMap.get(source);
        group.orders.push(order);
        if (paidStatuses.has(order.status)) {
            group.paidOrders.push(order);
        }
        if (isCOD(order)) {
            group.codOrders.push(order);
            if (boomStatuses.has(order.status)) {
                group.boomOrders.push(order);
            }
            if (paidStatuses.has(order.status)) {
                group.convertedOrders.push(order);
            }
        }
    }
    const sourceAggs = [];
    for (const [source, group] of sourceMap.entries()) {
        const orderCount = group.orders.length;
        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
        const cancelRate = group.codOrders.length > 0
            ? Math.round((group.boomOrders.length / group.codOrders.length) * 1000) / 10
            : 0;
        const conversionRate = group.codOrders.length > 0
            ? Math.round((group.convertedOrders.length /
                group.codOrders.length) *
                1000) / 10
            : 0;
        sourceAggs.push({
            source,
            orderCount,
            totalRevenue,
            cancelRate,
            conversionRate,
        });
    }
    const topSourceByRevenue = sourceAggs.length > 0
        ? sourceAggs.reduce((max, curr) => curr.totalRevenue > max.totalRevenue ? curr : max)
        : undefined;
    // Boom source: yêu cầu tối thiểu volume COD
    const sourcesWithMinVolume = sourceAggs.filter((s) => {
        const group = sourceMap.get(s.source);
        return group && group.codOrders.length >= 10;
    });
    const highestBoomSource = sourcesWithMinVolume.length > 0
        ? sourcesWithMinVolume.reduce((max, curr) => curr.cancelRate > max.cancelRate ? curr : max)
        : undefined;
    const totalSources = sourceMap.size;
    const allCodOrders = orders.filter(isCOD);
    const allConvertedOrders = allCodOrders.filter((o) => paidStatuses.has(o.status));
    const overallConversionRate = allCodOrders.length > 0
        ? Math.round((allConvertedOrders.length / allCodOrders.length) * 1000) / 10
        : 0;
    return {
        totalSources,
        topSourceByRevenue,
        highestBoomSource,
        overallConversionRate,
        sources: sourceAggs,
    };
}
function buildPhoneFirstOrderMap(allOrders) {
    const phoneFirstOrderMap = new Map();
    for (const order of allOrders) {
        const phone = order.phone?.trim();
        const orderDate = order.order_date;
        if (!phone || !orderDate)
            continue;
        const existing = phoneFirstOrderMap.get(phone);
        if (!existing || orderDate < existing) {
            phoneFirstOrderMap.set(phone, orderDate);
        }
    }
    return phoneFirstOrderMap;
}
function computeCustomerStats(ordersInRange, allOrders, dateRange, customFrom, customTo) {
    const { from, to } = resolveDashboardDateRange(dateRange, customFrom, customTo);
    const phoneFirstOrderMap = buildPhoneFirstOrderMap(allOrders);
    // Get unique customers in current range
    const phonesInRange = new Set();
    for (const order of ordersInRange) {
        const phone = order.phone?.trim();
        if (phone)
            phonesInRange.add(phone);
    }
    let newCustomers = 0;
    let returningCustomers = 0;
    for (const phone of phonesInRange) {
        const firstOrderDate = phoneFirstOrderMap.get(phone);
        if (!firstOrderDate)
            continue;
        const firstDate = new Date(firstOrderDate);
        if (firstDate >= from && firstDate <= to) {
            newCustomers++;
        }
        else if (firstDate < from) {
            returningCustomers++;
        }
    }
    const totalCustomers = newCustomers + returningCustomers;
    const repeatPurchaseRate = totalCustomers > 0
        ? Math.round((returningCustomers / totalCustomers) * 1000) / 10
        : 0;
    return {
        newCustomers,
        returningCustomers,
        repeatPurchaseRate,
    };
}
function buildOrdersDashboard(orders, aggregation) {
    const map = new Map();
    const pendingStatuses = new Set([
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS.VERIFICATION_REQUIRED,
        ORDER_STATUS.ORDER_CONFIRMATION_SENT,
    ]);
    const cancelledStatuses = new Set([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);
    for (const o of orders) {
        const baseDate = o.order_date
            ? o.order_date.slice(0, 10)
            : o.created_at
                ? o.created_at.slice(0, 10)
                : "";
        if (!baseDate)
            continue;
        let dateKey = baseDate;
        if (aggregation === "month") {
            const [y, m] = baseDate.split("-");
            dateKey = `${y}-${m}`;
        }
        if (!map.has(dateKey)) {
            map.set(dateKey, {
                totalOrders: 0,
                codPending: 0,
                codConfirmed: 0,
                codCancelled: 0,
            });
        }
        const row = map.get(dateKey);
        row.totalOrders += 1;
        if (!isCOD(o))
            continue;
        if (pendingStatuses.has(o.status))
            row.codPending += 1;
        else if (hasBeenCustomerConfirmed(o))
            row.codConfirmed += 1;
        else if (cancelledStatuses.has(o.status))
            row.codCancelled += 1;
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({
        date,
        ...value,
    }));
}
function buildRevenueDashboard(orders, aggregation) {
    const map = new Map();
    for (const o of orders) {
        // Chỉ tính đơn đã từng được Paid (theo helper chuẩn)
        if (!hasBeenPaid(o))
            continue;
        // Ưu tiên ngày paid_at; fallback order_date / created_at
        const baseDate = (o.paid_at ? o.paid_at.slice(0, 10) : undefined) ??
            (o.order_date ? o.order_date.slice(0, 10) : undefined) ??
            (o.created_at ? o.created_at.slice(0, 10) : "");
        if (!baseDate)
            continue;
        let dateKey = baseDate;
        if (aggregation === "month") {
            const [y, m] = baseDate.split("-");
            dateKey = `${y}-${m}`;
        }
        if (!map.has(dateKey)) {
            map.set(dateKey, { totalRevenue: 0, convertedRevenue: 0 });
        }
        const amount = o.amount ?? 0;
        const row = map.get(dateKey);
        row.totalRevenue += amount;
        if (isCOD(o)) {
            row.convertedRevenue += amount;
        }
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({
        date,
        totalRevenue: value.totalRevenue,
        convertedRevenue: value.convertedRevenue,
        otherRevenue: Math.max(0, value.totalRevenue - value.convertedRevenue),
    }));
}
function isMediumOrHighRiskCOD(order) {
    if (!isCOD(order))
        return false;
    const level = order.risk_level?.toLowerCase();
    return level === "medium" || level === "high";
}
function buildVerificationOutcomeSeries(orders, aggregation) {
    // Chỉ xét COD Medium/High risk
    const candidates = orders.filter(isMediumOrHighRiskCOD);
    const approvedStatuses = new Set([
        ORDER_STATUS.ORDER_CONFIRMATION_SENT,
        ORDER_STATUS.CUSTOMER_CONFIRMED,
        ORDER_STATUS.DELIVERING,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);
    const customerCancelledStatus = ORDER_STATUS.CUSTOMER_CANCELLED;
    const rejectedStatus = ORDER_STATUS.ORDER_REJECTED;
    const map = new Map();
    for (const o of candidates) {
        const baseDate = (o.order_date ? o.order_date.slice(0, 10) : undefined) ??
            (o.created_at ? o.created_at.slice(0, 10) : undefined) ??
            "";
        if (!baseDate)
            continue;
        let dateKey = baseDate;
        if (aggregation === "month") {
            const [y, m] = baseDate.split("-");
            dateKey = `${y}-${m}`; // YYYY-MM
        }
        if (!map.has(dateKey)) {
            map.set(dateKey, { approved: 0, customerCancelled: 0, rejected: 0 });
        }
        const row = map.get(dateKey);
        if (approvedStatuses.has(o.status)) {
            row.approved += 1;
        }
        else if (o.status === customerCancelledStatus) {
            row.customerCancelled += 1;
        }
        else if (o.status === rejectedStatus) {
            row.rejected += 1;
        }
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({
        date,
        ...value,
    }));
}
function buildTopProductsChart(orders) {
    const paidOrders = orders.filter(hasBeenPaid);
    const map = new Map();
    for (const o of paidOrders) {
        const rawName = (o.product ?? "").trim();
        // Không có tên sản phẩm thì bỏ qua
        if (!rawName)
            continue;
        const amount = o.amount ?? 0;
        map.set(rawName, (map.get(rawName) ?? 0) + amount);
    }
    const allProducts = Array.from(map.entries()).map(([productName, totalRevenue]) => ({
        productName,
        totalRevenue,
    }));
    allProducts.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return allProducts.slice(0, 5);
}
function buildOrdersByProvinceChart(orders) {
    const map = new Map();
    for (const o of orders) {
        const province = o.province?.trim() || "Unknown";
        map.set(province, (map.get(province) ?? 0) + 1);
    }
    const all = Array.from(map.entries()).map(([province, orderCount]) => ({
        province,
        orderCount,
    }));
    // Sort nhiều đơn nhất lên đầu, lấy top 5
    all.sort((a, b) => b.orderCount - a.orderCount);
    return all.slice(0, 5);
}
function buildOrdersByProductChart(orders) {
    const map = new Map();
    for (const o of orders) {
        const rawName = (o.product ?? "").trim();
        const name = rawName || "Unknown Product";
        map.set(name, (map.get(name) ?? 0) + 1);
    }
    const all = Array.from(map.entries()).map(([productName, orderCount]) => ({
        productName,
        orderCount,
    }));
    // Sort nhiều đơn nhất lên đầu, lấy top 5
    all.sort((a, b) => b.orderCount - a.orderCount);
    return all.slice(0, 5);
}
function buildDistrictsByProvince(orders) {
    const map = new Map();
    for (const o of orders) {
        const province = o.province;
        const district = o.district;
        if (!province || !district)
            continue;
        if (!map.has(province)) {
            map.set(province, new Set());
        }
        map.get(province).add(district);
    }
    const result = {};
    for (const [province, districts] of map.entries()) {
        result[province] = Array.from(districts).sort((a, b) => a.localeCompare(b, "vi"));
    }
    return result;
}
function pct(num, denom) {
    if (!denom || denom <= 0)
        return 0;
    return Math.round((num / denom) * 1000) / 10; // 1 decimal
}
function computeFunnelSummaryStats(orders) {
    const codOrders = orders.filter(isCOD);
    let approved = 0;
    let paid = 0;
    let completed = 0;
    let customerCancelled = 0;
    let rejected = 0;
    for (const o of codOrders) {
        if (isApprovedCod(o))
            approved++;
        if (hasBeenPaid(o))
            paid++;
        if (o.status === ORDER_STATUS.COMPLETED)
            completed++;
        if (isCustomerCancelled(o))
            customerCancelled++;
        if (isRejectedByShop(o))
            rejected++;
    }
    const totalCodOrders = codOrders.length;
    const failed = customerCancelled + rejected;
    return {
        totalCodOrders,
        approvedCodOrders: approved,
        paidCodOrders: paid,
        completedCodOrders: completed,
        customerCancelledCodOrders: customerCancelled,
        rejectedCodOrders: rejected,
        failedCodOrders: failed,
        approvalRate: pct(approved, totalCodOrders),
        paymentConversionRate: pct(paid, approved),
        deliverySuccessRate: pct(completed, approved),
        failedRate: pct(failed, totalCodOrders),
    };
}
function buildFunnelStageSeries(orders, aggregation) {
    const map = new Map();
    for (const o of orders) {
        if (!isCOD(o))
            continue;
        const baseDate = o.order_date
            ? o.order_date.slice(0, 10)
            : o.created_at
                ? o.created_at.slice(0, 10)
                : "";
        if (!baseDate)
            continue;
        let dateKey = baseDate;
        if (aggregation === "month") {
            const [y, m] = baseDate.split("-");
            dateKey = `${y}-${m}`;
        }
        if (!map.has(dateKey)) {
            map.set(dateKey, {
                codOrders: 0,
                approved: 0,
                paid: 0,
                completed: 0,
                failed: 0,
            });
        }
        const row = map.get(dateKey);
        row.codOrders += 1;
        if (isApprovedCod(o))
            row.approved += 1;
        if (hasBeenPaid(o))
            row.paid += 1;
        if (o.status === ORDER_STATUS.COMPLETED)
            row.completed += 1;
        if (isCustomerCancelled(o) || isRejectedByShop(o))
            row.failed += 1;
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({
        date,
        ...value,
    }));
}
function buildCancelReasonBreakdown(orders) {
    const map = new Map();
    for (const o of orders) {
        if (!isCOD(o))
            continue;
        if (!isCustomerCancelled(o))
            continue;
        const raw = o.cancel_reason;
        const key = raw && raw.trim().length > 0
            ? raw.trim()
            : "Other / Unspecified";
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    const all = Array.from(map.entries()).map(([reason, count]) => ({ reason, count }));
    all.sort((a, b) => b.count - a.count);
    return all;
}
function buildRejectReasonBreakdown(orders) {
    const map = new Map();
    for (const o of orders) {
        if (!isCOD(o))
            continue;
        if (!isRejectedByShop(o))
            continue;
        const raw = o.reject_reason;
        const key = raw && raw.trim().length > 0
            ? raw.trim()
            : "Other / Unspecified";
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    const all = Array.from(map.entries()).map(([reason, count]) => ({ reason, count }));
    all.sort((a, b) => b.count - a.count);
    return all;
}
function buildTimeToConfirmSeries(orders, aggregation) {
    const map = new Map();
    for (const o of orders) {
        if (!isCOD(o))
            continue;
        if (!o.customer_confirmed_at)
            continue;
        const confirmedStr = o.customer_confirmed_at;
        const confirmedAt = new Date(confirmedStr);
        const orderBaseStr = o.order_date ?? o.created_at;
        if (!orderBaseStr)
            continue;
        const orderAt = new Date(orderBaseStr);
        const diffMs = confirmedAt.getTime() - orderAt.getTime();
        if (!Number.isFinite(diffMs) || diffMs < 0)
            continue;
        const hours = diffMs / 36e5; // ms → hours
        let dateKey = confirmedStr.slice(0, 10);
        if (aggregation === "month") {
            const [y, m] = dateKey.split("-");
            dateKey = `${y}-${m}`;
        }
        const row = map.get(dateKey) ?? { totalHours: 0, count: 0 };
        row.totalHours += hours;
        row.count += 1;
        map.set(dateKey, row);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, { totalHours, count }]) => ({
        date,
        avgHours: count > 0 ? Math.round((totalHours / count) * 10) / 10 : 0,
        confirmations: count,
    }));
}
