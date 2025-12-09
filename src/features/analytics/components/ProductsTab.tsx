import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    Package,
    ShoppingCart,
    DollarSign,
    AlertTriangle,
} from "lucide-react";

import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    useDashboardStats,
    type DashboardDateRange,
} from "../../dashboard/useDashboardStats";

interface ProductsTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value || 0);

const formatMillions = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString("vi-VN");
};

const formatPercent = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return "N/A";
    return `${value.toFixed(1)}%`;
};

// Màu theo mức risk
const getRiskColor = (score: number) => {
    if (score <= 30) return "#22c55e"; // Low – green
    if (score <= 70) return "#facc15"; // Medium – yellow
    return "#f97373";                 // High – red
};

export const ProductsTab: React.FC<ProductsTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    const {
        loading,
        error,
        productStats,
        topProductsChart,
        ordersByProvinceChart,
        ordersByProductChart,
        riskStats,
    } = useDashboardStats(dateRange, customFrom, customTo);

    // ======= DERIVED DATASETS =======
    const topRevenueProducts = useMemo(
        () => (topProductsChart ?? []).slice(0, 5),
        [topProductsChart]
    );

    const topOrderProducts = useMemo(
        () => (ordersByProductChart ?? []).slice(0, 5),
        [ordersByProductChart]
    );

    const productsByProvince = useMemo(
        () => (ordersByProvinceChart ?? []).slice(0, 5),
        [ordersByProvinceChart]
    );

    const riskByProduct = useMemo(
        () => (riskStats?.byProduct ?? []).slice(0, 5),
        [riskStats]
    );

    // Max score & ticks "đẹp" cho trục X của Risk chart
    const maxRiskScore = useMemo(() => {
        if (!riskByProduct.length) return 100;

        const rawMax = Math.max(
            ...riskByProduct.map((item: any) => item.avgScore ?? 0)
        );

        if (!Number.isFinite(rawMax) || rawMax <= 0) return 100;

        // Làm tròn lên bội số 10/20 cho dễ nhìn
        const step = rawMax <= 40 ? 10 : 20;
        return Math.ceil(rawMax / step) * step;
    }, [riskByProduct]);

    const riskTicks = useMemo(() => {
        const max = maxRiskScore;
        const step = max / 4; // 0, 1/4, 1/2, 3/4, max
        const ticks: number[] = [];
        for (let i = 0; i <= 4; i++) {
            ticks.push(Math.round(step * i));
        }
        return ticks;
    }, [maxRiskScore]);

    // ======= LOADING / ERROR =======
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-white/60">Loading product analytics...</p>
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

    // ======= RENDER =======
    return (
        <AnalyticsLayout
            /* 4 CARDS NHỎ */
            summaryCards={[
                // 1) Top product by revenue
                <StatCard
                    key="top-product-revenue"
                    className="px-4 py-2 h-[88px]"
                    title="Top Product (Revenue)"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={productStats.topProductByRevenue?.productName || "N/A"}
                    subtitle={
                        productStats.topProductByRevenue
                            ? `Revenue: ${formatCurrency(
                                productStats.topProductByRevenue.totalRevenue
                            )}`
                            : "No paid orders in this period"
                    }
                    icon={<Package className="h-4 w-4 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />,

                // 2) Top product by orders
                <StatCard
                    key="top-product-orders"
                    className="px-4 py-2 h-[88px]"
                    title="Top Product (Orders)"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={
                        productStats.topProductByOrders
                            ? productStats.topProductByOrders.orderCount
                            : "N/A"
                    }
                    subtitle={
                        productStats.topProductByOrders?.productName ||
                        "No orders in this period"
                    }
                    icon={<ShoppingCart className="h-4 w-4 text-green-400" />}
                    valueColor="#4ade80"
                />,

                // 3) Average revenue per paid order
                <StatCard
                    key="avg-revenue-per-unit"
                    className="px-4 py-2 h-[88px]"
                    title="Avg Revenue / Paid Order"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatCurrency(productStats.avgRevenuePerUnit || 0)}
                    subtitle="Average revenue per completed order"
                    icon={<DollarSign className="h-4 w-4 text-blue-400" />}
                    valueColor="#60a5fa"
                />,

                // 4) Highest boom product
                <StatCard
                    key="highest-boom-product"
                    className="px-4 py-2 h-[88px]"
                    title="Highest Boom Product"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={
                        productStats.topBoomRateProduct
                            ? formatPercent(productStats.topBoomRateProduct.boomRate)
                            : "N/A"
                    }
                    subtitle={
                        productStats.topBoomRateProduct
                            ? `${productStats.topBoomRateProduct.productName} • ${productStats.topBoomRateProduct.orderCount} COD orders`
                            : "Requires ≥ 10 COD orders to show"
                    }
                    icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                    valueColor="#f87171"
                />,
            ]}
            /* 4 CHARTS (có Products by Province) */
            charts={[
                // 1) Top products by revenue
                <ChartCard
                    key="top-products-revenue"
                    title="Top Products by Revenue"
                    subtitle="Based on paid orders in selected period"
                    compact
                    className="h-full"
                >
                    {topRevenueProducts.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No paid orders in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topRevenueProducts}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={formatMillions}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="productName"
                                    width={150}
                                    interval={0}
                                    tick={(props) => {
                                        const { y, payload } = props as any;
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
                                        fontSize: 12,
                                    }}
                                    formatter={(v: any) =>
                                        typeof v === "number"
                                            ? formatCurrency(v)
                                            : v
                                    }
                                    labelFormatter={(name: any) =>
                                        `Product: ${name}`
                                    }
                                />
                                <Bar
                                    name="Revenue"
                                    dataKey="totalRevenue"
                                    radius={[4, 4, 4, 4]}
                                    fill="#8B5CF6" // 💜 tím giống Orders tab
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 2) Top products by orders
                <ChartCard
                    key="top-products-orders"
                    title="Top Products by Orders"
                    subtitle="Most frequently ordered products"
                    compact
                    className="h-full"
                >
                    {topOrderProducts.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No orders in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topOrderProducts}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
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
                                        const { y, payload } = props as any;
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
                                        fontSize: 12,
                                    }}
                                    formatter={(v: any) =>
                                        typeof v === "number"
                                            ? `${v} orders`
                                            : v
                                    }
                                    labelFormatter={(name: any) =>
                                        `Product: ${name}`
                                    }
                                />
                                <Bar
                                    name="Orders"
                                    dataKey="orderCount"
                                    radius={[4, 4, 4, 4]}
                                    fill="#22c55e" // 💚 xanh lá cho orders
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 3) Products by Province
                <ChartCard
                    key="products-by-province"
                    title="Products by Province"
                    subtitle="Top provinces by product orders"
                    compact
                    className="h-full"
                >
                    {productsByProvince.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No orders in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={productsByProvince}
                                layout="vertical"
                                margin={{ top: 10, right: 10 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
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
                                        const { y, payload } = props as any;
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
                                        fontSize: 12,
                                    }}
                                    formatter={(v: any) =>
                                        typeof v === "number"
                                            ? `${v} orders`
                                            : v
                                    }
                                    labelFormatter={(name: any) =>
                                        `Province: ${name}`
                                    }
                                />
                                <Bar
                                    name="Orders"
                                    dataKey="orderCount"
                                    radius={[4, 4, 4, 4]}
                                    fill="#0ea5e9" // 💧 xanh dương cho geo
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 4) Risk score by product
                <ChartCard
                    key="risk-by-product"
                    title="Risk Score by Product"
                    subtitle="Average risk score from COD orders"
                    compact
                    className="h-full"
                >
                    {riskByProduct.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No risk data for this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={riskByProduct}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    domain={[0, maxRiskScore]}
                                    ticks={riskTicks}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="productName"
                                    width={150}
                                    interval={0}
                                    tick={(props) => {
                                        const { y, payload } = props as any;
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
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload || !payload.length) return null;
                                        const item = payload[0];
                                        const value = item.value as number;
                                        const color = getRiskColor(value); // xanh / vàng / đỏ

                                        return (
                                            <div
                                                style={{
                                                    padding: "8px 12px",
                                                    background: "#020617",
                                                    borderRadius: 8,
                                                    border: "1px solid rgba(255,255,255,0.12)",
                                                    color: "#E5E7EB",
                                                    fontSize: 12,
                                                }}
                                            >
                                                <div style={{ marginBottom: 4 }}>{`Product: ${label}`}</div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 4,
                                                            backgroundColor: color,
                                                        }}
                                                    />
                                                    {/* 👇 cho text cùng màu với chấm */}
                                                    <span style={{ color }}>
                                                        {`Avg risk score: ${value.toFixed(1)} pts`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar
                                    name="Avg risk score"
                                    dataKey="avgScore"
                                    radius={[4, 4, 4, 4]}
                                >
                                    {riskByProduct.map((item: any, idx: number) => (
                                        <Cell
                                            key={idx}
                                            fill={getRiskColor(item.avgScore)}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,
            ]}
            chartHeight={200}
        />
    );
};
