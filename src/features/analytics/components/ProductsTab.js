import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, } from "recharts";
import { Package, ShoppingCart, DollarSign, AlertTriangle, } from "lucide-react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
}).format(value || 0);
const formatMillions = (value) => {
    if (!Number.isFinite(value))
        return "0";
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }
    return value.toLocaleString("vi-VN");
};
const formatPercent = (value) => {
    if (value == null || !Number.isFinite(value))
        return "N/A";
    return `${value.toFixed(1)}%`;
};
// Màu theo mức risk
const getRiskColor = (score) => {
    if (score <= 30)
        return "#22c55e"; // Low – green
    if (score <= 70)
        return "#facc15"; // Medium – yellow
    return "#f97373"; // High – red
};
export const ProductsTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, productStats, topProductsChart, ordersByProvinceChart, ordersByProductChart, riskStats, } = useDashboardStats(dateRange, customFrom, customTo);
    // ======= DERIVED DATASETS =======
    const topRevenueProducts = useMemo(() => (topProductsChart ?? []).slice(0, 5), [topProductsChart]);
    const topOrderProducts = useMemo(() => (ordersByProductChart ?? []).slice(0, 5), [ordersByProductChart]);
    const productsByProvince = useMemo(() => (ordersByProvinceChart ?? []).slice(0, 5), [ordersByProvinceChart]);
    const riskByProduct = useMemo(() => (riskStats?.byProduct ?? []).slice(0, 5), [riskStats]);
    // Max score & ticks "đẹp" cho trục X của Risk chart
    const maxRiskScore = useMemo(() => {
        if (!riskByProduct.length)
            return 100;
        const rawMax = Math.max(...riskByProduct.map((item) => item.avgScore ?? 0));
        if (!Number.isFinite(rawMax) || rawMax <= 0)
            return 100;
        // Làm tròn lên bội số 10/20 cho dễ nhìn
        const step = rawMax <= 40 ? 10 : 20;
        return Math.ceil(rawMax / step) * step;
    }, [riskByProduct]);
    const riskTicks = useMemo(() => {
        const max = maxRiskScore;
        const step = max / 4; // 0, 1/4, 1/2, 3/4, max
        const ticks = [];
        for (let i = 0; i <= 4; i++) {
            ticks.push(Math.round(step * i));
        }
        return ticks;
    }, [maxRiskScore]);
    // ======= LOADING / ERROR =======
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading product analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    // ======= RENDER =======
    return (_jsx(AnalyticsLayout
    /* 4 CARDS NHỎ */
    , { 
        /* 4 CARDS NHỎ */
        summaryCards: [
            // 1) Top product by revenue
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Top Product (Revenue)", titleClass: "text-[11px]", valueClass: "text-xl", value: productStats.topProductByRevenue?.productName || "N/A", subtitle: productStats.topProductByRevenue
                    ? `Revenue: ${formatCurrency(productStats.topProductByRevenue.totalRevenue)}`
                    : "No paid orders in this period", icon: _jsx(Package, { className: "h-4 w-4 text-[#8B5CF6]" }), valueColor: "#8B5CF6" }, "top-product-revenue"),
            // 2) Top product by orders
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Top Product (Orders)", titleClass: "text-[11px]", valueClass: "text-xl", value: productStats.topProductByOrders
                    ? productStats.topProductByOrders.orderCount
                    : "N/A", subtitle: productStats.topProductByOrders?.productName ||
                    "No orders in this period", icon: _jsx(ShoppingCart, { className: "h-4 w-4 text-green-400" }), valueColor: "#4ade80" }, "top-product-orders"),
            // 3) Average revenue per paid order
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Avg Revenue / Paid Order", titleClass: "text-[11px]", valueClass: "text-xl", value: formatCurrency(productStats.avgRevenuePerUnit || 0), subtitle: "Average revenue per completed order", icon: _jsx(DollarSign, { className: "h-4 w-4 text-blue-400" }), valueColor: "#60a5fa" }, "avg-revenue-per-unit"),
            // 4) Highest boom product
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Highest Boom Product", titleClass: "text-[11px]", valueClass: "text-xl", value: productStats.topBoomRateProduct
                    ? formatPercent(productStats.topBoomRateProduct.boomRate)
                    : "N/A", subtitle: productStats.topBoomRateProduct
                    ? `${productStats.topBoomRateProduct.productName} • ${productStats.topBoomRateProduct.orderCount} COD orders`
                    : "Requires ≥ 10 COD orders to show", icon: _jsx(AlertTriangle, { className: "h-4 w-4 text-red-400" }), valueColor: "#f87171" }, "highest-boom-product"),
        ], 
        /* 4 CHARTS (có Products by Province) */
        charts: [
            // 1) Top products by revenue
            _jsx(ChartCard, { title: "Top Products by Revenue", subtitle: "Based on paid orders in selected period", compact: true, className: "h-full", children: topRevenueProducts.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No paid orders in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: topRevenueProducts, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: formatMillions }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                }, formatter: (v) => typeof v === "number"
                                    ? formatCurrency(v)
                                    : v, labelFormatter: (name) => `Product: ${name}` }), _jsx(Bar, { name: "Revenue", dataKey: "totalRevenue", radius: [4, 4, 4, 4], fill: "#8B5CF6" // 💜 tím giống Orders tab
                             })] }) })) }, "top-products-revenue"),
            // 2) Top products by orders
            _jsx(ChartCard, { title: "Top Products by Orders", subtitle: "Most frequently ordered products", compact: true, className: "h-full", children: topOrderProducts.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No orders in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: topOrderProducts, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                }, formatter: (v) => typeof v === "number"
                                    ? `${v} orders`
                                    : v, labelFormatter: (name) => `Product: ${name}` }), _jsx(Bar, { name: "Orders", dataKey: "orderCount", radius: [4, 4, 4, 4], fill: "#22c55e" // 💚 xanh lá cho orders
                             })] }) })) }, "top-products-orders"),
            // 3) Products by Province
            _jsx(ChartCard, { title: "Products by Province", subtitle: "Top provinces by product orders", compact: true, className: "h-full", children: productsByProvince.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No orders in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: productsByProvince, layout: "vertical", margin: { top: 10, right: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                }, formatter: (v) => typeof v === "number"
                                    ? `${v} orders`
                                    : v, labelFormatter: (name) => `Province: ${name}` }), _jsx(Bar, { name: "Orders", dataKey: "orderCount", radius: [4, 4, 4, 4], fill: "#0ea5e9" // 💧 xanh dương cho geo
                             })] }) })) }, "products-by-province"),
            // 4) Risk score by product
            _jsx(ChartCard, { title: "Risk Score by Product", subtitle: "Average risk score from COD orders", compact: true, className: "h-full", children: riskByProduct.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No risk data for this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: riskByProduct, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, domain: [0, maxRiskScore], ticks: riskTicks }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { content: ({ active, payload, label }) => {
                                    if (!active || !payload || !payload.length)
                                        return null;
                                    const item = payload[0];
                                    const value = item.value;
                                    const color = getRiskColor(value); // xanh / vàng / đỏ
                                    return (_jsxs("div", { style: {
                                            padding: "8px 12px",
                                            background: "#020617",
                                            borderRadius: 8,
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            color: "#E5E7EB",
                                            fontSize: 12,
                                        }, children: [_jsx("div", { style: { marginBottom: 4 }, children: `Product: ${label}` }), _jsxs("div", { style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }, children: [_jsx("span", { style: {
                                                            display: "inline-block",
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 4,
                                                            backgroundColor: color,
                                                        } }), _jsx("span", { style: { color }, children: `Avg risk score: ${value.toFixed(1)} pts` })] })] }));
                                } }), _jsx(Bar, { name: "Avg risk score", dataKey: "avgScore", radius: [4, 4, 4, 4], children: riskByProduct.map((item, idx) => (_jsx(Cell, { fill: getRiskColor(item.avgScore) }, idx))) })] }) })) }, "risk-by-product"),
        ], chartHeight: 200 }));
};
