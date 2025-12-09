import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { UserPlus, Users, Repeat } from "lucide-react";

import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    useDashboardStats,
    type DashboardDateRange,
    type CustomerActivityPoint,
} from "../../dashboard/useDashboardStats";

interface CustomersTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

const formatPercent = (v: number) => `${v.toFixed(1)}%`;

/**
 * ====== BUCKET CHO CUSTOMER ACTIVITY (day / week / month) ======
 */

type ActivityGranularity = "day" | "week" | "month";

// ISO week number (1–53)
function getISOWeek(date: Date): number {
    const tmp = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
        ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return weekNo;
}

function inferActivityGranularity(spanDays: number): ActivityGranularity {
    if (spanDays > 270) return "month"; // ~1 năm
    if (spanDays > 90) return "week"; // ~1 quý
    return "day"; // < ~3 tháng
}

function bucketCustomerActivitySeries(
    raw: CustomerActivityPoint[]
): { granularity: ActivityGranularity; data: CustomerActivityPoint[] } {
    if (!raw.length) return { granularity: "day", data: [] };

    // raw.date đang là YYYY-MM-DD
    const dates = raw.map((p) => new Date(p.date));
    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));
    const spanDays = Math.round((maxTime - minTime) / 86400000) + 1;

    const granularity = inferActivityGranularity(spanDays);
    if (granularity === "day") {
        return { granularity, data: raw };
    }

    const map = new Map<
        string,
        { newCustomers: number; returningCustomers: number }
    >();

    for (const p of raw) {
        const d = new Date(p.date);
        let key: string;

        if (granularity === "month") {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            key = `${y}-${m}`; // YYYY-MM
        } else {
            // week
            const y = d.getFullYear();
            const w = String(getISOWeek(d)).padStart(2, "0");
            key = `${y}-W${w}`; // YYYY-Www
        }

        const entry = map.get(key) ?? { newCustomers: 0, returningCustomers: 0 };
        entry.newCustomers += p.newCustomers;
        entry.returningCustomers += p.returningCustomers;
        map.set(key, entry);
    }

    const data: CustomerActivityPoint[] = Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, { newCustomers, returningCustomers }]) => ({
            date,
            newCustomers,
            returningCustomers,
        }));

    return { granularity, data };
}

function formatActivityDateTick(
    value: string,
    granularity: ActivityGranularity
): string {
    if (!value) return "";

    if (granularity === "month") {
        // YYYY-MM -> hiển thị Jan, Feb...
        const [y, m] = value.split("-");
        const d = new Date(Number(y), Number(m) - 1, 1);
        return d.toLocaleDateString("en-US", { month: "short" }); // Jan, Feb,...
    }

    if (granularity === "week") {
        // YYYY-Www -> hiển thị Wxx
        const parts = value.split("-W");
        if (parts.length === 2) return `W${parts[1]}`;
        return value;
    }

    // day – giữ nguyên YYYY-MM-DD
    return value;
}

/**
 * ======================== COMPONENT =========================
 */

export const CustomersTab: React.FC<CustomersTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    const {
        loading,
        error,
        customerStats,
        customerActivitySeries,
        customersByProvince,
        customersByProduct,
        customersByPaymentMethod,
        customerFrequencyBuckets,
        riskStats,
    } = useDashboardStats(dateRange, customFrom, customTo);

    const activeCustomers = useMemo(
        () => customerStats.newCustomers + customerStats.returningCustomers,
        [customerStats.newCustomers, customerStats.returningCustomers]
    );

    const totalRiskOrders =
        (riskStats.lowRiskOrders || 0) +
        (riskStats.mediumRiskOrders || 0) +
        (riskStats.highRiskOrders || 0);

    const riskPieData = useMemo(
        () =>
            totalRiskOrders === 0
                ? []
                : [
                    { name: "Low risk", key: "low", value: riskStats.lowRiskOrders || 0 },
                    { name: "Medium risk", key: "medium", value: riskStats.mediumRiskOrders || 0 },
                    { name: "High risk", key: "high", value: riskStats.highRiskOrders || 0 },
                ],
        [
            totalRiskOrders,
            riskStats.lowRiskOrders,
            riskStats.mediumRiskOrders,
            riskStats.highRiskOrders,
        ]
    );

    const RISK_COLORS: Record<string, string> = {
        low: "#22c55e",
        medium: "#facc15",
        high: "#f97316",
    };

    // Bucket theo day / week / month cho Activity chart
    const {
        granularity: activityGranularity,
        data: activitySeries,
    } = useMemo(
        () => bucketCustomerActivitySeries(customerActivitySeries),
        [customerActivitySeries]
    );

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

    return (
        <AnalyticsLayout
            summaryCards={[
                // 1) ACTIVE CUSTOMERS
                <StatCard
                    key="active-customers"
                    className="px-4 py-2 h-[88px]"
                    title="ACTIVE CUSTOMERS"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={activeCustomers}
                    subtitle="Unique customers in this period"
                    icon={<Users className="h-4 w-4 text-[#3b82f6]" />}
                    valueColor="#3b82f6"
                />,

                // 2) NEW CUSTOMERS
                <StatCard
                    key="new-customers"
                    className="px-4 py-2 h-[88px]"
                    title="NEW CUSTOMERS"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={customerStats.newCustomers}
                    subtitle="First order in this period"
                    icon={<UserPlus className="h-4 w-4 text-[#22c55e]" />}
                    valueColor="#22c55e"
                />,

                // 3) RETURNING CUSTOMERS
                <StatCard
                    key="returning-customers"
                    className="px-4 py-2 h-[88px]"
                    title="RETURNING CUSTOMERS"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={customerStats.returningCustomers}
                    subtitle="Had orders before this period"
                    icon={<Users className="h-4 w-4 text-[#8b5cf6]" />}
                    valueColor="#8b5cf6"
                />,

                // 4) REPEAT PURCHASE RATE
                <StatCard
                    key="repeat-purchase-rate"
                    className="px-4 py-2 h-[88px]"
                    title="REPEAT PURCHASE RATE"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(customerStats.repeatPurchaseRate)}
                    subtitle="Returning / total customers"
                    icon={<Repeat className="h-4 w-4 text-[#22c55e]" />}
                    valueColor="#22c55e"
                />,
            ]}
            charts={[
                // 1) Customer Activity Over Time
                <ChartCard
                    key="customer-activity"
                    title="Customer Activity Over Time"
                    subtitle="New vs returning customers"
                    compact
                    className="h-full"
                >
                    {activitySeries.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No customer activity in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={activitySeries}
                                margin={{ top: 0, right: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(value: any) =>
                                        formatActivityDateTick(String(value), activityGranularity)
                                    }
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(value: any, _name: any, entry: any) => {
                                        const key = entry.dataKey; // "newCustomers" | "returningCustomers"
                                        const label =
                                            key === "newCustomers"
                                                ? "New customers"
                                                : "Returning customers";

                                        return [`${value} customers`, label];
                                    }}
                                    labelFormatter={(label: any) =>
                                        formatActivityDateTick(String(label), activityGranularity)
                                    }
                                />
                                <Line
                                    type="monotone"
                                    dataKey="newCustomers"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: "#22c55e" }}
                                    name="New customers"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="returningCustomers"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: "#3b82f6" }}
                                    name="Returning customers"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 2) Customers by Risk Contribution
                <ChartCard
                    key="customers-by-risk"
                    title="Customers by Risk Contribution"
                    subtitle="Share of orders by risk level"
                    compact
                    className="h-full"
                >
                    {riskPieData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No risk data for customers in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={riskPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="50%"
                                    outerRadius="80%"
                                    paddingAngle={2}
                                >
                                    {riskPieData.map((entry) => (
                                        <Cell
                                            key={entry.key}
                                            fill={RISK_COLORS[entry.key] || "#8b5cf6"}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(value: any, name: any, props: any) => {
                                        const v = Number(value) || 0;
                                        const percent =
                                            totalRiskOrders > 0
                                                ? ((v / totalRiskOrders) * 100).toFixed(1)
                                                : "0.0";

                                        // Lấy màu theo slice
                                        const color = props?.payload?.fill || "#E5E7EB";

                                        return [
                                            <span style={{ color }}>{`${v} orders (${percent}%)`}</span>,
                                            <span style={{ color }}>{name}</span>
                                        ];
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 3) Customer Purchase Frequency
                <ChartCard
                    key="customer-frequency"
                    title="Customer Purchase Frequency"
                    subtitle="How often customers buy"
                    compact
                    className="h-full"
                >
                    {customerFrequencyBuckets.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No purchase frequency data
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={customerFrequencyBuckets}
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v: any) => `${v} customers`}
                                />
                                <Bar
                                    name="Customers"
                                    dataKey="customers"
                                    fill="#8b5cf6"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 4) Customers by Payment Method
                <ChartCard
                    key="customers-by-payment-method"
                    title="Customers by Payment Method"
                    subtitle="Preferred payment methods"
                    compact
                    className="h-full"
                >
                    {customersByPaymentMethod.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No customer data by payment method in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={customersByPaymentMethod}
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="paymentMethod"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    labelFormatter={(label: any) => `Method: ${String(label)}`}
                                    formatter={(value: any) => `${value} customers`}
                                />
                                <Bar
                                    name="Customers"
                                    dataKey="customerCount"
                                    fill="#f97316"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 5) Customers by Province
                <ChartCard
                    key="customers-by-province"
                    title="Customers by Province"
                    subtitle="Unique customers per province"
                    compact
                    className="h-full"
                >
                    {customersByProvince.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No customer data by province in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={customersByProvince}
                                layout="vertical"
                                margin={{ top: 10, right: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="province"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    formatter={(v: any) => `${v} customers`}
                                    labelFormatter={(name: any) => `Province: ${name}`}
                                />
                                <Bar
                                    name="Customers"
                                    dataKey="customerCount"
                                    fill="#3b82f6"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 6) Top Products by Customers
                <ChartCard
                    key="customers-by-product"
                    title="Customers by Products"
                    subtitle="Unique customers per product"
                    compact
                    className="h-full"
                >
                    {customersByProduct.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No customer data by product in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={customersByProduct}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="productName"
                                    width={150}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    formatter={(v: any) => `${v} customers`}
                                    labelFormatter={(name: any) => `Product: ${name}`}
                                />
                                <Bar
                                    name="Customers"
                                    dataKey="customerCount"
                                    fill="#8b5cf6"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

            ]}
            chartHeight={200}
        />
    );
};
