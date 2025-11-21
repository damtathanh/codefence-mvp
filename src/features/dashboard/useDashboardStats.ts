import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth";
import type { Order } from "../../types/supabase";
import { ORDER_STATUS } from "../../constants/orderStatus";

export type DashboardDateRange = "today" | "last_week" | "last_month" | "custom";

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
                const { from, to } = getRange(dateRange, customFrom, customTo);

                const { data, error } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("user_id", user.id)
                    .gte("created_at", from.toISOString())
                    .lte("created_at", to.toISOString())
                    .order("created_at", { ascending: true });

                if (error) throw error;
                setOrders((data as Order[]) ?? []);
            } catch (err: any) {
                console.error("[Dashboard] Failed to load orders", err);
                setError(err.message ?? "Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [user, dateRange, customFrom, customTo]);

    const stats = useMemo<DashboardStats>(() => computeStats(orders), [orders]);
    const ordersChart = useMemo<OrdersDashboardPoint[]>(
        () => buildOrdersDashboard(orders),
        [orders]
    );
    const revenueChart = useMemo<RevenueDashboardPoint[]>(
        () => buildRevenueDashboard(orders),
        [orders]
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

    return {
        loading,
        error,
        stats,
        ordersChart,
        revenueChart,
        riskDistribution,
        highRiskOrders,
    };
}

function getRange(
    range: DashboardDateRange,
    customFrom?: string,
    customTo?: string
): { from: Date; to: Date } {
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
    const cancelRate =
        codOrders > 0 ? Math.round((codCancelled / codOrders) * 1000) / 10 : 0;

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
    };
}

function buildOrdersDashboard(orders: Order[]): OrdersDashboardPoint[] {
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
        const dateKey = o.created_at ? o.created_at.slice(0, 10) : "";
        if (!dateKey) continue;

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

function buildRevenueDashboard(orders: Order[]): RevenueDashboardPoint[] {
    const map = new Map<
        string,
        { totalRevenue: number; convertedRevenue: number }
    >();

    const paidStatuses = new Set<Order["status"]>([
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.COMPLETED,
    ]);

    for (const o of orders) {
        const dateKey = o.created_at ? o.created_at.slice(0, 10) : "";
        if (!dateKey) continue;

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
