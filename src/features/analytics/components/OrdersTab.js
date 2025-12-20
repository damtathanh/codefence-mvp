import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from "recharts";
import { Package, MessageCircle, Clock, TrendingUp } from "lucide-react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
}).format(value);
const formatPercent = (value) => `${value.toFixed(1)}%`;
export const OrdersTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, stats, ordersChart, ordersByProvinceChart, ordersByProductChart, } = useDashboardStats(dateRange, customFrom, customTo);
    // ================== DERIVED DATASETS (HOOKS) ==================
    // COD boom rate over time: cancelled / (cancelled + confirmed)
    const boomRateData = useMemo(() => ordersChart.map((point) => {
        const totalProcessed = point.codConfirmed + point.codCancelled;
        const boomRate = totalProcessed > 0
            ? (point.codCancelled / totalProcessed) * 100
            : 0;
        return {
            date: point.date,
            boomRate: Math.round(boomRate * 10) / 10, // 1 decimal
        };
    }), [ordersChart]);
    // Risk distribution
    const riskChart = useMemo(() => [
        { level: "Low", orders: stats.riskLow },
        { level: "Medium", orders: stats.riskMedium },
        { level: "High", orders: stats.riskHigh },
    ], [stats.riskLow, stats.riskMedium, stats.riskHigh]);
    // ================== LOADING / ERROR ==================
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    // ================== RENDER ==================
    return (_jsx(AnalyticsLayout, { summaryCards: [
            // 1) Total Orders
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Total Orders", titleClass: "text-[11px]", valueClass: "text-xl", value: stats.totalOrders, subtitle: `${stats.codOrders} COD / ${stats.prepaidOrders} Prepaid`, icon: _jsx(Package, { className: "h-4 w-4 text-[#4ade80]" }), valueColor: "#4ade80" }, "total-orders"),
            // 2) Customer Responses
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Customer Responses", titleClass: "text-[11px]", valueClass: "text-xl", value: stats.customerResponses, subtitle: `${stats.codConfirmed} confirmed / ${stats.codCancelled} cancelled`, icon: _jsx(MessageCircle, { className: "h-4 w-4 text-[#60a5fa]" }), valueColor: "#60a5fa" }, "customer-responses"),
            // 3) Pending COD Orders + Pending Revenue
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Pending COD Orders", titleClass: "text-[11px]", valueClass: "text-xl", value: stats.pendingVerification, subtitle: `Payment pending: ${formatCurrency(stats.pendingRevenue)}`, icon: _jsx(Clock, { className: "h-4 w-4 text-[#facc15]" }), valueColor: "#facc15" }, "pending-cod"),
            // 4) COD Conversion + Cancel rate
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "COD Conversion", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(stats.convertedRate), subtitle: `Cancel rate: ${formatPercent(stats.cancelRate)}`, icon: _jsx(TrendingUp, { className: "h-4 w-4 text-[#34d399]" }), valueColor: "#34d399" }, "cod-conversion"),
        ], charts: [
            // 1) Orders Total over time
            _jsx(ChartCard, { title: "Orders Total", subtitle: "Orders per day/week/month", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: ordersChart, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                } }), _jsx(Bar, { dataKey: "totalOrders", fill: "#8B5CF6", name: "Total Orders" })] }) }) }, "orders-total"),
            // 2) COD Status breakdown over time
            _jsx(ChartCard, { title: "Status Breakdown of COD Orders", subtitle: "Confirmed, Cancelled, Pending", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: ordersChart, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                } }), _jsx(Legend, { verticalAlign: "top", height: 20, wrapperStyle: {
                                    paddingTop: 0,
                                    color: "#E5E7EB",
                                    fontSize: 11,
                                } }), _jsx(Bar, { dataKey: "codConfirmed", stackId: "a", fill: "#10B981", name: "Confirmed" }), _jsx(Bar, { dataKey: "codCancelled", stackId: "a", fill: "#EF4444", name: "Cancelled" }), _jsx(Bar, { dataKey: "codPending", stackId: "a", fill: "#F59E0B", name: "Pending" })] }) }) }, "cod-status"),
            // 3) COD Boom Rate over time (thay cho COD Funnel Outcome)
            _jsx(ChartCard, { title: "COD Boom Rate Over Time", subtitle: "Daily boom percentage", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: boomRateData, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v}%` }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (value) => `${value}%` }), _jsx(Line, { type: "monotone", dataKey: "boomRate", stroke: "#EF4444", strokeWidth: 2, dot: { fill: "#EF4444", r: 3 }, name: "Boom Rate %" })] }) }) }, "cod-boom-rate"),
            // 4) Risk distribution
            _jsx(ChartCard, { title: "Risk Distribution", subtitle: "Orders by risk level", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: riskChart, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "level", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                } }), _jsx(Bar, { dataKey: "orders", fill: "#F97316", name: "Orders" })] }) }) }, "risk-distribution"),
            // 5) Orders by Province
            _jsx(ChartCard, { title: "Orders by Province", subtitle: "Top provinces by order count", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: ordersByProvinceChart, layout: "vertical", margin: { top: 10, right: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} orders`, labelFormatter: (name) => `Province: ${name}` }), _jsx(Bar, { name: "Orders", dataKey: "orderCount", fill: "#22C55E", radius: [4, 4, 4, 4] })] }) }) }, "orders-by-province"),
            // 6) Orders by Products
            _jsx(ChartCard, { title: "Orders by Products", subtitle: "Top products by order count", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: ordersByProductChart, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} orders`, labelFormatter: (name) => `Product: ${name}` }), _jsx(Bar, { name: "Orders", dataKey: "orderCount", fill: "#3B82F6", radius: [4, 4, 4, 4] })] }) }) }, "orders-by-products"),
        ], chartHeight: 200 }));
};
