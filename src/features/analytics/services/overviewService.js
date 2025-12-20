import { supabase } from "../../../lib/supabaseClient";
import { resolveDashboardDateRange } from "../../dashboard/useDashboardStats";
import { ORDER_STATUS } from "../../../constants/orderStatus";
function isCOD(order) {
    const method = (order.payment_method || "").toUpperCase();
    return method === "" || method === "COD";
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
export async function fetchOverviewAnalytics(userId, dateRangeMode, customFrom, customTo) {
    const resolved = resolveDashboardDateRange(dateRangeMode, customFrom, customTo);
    let query = supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .gte("order_date", resolved.from.toISOString())
        .lte("order_date", resolved.to.toISOString());
    const { data, error } = await query;
    if (error || !data) {
        console.error("fetchOverviewAnalytics error", error);
        return {
            kpis: {
                totalRevenue: 0,
                realizedRevenue: 0,
                totalOrders: 0,
                codOrders: 0,
                prepaidOrders: 0,
                codReturnRate: 0,
                confirmationRate: 0,
                paidRate: 0,
            },
            trend: [],
        };
    }
    const orders = data || [];
    const totalOrders = orders.length;
    const codOrdersList = orders.filter(isCOD);
    const codOrders = codOrdersList.length;
    const prepaidOrders = totalOrders - codOrders;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const successfulOrders = orders.filter(o => successStatuses.has(o.status));
    const realizedRevenue = successfulOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const failedCodOrders = codOrdersList.filter(o => boomStatuses.has(o.status)).length;
    const codReturnRate = codOrders > 0 ? (failedCodOrders / codOrders) * 100 : 0;
    const confirmedOrders = codOrdersList.filter(o => o.confirmation_sent_at);
    const confirmationRate = codOrders > 0 ? (confirmedOrders.length / codOrders) * 100 : 0;
    const paidOrders = orders.filter(o => o.paid_at || successStatuses.has(o.status));
    const paidRate = totalOrders > 0 ? (paidOrders.length / totalOrders) * 100 : 0;
    // Trend
    const trendMap = new Map();
    orders.forEach(o => {
        const date = o.order_date ? o.order_date.slice(0, 10) : (o.created_at ? o.created_at.slice(0, 10) : "Unknown");
        if (!trendMap.has(date)) {
            trendMap.set(date, { date, totalOrders: 0, codOrders: 0, boomOrders: 0 });
        }
        const point = trendMap.get(date);
        point.totalOrders++;
        if (isCOD(o))
            point.codOrders++;
        if (boomStatuses.has(o.status))
            point.boomOrders++;
    });
    const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return {
        kpis: {
            totalRevenue,
            realizedRevenue,
            totalOrders,
            codOrders,
            prepaidOrders,
            codReturnRate,
            confirmationRate,
            paidRate,
        },
        trend,
    };
}
