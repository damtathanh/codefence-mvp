import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Package, MessageCircle, Clock, TrendingUp } from "lucide-react";

import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    useDashboardStats,
    type DashboardDateRange,
} from "../../dashboard/useDashboardStats";

interface OrdersTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const OrdersTab: React.FC<OrdersTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    const {
        loading,
        error,
        stats,
        ordersChart,
        ordersByProvinceChart,
        ordersByProductChart,
    } = useDashboardStats(dateRange, customFrom, customTo);

    // ================== DERIVED DATASETS (HOOKS) ==================

    // COD boom rate over time: cancelled / (cancelled + confirmed)
    const boomRateData = useMemo(
        () =>
            ordersChart.map((point) => {
                const totalProcessed = point.codConfirmed + point.codCancelled;
                const boomRate =
                    totalProcessed > 0
                        ? (point.codCancelled / totalProcessed) * 100
                        : 0;

                return {
                    date: point.date,
                    boomRate: Math.round(boomRate * 10) / 10, // 1 decimal
                };
            }),
        [ordersChart]
    );

    // Risk distribution
    const riskChart = useMemo(
        () => [
            { level: "Low", orders: stats.riskLow },
            { level: "Medium", orders: stats.riskMedium },
            { level: "High", orders: stats.riskHigh },
        ],
        [stats.riskLow, stats.riskMedium, stats.riskHigh]
    );

    // ================== LOADING / ERROR ==================

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-white/60">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-red-400">Error loading analytics: {error}</p>
            </div>
        );
    }

    // ================== RENDER ==================

    return (
        <AnalyticsLayout
            summaryCards={[
                // 1) Total Orders
                <StatCard
                    key="total-orders"
                    className="px-4 py-2 h-[88px]"
                    title="Total Orders"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={stats.totalOrders}
                    subtitle={`${stats.codOrders} COD / ${stats.prepaidOrders} Prepaid`}
                    icon={<Package className="h-4 w-4 text-[#4ade80]" />}
                    valueColor="#4ade80"
                />,

                // 2) Customer Responses
                <StatCard
                    key="customer-responses"
                    className="px-4 py-2 h-[88px]"
                    title="Customer Responses"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={stats.customerResponses}
                    subtitle={`${stats.codConfirmed} confirmed / ${stats.codCancelled} cancelled`}
                    icon={<MessageCircle className="h-4 w-4 text-[#60a5fa]" />}
                    valueColor="#60a5fa"
                />,

                // 3) Pending COD Orders + Pending Revenue
                <StatCard
                    key="pending-cod"
                    className="px-4 py-2 h-[88px]"
                    title="Pending COD Orders"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={stats.pendingVerification}
                    subtitle={`Payment pending: ${formatCurrency(stats.pendingRevenue)}`}
                    icon={<Clock className="h-4 w-4 text-[#facc15]" />}
                    valueColor="#facc15"
                />,

                // 4) COD Conversion + Cancel rate
                <StatCard
                    key="cod-conversion"
                    className="px-4 py-2 h-[88px]"
                    title="COD Conversion"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(stats.convertedRate)}
                    subtitle={`Cancel rate: ${formatPercent(stats.cancelRate)}`}
                    icon={<TrendingUp className="h-4 w-4 text-[#34d399]" />}
                    valueColor="#34d399"
                />,
            ]}
            charts={[
                // 1) Orders Total over time
                <ChartCard
                    key="orders-total"
                    title="Orders Total"
                    subtitle="Orders per day/week/month"
                    compact
                    className="h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={ordersChart}
                            margin={{ top: 0, right: 10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "#E5E7EB" }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }}
                            />
                            <Bar
                                dataKey="totalOrders"
                                fill="#8B5CF6"
                                name="Total Orders"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>,

                // 2) COD Status breakdown over time
                <ChartCard
                    key="cod-status"
                    title="Status Breakdown of COD Orders"
                    subtitle="Confirmed, Cancelled, Pending"
                    compact
                    className="h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={ordersChart}
                            margin={{ top: 0, right: 10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "#E5E7EB" }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                height={20}
                                wrapperStyle={{
                                    paddingTop: 0,
                                    color: "#E5E7EB",
                                    fontSize: 11,
                                }}
                            />
                            <Bar
                                dataKey="codConfirmed"
                                stackId="a"
                                fill="#10B981"
                                name="Confirmed"
                            />
                            <Bar
                                dataKey="codCancelled"
                                stackId="a"
                                fill="#EF4444"
                                name="Cancelled"
                            />
                            <Bar
                                dataKey="codPending"
                                stackId="a"
                                fill="#F59E0B"
                                name="Pending"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>,

                // 3) COD Boom Rate over time (thay cho COD Funnel Outcome)
                <ChartCard
                    key="cod-boom-rate"
                    title="COD Boom Rate Over Time"
                    subtitle="Daily boom percentage"
                    compact
                    className="h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={boomRateData}
                            margin={{ top: 0, right: 10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }}
                                formatter={(value: number) => `${value}%`}
                            />
                            <Line
                                type="monotone"
                                dataKey="boomRate"
                                stroke="#EF4444"
                                strokeWidth={2}
                                dot={{ fill: "#EF4444", r: 3 }}
                                name="Boom Rate %"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>,

                // 4) Risk distribution
                <ChartCard
                    key="risk-distribution"
                    title="Risk Distribution"
                    subtitle="Orders by risk level"
                    compact
                    className="h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={riskChart}
                            margin={{ top: 0, right: 10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="level"
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "#E5E7EB" }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }}
                            />
                            <Bar dataKey="orders" fill="#F97316" name="Orders" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>,

                // 5) Orders by Province
                <ChartCard
                    key="orders-by-province"
                    title="Orders by Province"
                    subtitle="Top provinces by order count"
                    compact
                    className="h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={ordersByProvinceChart}
                            layout="vertical"
                            margin={{ top: 10, right: 10 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />

                            <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                            />

                            <YAxis
                                type="category"
                                dataKey="province"
                                width={120}
                                interval={0}
                                tick={(props) => {
                                    const { y, payload } = props;
                                    return (
                                        <text
                                            x={12}
                                            y={y + 4}
                                            textAnchor="start"
                                            fill="#E5E7EB"
                                            fontSize={12}
                                        >
                                            {payload.value}
                                        </text>
                                    );
                                }}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }}
                                formatter={(v: any) => `${v} orders`}
                                labelFormatter={(name: any) => `Province: ${name}`}
                            />

                            <Bar
                                name="Orders"
                                dataKey="orderCount"
                                fill="#22C55E"
                                radius={[4, 4, 4, 4]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>,

                // 6) Orders by Products
                <ChartCard
                    key="orders-by-products"
                    title="Orders by Products"
                    subtitle="Top products by order count"
                    compact
                    className="h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={ordersByProductChart}
                            layout="vertical"
                            margin={{ top: 10, right: 10, left: 10 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />

                            <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "#E5E7EB" }}
                            />

                            <YAxis
                                type="category"
                                dataKey="productName"
                                width={150}
                                interval={0}
                                tick={(props) => {
                                    const { y, payload } = props;
                                    return (
                                        <text
                                            x={12}
                                            y={y + 4}
                                            textAnchor="start"
                                            fill="#E5E7EB"
                                            fontSize={12}
                                        >
                                            {payload.value}
                                        </text>
                                    );
                                }}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }}
                                formatter={(v: any) => `${v} orders`}
                                labelFormatter={(name: any) => `Product: ${name}`}
                            />

                            <Bar
                                name="Orders"
                                dataKey="orderCount"
                                fill="#3B82F6"
                                radius={[4, 4, 4, 4]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>,
            ]}
            chartHeight={200}
        />
    );
};
