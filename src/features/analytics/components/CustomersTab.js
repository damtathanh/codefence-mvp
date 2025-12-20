import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, } from "recharts";
import { UserPlus, Users, Repeat } from "lucide-react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
const formatPercent = (v) => `${v.toFixed(1)}%`;
// ISO week number (1–53)
function getISOWeek(date) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
}
function inferActivityGranularity(spanDays) {
    if (spanDays > 270)
        return "month"; // ~1 năm
    if (spanDays > 90)
        return "week"; // ~1 quý
    return "day"; // < ~3 tháng
}
function bucketCustomerActivitySeries(raw) {
    if (!raw.length)
        return { granularity: "day", data: [] };
    // raw.date đang là YYYY-MM-DD
    const dates = raw.map((p) => new Date(p.date));
    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));
    const spanDays = Math.round((maxTime - minTime) / 86400000) + 1;
    const granularity = inferActivityGranularity(spanDays);
    if (granularity === "day") {
        return { granularity, data: raw };
    }
    const map = new Map();
    for (const p of raw) {
        const d = new Date(p.date);
        let key;
        if (granularity === "month") {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            key = `${y}-${m}`; // YYYY-MM
        }
        else {
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
    const data = Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, { newCustomers, returningCustomers }]) => ({
        date,
        newCustomers,
        returningCustomers,
    }));
    return { granularity, data };
}
function formatActivityDateTick(value, granularity) {
    if (!value)
        return "";
    if (granularity === "month") {
        // YYYY-MM -> hiển thị Jan, Feb...
        const [y, m] = value.split("-");
        const d = new Date(Number(y), Number(m) - 1, 1);
        return d.toLocaleDateString("en-US", { month: "short" }); // Jan, Feb,...
    }
    if (granularity === "week") {
        // YYYY-Www -> hiển thị Wxx
        const parts = value.split("-W");
        if (parts.length === 2)
            return `W${parts[1]}`;
        return value;
    }
    // day – giữ nguyên YYYY-MM-DD
    return value;
}
/**
 * ======================== COMPONENT =========================
 */
export const CustomersTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, customerStats, customerActivitySeries, customersByProvince, customersByProduct, customersByPaymentMethod, customerFrequencyBuckets, riskStats, } = useDashboardStats(dateRange, customFrom, customTo);
    const activeCustomers = useMemo(() => customerStats.newCustomers + customerStats.returningCustomers, [customerStats.newCustomers, customerStats.returningCustomers]);
    const totalRiskOrders = (riskStats.lowRiskOrders || 0) +
        (riskStats.mediumRiskOrders || 0) +
        (riskStats.highRiskOrders || 0);
    const riskPieData = useMemo(() => totalRiskOrders === 0
        ? []
        : [
            { name: "Low risk", key: "low", value: riskStats.lowRiskOrders || 0 },
            { name: "Medium risk", key: "medium", value: riskStats.mediumRiskOrders || 0 },
            { name: "High risk", key: "high", value: riskStats.highRiskOrders || 0 },
        ], [
        totalRiskOrders,
        riskStats.lowRiskOrders,
        riskStats.mediumRiskOrders,
        riskStats.highRiskOrders,
    ]);
    const RISK_COLORS = {
        low: "#22c55e",
        medium: "#facc15",
        high: "#f97316",
    };
    // Bucket theo day / week / month cho Activity chart
    const { granularity: activityGranularity, data: activitySeries, } = useMemo(() => bucketCustomerActivitySeries(customerActivitySeries), [customerActivitySeries]);
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    return (_jsx(AnalyticsLayout, { summaryCards: [
            // 1) ACTIVE CUSTOMERS
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "ACTIVE CUSTOMERS", titleClass: "text-[11px]", valueClass: "text-xl", value: activeCustomers, subtitle: "Unique customers in this period", icon: _jsx(Users, { className: "h-4 w-4 text-[#3b82f6]" }), valueColor: "#3b82f6" }, "active-customers"),
            // 2) NEW CUSTOMERS
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "NEW CUSTOMERS", titleClass: "text-[11px]", valueClass: "text-xl", value: customerStats.newCustomers, subtitle: "First order in this period", icon: _jsx(UserPlus, { className: "h-4 w-4 text-[#22c55e]" }), valueColor: "#22c55e" }, "new-customers"),
            // 3) RETURNING CUSTOMERS
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "RETURNING CUSTOMERS", titleClass: "text-[11px]", valueClass: "text-xl", value: customerStats.returningCustomers, subtitle: "Had orders before this period", icon: _jsx(Users, { className: "h-4 w-4 text-[#8b5cf6]" }), valueColor: "#8b5cf6" }, "returning-customers"),
            // 4) REPEAT PURCHASE RATE
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "REPEAT PURCHASE RATE", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(customerStats.repeatPurchaseRate), subtitle: "Returning / total customers", icon: _jsx(Repeat, { className: "h-4 w-4 text-[#22c55e]" }), valueColor: "#22c55e" }, "repeat-purchase-rate"),
        ], charts: [
            // 1) Customer Activity Over Time
            _jsx(ChartCard, { title: "Customer Activity Over Time", subtitle: "New vs returning customers", compact: true, className: "h-full", children: activitySeries.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No customer activity in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: activitySeries, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (value) => formatActivityDateTick(String(value), activityGranularity) }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (value, _name, entry) => {
                                    const key = entry.dataKey; // "newCustomers" | "returningCustomers"
                                    const label = key === "newCustomers"
                                        ? "New customers"
                                        : "Returning customers";
                                    return [`${value} customers`, label];
                                }, labelFormatter: (label) => formatActivityDateTick(String(label), activityGranularity) }), _jsx(Line, { type: "monotone", dataKey: "newCustomers", stroke: "#22c55e", strokeWidth: 2, dot: { r: 3, fill: "#22c55e" }, name: "New customers" }), _jsx(Line, { type: "monotone", dataKey: "returningCustomers", stroke: "#3b82f6", strokeWidth: 2, dot: { r: 3, fill: "#3b82f6" }, name: "Returning customers" })] }) })) }, "customer-activity"),
            // 2) Customers by Risk Contribution
            _jsx(ChartCard, { title: "Customers by Risk Contribution", subtitle: "Share of orders by risk level", compact: true, className: "h-full", children: riskPieData.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No risk data for customers in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: riskPieData, dataKey: "value", nameKey: "name", innerRadius: "50%", outerRadius: "80%", paddingAngle: 2, children: riskPieData.map((entry) => (_jsx(Cell, { fill: RISK_COLORS[entry.key] || "#8b5cf6" }, entry.key))) }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (value, name, props) => {
                                    const v = Number(value) || 0;
                                    const percent = totalRiskOrders > 0
                                        ? ((v / totalRiskOrders) * 100).toFixed(1)
                                        : "0.0";
                                    // Lấy màu theo slice
                                    const color = props?.payload?.fill || "#E5E7EB";
                                    return [
                                        _jsx("span", { style: { color }, children: `${v} orders (${percent}%)` }),
                                        _jsx("span", { style: { color }, children: name })
                                    ];
                                } })] }) })) }, "customers-by-risk"),
            // 3) Customer Purchase Frequency
            _jsx(ChartCard, { title: "Customer Purchase Frequency", subtitle: "How often customers buy", compact: true, className: "h-full", children: customerFrequencyBuckets.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No purchase frequency data" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: customerFrequencyBuckets, margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "label", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} customers` }), _jsx(Bar, { name: "Customers", dataKey: "customers", fill: "#8b5cf6", radius: [4, 4, 4, 4] })] }) })) }, "customer-frequency"),
            // 4) Customers by Payment Method
            _jsx(ChartCard, { title: "Customers by Payment Method", subtitle: "Preferred payment methods", compact: true, className: "h-full", children: customersByPaymentMethod.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No customer data by payment method in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: customersByPaymentMethod, margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "paymentMethod", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, labelFormatter: (label) => `Method: ${String(label)}`, formatter: (value) => `${value} customers` }), _jsx(Bar, { name: "Customers", dataKey: "customerCount", fill: "#f97316", radius: [4, 4, 4, 4] })] }) })) }, "customers-by-payment-method"),
            // 5) Customers by Province
            _jsx(ChartCard, { title: "Customers by Province", subtitle: "Unique customers per province", compact: true, className: "h-full", children: customersByProvince.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No customer data by province in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: customersByProvince, layout: "vertical", margin: { top: 10, right: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} customers`, labelFormatter: (name) => `Province: ${name}` }), _jsx(Bar, { name: "Customers", dataKey: "customerCount", fill: "#3b82f6", radius: [4, 4, 4, 4] })] }) })) }, "customers-by-province"),
            // 6) Top Products by Customers
            _jsx(ChartCard, { title: "Customers by Products", subtitle: "Unique customers per product", compact: true, className: "h-full", children: customersByProduct.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No customer data by product in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: customersByProduct, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} customers`, labelFormatter: (name) => `Product: ${name}` }), _jsx(Bar, { name: "Customers", dataKey: "customerCount", fill: "#8b5cf6", radius: [4, 4, 4, 4] })] }) })) }, "customers-by-product"),
        ], chartHeight: 200 }));
};
