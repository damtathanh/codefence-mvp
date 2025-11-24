import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth";
import type { Order } from "../../types/supabase";
import { ORDER_STATUS } from "../../constants/orderStatus";

export type DashboardDateRange = "today" | "last_week" | "last_month" | "custom";
export type AggregationMode = "day" | "month";

export interface DashboardStats {
    totalOrders: number;
    codOrders: number;
    prepaidOrders: number;

    totalRevenue: number;
    avgOrderValue: number;

    pendingVerification: number;

    verifiedOutcomeCount: number; // COD orders with customer outcome (confirmed OR cancelled)
    verifiedOutcomeRate: number; // percent of COD orders that have outcome

    convertedRevenue: number; // revenue from COD orders that became Paid
    convertedOrders: number;
    convertedRate: number; // convertedOrders / codOrders

    cancelRate: number; // cancelled COD / codOrders

    riskLow: number;
    riskMedium: number;
    riskHigh: number;

    // 🔽 3 field mới để dùng cho subtitle
    codCancelled: number;
    codConfirmed: number;
    customerResponses: number;
}

export interface OrdersDashboardPoint {
    date: string;
    totalOrders: number;
    codPending: number;
    codConfirmed: number;
    codCancelled: number;
}

export interface RevenueDashboardPoint {
    date: string;
    totalRevenue: number;
    convertedRevenue: number;
    otherRevenue: number;
}

// Extended Analytics Stats
export interface RiskStats {
    avgRiskScore: number | null;
    highRiskOrders: number;
    mediumRiskOrders: number;
    lowRiskOrders: number;
}

export interface GeoRiskProvinceStat {
    province: string;
    orderCount: number;
    avgRiskScore: number | null;
    totalRevenue: number;
}

export interface GeoRiskStats {
    highestRiskProvince?: GeoRiskProvinceStat;
    safestProvince?: GeoRiskProvinceStat;
    topRevenueProvince?: GeoRiskProvinceStat;
}

export interface CustomerStats {
    newCustomers: number;
    returningCustomers: number;
    repeatPurchaseRate: number;
}

export interface ProductAgg {
    productId: string | null;
    productName: string;
    orderCount: number;
    totalRevenue: number;
    boomRate: number;
}

export interface ProductStats {
    topProductByRevenue?: ProductAgg;
    topProductByOrders?: ProductAgg;
    avgRevenuePerUnit: number;
    topBoomRateProduct?: ProductAgg;
}

export interface ChannelAgg {
    channel: string;
    orderCount: number;
    totalRevenue: number;
    cancelRate: number;
    conversionRate: number;
}

export interface ChannelStats {
    totalChannels: number;
    topChannelByRevenue?: ChannelAgg;
    highestBoomChannel?: ChannelAgg;
    overallConversionRate: number;
}

interface UseDashboardStatsResult {
    loading: boolean;
    error: string | null;
    stats: DashboardStats;
    ordersChart: OrdersDashboardPoint[];
    revenueChart: RevenueDashboardPoint[];
    riskDistribution: {
        low: number;
        medium: number;
        high: number;
    };
    highRiskOrders: Order[];
    riskStats: RiskStats;
    geoRiskStats: GeoRiskStats;
    customerStats: CustomerStats;
    productStats: ProductStats;
    channelStats: ChannelStats;
}

/**
 * Hook that loads orders for the current user in the given date range,
 * computes all dashboard metrics and chart data.
 */
export function useDashboardStats(
    dateRange: DashboardDateRange,
    customFrom?: string,
    customTo?: string
): UseDashboardStatsResult {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { from, to } = resolveDashboardDateRange(dateRange, customFrom, customTo);

                // Lọc theo order_date (business date) + chỉ select cột cần thiết
                const { data, error } = await supabase
                    .from("orders")
                    .select(
                        [
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
                            "created_at"
                        ].join(",")
                    )
                    .eq("user_id", user.id)
                    .gte("order_date", from.toISOString())
                    .lte("order_date", to.toISOString())
                    .order("order_date", { ascending: true });

                if (error) throw error;
                setOrders((data as unknown as Order[]) ?? []);
            } catch (err: any) {
                console.error("[Dashboard] Failed to load orders", err);
                setError(err.message ?? "Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [user, dateRange, customFrom, customTo]);

    const aggregation = useMemo(() => getAggregationMode(orders), [orders]);

    const stats = useMemo<DashboardStats>(() => computeStats(orders), [orders]);
    const ordersChart = useMemo<OrdersDashboardPoint[]>(
        () => buildOrdersDashboard(orders, aggregation),
        [orders, aggregation]
    );
    const revenueChart = useMemo<RevenueDashboardPoint[]>(
        () => buildRevenueDashboard(orders, aggregation),
        [orders, aggregation]
    );

    const highRiskOrders = useMemo(
        () =>
            orders.filter(
                (o) =>
                    o.risk_level &&
                    o.risk_level.toLowerCase() === "high" &&
                    (o.status === ORDER_STATUS.PENDING_REVIEW ||
                        o.status === ORDER_STATUS.VERIFICATION_REQUIRED ||
                        o.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT)
            ),
        [orders]
    );

    const riskDistribution = useMemo(
        () => ({
            low: stats.riskLow,
            medium: stats.riskMedium,
            high: stats.riskHigh,
        }),
        [stats]
    );

    const riskStats = useMemo(() => computeRiskStats(orders), [orders]);
    const geoRiskStats = useMemo(() => computeGeoRiskStats(orders), [orders]);
    const productStats = useMemo(() => computeProductStats(orders), [orders]);
    const channelStats = useMemo(() => computeChannelStats(orders), [orders]);
    // Customer stats requires additional data, computed separately below
    const [allOrdersForCustomers, setAllOrdersForCustomers] = useState<Order[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchAllOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("phone, order_date")
                    .eq("user_id", user.id)
                    .not("phone", "is", null)
                    .order("order_date", { ascending: true });

                if (error) throw error;
                setAllOrdersForCustomers((data as unknown as Order[]) ?? []);
            } catch (err: any) {
                console.error("[Dashboard] Failed to load customer data", err);
            }
        };
        void fetchAllOrders();
    }, [user]);

    const customerStats = useMemo(
        () => computeCustomerStats(orders, allOrdersForCustomers, dateRange, customFrom, customTo),
        [orders, allOrdersForCustomers, dateRange, customFrom, customTo]
    );

    return {
        loading,
        error,
        stats,
        ordersChart,
        revenueChart,
        riskDistribution,
        highRiskOrders,
        riskStats,
        geoRiskStats,
        customerStats,
        productStats,
        channelStats,
    };
}

export interface ResolvedDateRange {
    from: Date;
    to: Date;
}

export function resolveDashboardDateRange(
    range: DashboardDateRange,
    customFrom?: string,
    customTo?: string
): ResolvedDateRange {
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

function getAggregationMode(orders: Order[]): AggregationMode {
    if (orders.length === 0) return "day";

    const dates = orders
        .map(o => (o.order_date ?? o.created_at)?.slice(0, 10))
        .filter(Boolean) as string[];

    if (dates.length === 0) return "day";

    dates.sort();

    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);

    const diffDays = Math.round((last.getTime() - first.getTime()) / 86400000) + 1;

    return diffDays > 60 ? "month" : "day";
}

function isCOD(order: Order): boolean {
    const method = (order.payment_method || "").toUpperCase();
    return method === "" || method === "COD";
}

function computeStats(orders: Order[]): DashboardStats {
    const totalOrders = orders.length;
    const codOrders = orders.filter(isCOD).length;
    const prepaidOrders = totalOrders - codOrders;

    // Status groups
    const pendingStatuses = new Set<Order["status"]>([
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS.VERIFICATION_REQUIRED,
        ORDER_STATUS.ORDER_CONFIRMATION_SENT,
    ]);

    const verifiedPositiveStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CONFIRMED,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    const verifiedNegativeStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
    ]);

    const paidStatuses = new Set<Order["status"]>([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    const cancelledStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);

    // Pending verification (all)
    const pendingVerification = orders.filter((o) =>
        pendingStatuses.has(o.status)
    ).length;

    // Paid orders and revenue
    const paidOrders = orders.filter((o) => paidStatuses.has(o.status));
    const totalRevenue = paidOrders.reduce(
        (sum, o) => sum + (o.amount ?? 0),
        0
    );
    const avgOrderValue =
        paidOrders.length > 0
            ? Math.round(totalRevenue / paidOrders.length)
            : 0;

    // Verified outcomes (COD only)
    const verifiedOutcomeCOD = orders.filter(
        (o) =>
            isCOD(o) &&
            (verifiedPositiveStatuses.has(o.status) ||
                verifiedNegativeStatuses.has(o.status))
    );
    const verifiedOutcomeCount = verifiedOutcomeCOD.length;
    const verifiedOutcomeRate =
        codOrders > 0
            ? Math.round((verifiedOutcomeCount / codOrders) * 1000) / 10
            : 0;

    // Converted COD → Paid
    const convertedOrdersList = orders.filter(
        (o) => isCOD(o) && paidStatuses.has(o.status)
    );
    const convertedOrders = convertedOrdersList.length;
    const convertedRevenue = convertedOrdersList.reduce(
        (sum, o) => sum + (o.amount ?? 0),
        0
    );
    const convertedRate =
        codOrders > 0
            ? Math.round((convertedOrders / codOrders) * 1000) / 10
            : 0;

    // Cancelled COD (for cancel rate)
    const codCancelled = orders.filter(
        (o) => isCOD(o) && cancelledStatuses.has(o.status)
    ).length;

    const codConfirmed = orders.filter(
        (o) => isCOD(o) && verifiedPositiveStatuses.has(o.status)
    ).length;

    const customerResponses = codCancelled + codConfirmed;

    const cancelRate =
        customerResponses > 0
            ? Math.round((codCancelled / customerResponses) * 1000) / 10
            : 0;

    // Risk counters
    let riskLow = 0;
    let riskMedium = 0;
    let riskHigh = 0;
    for (const o of orders) {
        const level = o.risk_level?.toLowerCase();
        if (level === "low") riskLow++;
        else if (level === "medium") riskMedium++;
        else if (level === "high") riskHigh++;
    }

    return {
        totalOrders,
        codOrders,
        prepaidOrders,
        totalRevenue,
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
    };
}

function computeRiskStats(orders: Order[]): RiskStats {
    const codOrders = orders.filter(isCOD);
    const codOrdersWithScore = codOrders.filter(o => o.risk_score !== null && o.risk_score !== undefined);

    const avgRiskScore = codOrdersWithScore.length > 0
        ? Math.round(codOrdersWithScore.reduce((sum, o) => sum + (o.risk_score || 0), 0) / codOrdersWithScore.length * 10) / 10
        : null;

    const highRiskOrders = codOrders.filter(o => o.risk_level?.toLowerCase() === "high").length;
    const mediumRiskOrders = codOrders.filter(o => o.risk_level?.toLowerCase() === "medium").length;
    const lowRiskOrders = codOrders.filter(o => o.risk_level?.toLowerCase() === "low").length;

    return {
        avgRiskScore,
        highRiskOrders,
        mediumRiskOrders,
        lowRiskOrders,
    };
}

function computeGeoRiskStats(orders: Order[]): GeoRiskStats {
    const paidStatuses = new Set<Order["status"]>([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    // Group by province
    const provinceMap = new Map<string, { orders: Order[]; codOrders: Order[]; paidOrders: Order[] }>();

    for (const order of orders) {
        const province = order.province?.trim();
        if (!province) continue;

        if (!provinceMap.has(province)) {
            provinceMap.set(province, { orders: [], codOrders: [], paidOrders: [] });
        }

        const group = provinceMap.get(province)!;
        group.orders.push(order);
        if (isCOD(order)) group.codOrders.push(order);
        if (paidStatuses.has(order.status)) group.paidOrders.push(order);
    }

    const provinceStats: GeoRiskProvinceStat[] = [];

    for (const [province, group] of provinceMap.entries()) {
        const codWithScore = group.codOrders.filter(o => o.risk_score !== null && o.risk_score !== undefined);
        const avgRiskScore = codWithScore.length > 0
            ? Math.round(codWithScore.reduce((sum, o) => sum + (o.risk_score || 0), 0) / codWithScore.length * 10) / 10
            : null;

        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);

        provinceStats.push({
            province,
            orderCount: group.orders.length,
            avgRiskScore,
            totalRevenue,
        });
    }

    const statsWithRisk = provinceStats.filter(s => s.avgRiskScore !== null);
    const highestRiskProvince = statsWithRisk.length > 0
        ? statsWithRisk.reduce((max, curr) => (curr.avgRiskScore! > max.avgRiskScore!) ? curr : max)
        : undefined;

    const safestProvince = statsWithRisk.length > 0
        ? statsWithRisk.reduce((min, curr) => (curr.avgRiskScore! < min.avgRiskScore!) ? curr : min)
        : undefined;

    const topRevenueProvince = provinceStats.length > 0
        ? provinceStats.reduce((max, curr) => curr.totalRevenue > max.totalRevenue ? curr : max)
        : undefined;

    return {
        highestRiskProvince,
        safestProvince,
        topRevenueProvince,
    };
}

function computeProductStats(orders: Order[]): ProductStats {
    const paidStatuses = new Set<Order["status"]>([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    const boomStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);

    // Group by product
    const productMap = new Map<string, { productId: string | null; productName: string; orders: Order[]; codOrders: Order[]; paidOrders: Order[]; boomOrders: Order[] }>();

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

        const group = productMap.get(key)!;
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

    const productAggs: ProductAgg[] = [];

    for (const [, group] of productMap.entries()) {
        const orderCount = group.orders.length;
        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
        const boomRate = group.codOrders.length > 0
            ? Math.round((group.boomOrders.length / group.codOrders.length) * 1000) / 10
            : 0;

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
    const productsWithMinVolume = productAggs.filter(p => {
        const key = p.productId || p.productName;
        const group = productMap.get(key);
        return group && group.codOrders.length >= 10;
    });

    const topBoomRateProduct = productsWithMinVolume.length > 0
        ? productsWithMinVolume.reduce((max, curr) => curr.boomRate > max.boomRate ? curr : max)
        : undefined;

    const totalPaidOrders = orders.filter(o => paidStatuses.has(o.status));
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

function computeChannelStats(orders: Order[]): ChannelStats {
    const paidStatuses = new Set<Order["status"]>([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    const boomStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);

    // Group by channel
    const channelMap = new Map<string, { orders: Order[]; codOrders: Order[]; paidOrders: Order[]; boomOrders: Order[]; convertedOrders: Order[] }>();

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

        const group = channelMap.get(channel)!;
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

    const channelAggs: ChannelAgg[] = [];

    for (const [channel, group] of channelMap.entries()) {
        const orderCount = group.orders.length;
        const totalRevenue = group.paidOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
        const cancelRate = group.codOrders.length > 0
            ? Math.round((group.boomOrders.length / group.codOrders.length) * 1000) / 10
            : 0;
        const conversionRate = group.codOrders.length > 0
            ? Math.round((group.convertedOrders.length / group.codOrders.length) * 1000) / 10
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
    const channelsWithMinVolume = channelAggs.filter(c => {
        const group = channelMap.get(c.channel);
        return group && group.codOrders.length >= 10;
    });

    const highestBoomChannel = channelsWithMinVolume.length > 0
        ? channelsWithMinVolume.reduce((max, curr) => curr.cancelRate > max.cancelRate ? curr : max)
        : undefined;

    const totalChannels = channelMap.size;

    const allCodOrders = orders.filter(isCOD);
    const allConvertedOrders = allCodOrders.filter(o => paidStatuses.has(o.status));
    const overallConversionRate = allCodOrders.length > 0
        ? Math.round((allConvertedOrders.length / allCodOrders.length) * 1000) / 10
        : 0;

    return {
        totalChannels,
        topChannelByRevenue,
        highestBoomChannel,
        overallConversionRate,
    };
}

function computeCustomerStats(
    ordersInRange: Order[],
    allOrders: Order[],
    dateRange: DashboardDateRange,
    customFrom?: string,
    customTo?: string
): CustomerStats {
    const { from, to } = resolveDashboardDateRange(dateRange, customFrom, customTo);

    // Build map of phone to first order date (across all time)
    const phoneFirstOrderMap = new Map<string, string>();

    for (const order of allOrders) {
        const phone = order.phone?.trim();
        const orderDate = order.order_date;

        if (!phone || !orderDate) continue;

        const existing = phoneFirstOrderMap.get(phone);
        if (!existing || orderDate < existing) {
            phoneFirstOrderMap.set(phone, orderDate);
        }
    }

    // Get unique customers in current range
    const phonesInRange = new Set<string>();
    for (const order of ordersInRange) {
        const phone = order.phone?.trim();
        if (phone) phonesInRange.add(phone);
    }

    let newCustomers = 0;
    let returningCustomers = 0;

    for (const phone of phonesInRange) {
        const firstOrderDate = phoneFirstOrderMap.get(phone);
        if (!firstOrderDate) continue;

        const firstDate = new Date(firstOrderDate);

        // New customer: first order is within the current range
        if (firstDate >= from && firstDate <= to) {
            newCustomers++;
        }
        // Returning customer: first order is before the range
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

function buildOrdersDashboard(orders: Order[], aggregation: AggregationMode): OrdersDashboardPoint[] {
    const map = new Map<
        string,
        { totalOrders: number; codPending: number; codConfirmed: number; codCancelled: number }
    >();

    const pendingStatuses = new Set<Order["status"]>([
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS.VERIFICATION_REQUIRED,
        ORDER_STATUS.ORDER_CONFIRMATION_SENT,
    ]);

    const confirmedStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CONFIRMED,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    const cancelledStatuses = new Set<Order["status"]>([
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
    ]);

    for (const o of orders) {
        const baseDate = o.order_date ? o.order_date.slice(0, 10) : (o.created_at ? o.created_at.slice(0, 10) : "");
        if (!baseDate) continue;

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

        const row = map.get(dateKey)!;
        row.totalOrders += 1;

        if (!isCOD(o)) continue;

        if (pendingStatuses.has(o.status)) row.codPending += 1;
        else if (confirmedStatuses.has(o.status)) row.codConfirmed += 1;
        else if (cancelledStatuses.has(o.status)) row.codCancelled += 1;
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({
            date,
            ...value,
        }));
}

function buildRevenueDashboard(orders: Order[], aggregation: AggregationMode): RevenueDashboardPoint[] {
    const map = new Map<
        string,
        { totalRevenue: number; convertedRevenue: number }
    >();

    const paidStatuses = new Set<Order["status"]>([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    for (const o of orders) {
        const baseDate = o.order_date ? o.order_date.slice(0, 10) : (o.created_at ? o.created_at.slice(0, 10) : "");
        if (!baseDate) continue;

        let dateKey = baseDate;
        if (aggregation === "month") {
            const [y, m] = baseDate.split("-");
            dateKey = `${y}-${m}`;
        }

        if (!map.has(dateKey)) {
            map.set(dateKey, { totalRevenue: 0, convertedRevenue: 0 });
        }

        if (paidStatuses.has(o.status)) {
            const amount = o.amount ?? 0;
            const row = map.get(dateKey)!;
            row.totalRevenue += amount;
            if (isCOD(o)) {
                row.convertedRevenue += amount;
            }
        }
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({
            date,
            totalRevenue: value.totalRevenue,
            convertedRevenue: value.convertedRevenue,
            otherRevenue: Math.max(
                0,
                value.totalRevenue - value.convertedRevenue
            ),
        }));
}
