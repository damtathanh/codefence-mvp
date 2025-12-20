import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from "recharts";
import { AlertTriangle, AlertCircle, Shield, TrendingUp, } from "lucide-react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
import { HighRiskOrdersCard } from "../../dashboard/components/HighRiskOrdersCard";
const formatPercent = (v) => `${v.toFixed(1)}%`;
// Helper: domain chuẩn cho risk score (0–25 / 0–50 / 0–75 / 0–100)
function getRiskDomain(maxValue) {
    if (maxValue <= 0 || !Number.isFinite(maxValue))
        return [0, 100];
    if (maxValue <= 20)
        return [0, 25];
    if (maxValue <= 40)
        return [0, 50];
    if (maxValue <= 70)
        return [0, 75];
    return [0, 100];
}
// Domain "ôm sát" cho Province / Product
function getTightRiskDomain(maxValue) {
    if (maxValue <= 0 || !Number.isFinite(maxValue))
        return [0, 10];
    const padded = maxValue * 1.15; // +15% headroom
    const rounded = Math.ceil(padded / 5) * 5; // làm tròn lên bội số 5
    return [0, Math.min(100, rounded)];
}
// ISO week number (1–53)
function getISOWeek(date) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
}
function inferGranularity(spanDays) {
    if (spanDays > 270)
        return "month"; // ~năm
    if (spanDays > 90)
        return "week"; // ~quý
    return "day"; // ~tháng / 30 ngày
}
function getBucketedRiskSeries(raw) {
    if (!raw.length)
        return { granularity: "day", data: [] };
    const dates = raw.map((p) => new Date(p.date));
    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));
    const spanDays = Math.round((maxTime - minTime) / 86400000) + 1;
    const granularity = inferGranularity(spanDays);
    if (granularity === "day") {
        // Dữ liệu đã là per-day sẵn
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
            const y = d.getFullYear();
            const w = String(getISOWeek(d)).padStart(2, "0");
            key = `${y}-W${w}`; // YYYY-Www
        }
        const entry = map.get(key) ?? { total: 0, count: 0 };
        entry.total += p.avgScore;
        entry.count++;
        map.set(key, entry);
    }
    const data = Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, { total, count }]) => ({
        date: key,
        avgScore: Math.round((total / count) * 10) / 10,
    }));
    return { granularity, data };
}
function formatRiskDateTick(value, granularity) {
    if (!value)
        return "";
    if (granularity === "month") {
        // value: YYYY-MM -> hiển thị tháng: Jan, Feb...
        const [y, m] = value.split("-");
        const d = new Date(Number(y), Number(m) - 1, 1);
        return d.toLocaleDateString("en-US", { month: "short" }); // Jan, Feb,...
    }
    if (granularity === "week") {
        // value: YYYY-Www -> hiển thị Wxx
        const parts = value.split("-W");
        if (parts.length === 2)
            return `W${parts[1]}`;
        return value;
    }
    // day – giữ nguyên YYYY-MM-DD
    return value;
}
// ====== COMPONENT ======
export const RiskTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, highRiskOrders, riskStats } = useDashboardStats(dateRange, customFrom, customTo);
    // ====== DERIVED METRICS ======
    const totalRiskOrders = (riskStats.highRiskOrders || 0) +
        (riskStats.mediumRiskOrders || 0) +
        (riskStats.lowRiskOrders || 0);
    const riskConversionRate = totalRiskOrders > 0
        ? Math.round(((riskStats.lowRiskOrders + riskStats.mediumRiskOrders) /
            totalRiskOrders) *
            1000) / 10
        : 0;
    // Distribution chart data
    const riskDistributionData = useMemo(() => [
        { level: "Low Risk", orders: riskStats.lowRiskOrders },
        { level: "Medium Risk", orders: riskStats.mediumRiskOrders },
        { level: "High Risk", orders: riskStats.highRiskOrders },
    ], [
        riskStats.lowRiskOrders,
        riskStats.mediumRiskOrders,
        riskStats.highRiskOrders,
    ]);
    // Bucketed risk score series (day / week / month)
    const { granularity: riskGranularity, data: riskScoreSeries } = useMemo(() => getBucketedRiskSeries(riskStats.scoreOverTime), [riskStats.scoreOverTime]);
    const riskByProvince = riskStats.byProvince;
    const riskByProduct = riskStats.byProduct;
    const repeatOffenders = riskStats.repeatOffenders;
    // Domains
    const maxScoreOverTime = riskScoreSeries.length > 0
        ? Math.max(...riskScoreSeries.map((p) => p.avgScore))
        : 0;
    const scoreDomain = getRiskDomain(maxScoreOverTime);
    const maxProvinceScore = riskByProvince.length > 0
        ? Math.max(...riskByProvince.map((p) => p.avgScore))
        : 0;
    const provinceDomain = getTightRiskDomain(maxProvinceScore);
    const maxProductScore = riskByProduct.length > 0
        ? Math.max(...riskByProduct.map((p) => p.avgScore))
        : 0;
    const productDomain = getTightRiskDomain(maxProductScore);
    // ====== LOADING / ERROR ======
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    // ====== RENDER ======
    return (_jsx(AnalyticsLayout, { summaryCards: [
            // 1) AVG RISK SCORE
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "AVG RISK SCORE", titleClass: "text-[11px]", valueClass: "text-xl", value: riskStats.avgRiskScore !== null
                    ? riskStats.avgRiskScore.toFixed(1)
                    : "–", subtitle: riskStats.avgRiskScore !== null
                    ? "COD orders average"
                    : "Not available yet", icon: _jsx(TrendingUp, { className: "h-4 w-4 text-[#60a5fa]" }), valueColor: "#60a5fa" }, "avg-risk-score"),
            // 2) HIGH-RISK ORDERS
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "HIGH-RISK ORDERS", titleClass: "text-[11px]", valueClass: "text-xl", value: riskStats.highRiskOrders, subtitle: "Action required", icon: _jsx(AlertTriangle, { className: "h-4 w-4 text-[#f87171]" }), valueColor: "#f87171" }, "high-risk-orders"),
            // 3) MEDIUM-RISK ORDERS
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "MEDIUM-RISK ORDERS", titleClass: "text-[11px]", valueClass: "text-xl", value: riskStats.mediumRiskOrders, subtitle: "Monitor closely", icon: _jsx(AlertCircle, { className: "h-4 w-4 text-[#facc15]" }), valueColor: "#facc15" }, "medium-risk-orders"),
            // 4) RISK CONVERSION RATE
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "RISK CONVERSION RATE", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(riskConversionRate), subtitle: "Low & Medium share of risk orders", icon: _jsx(Shield, { className: "h-4 w-4 text-[#22c55e]" }), valueColor: "#22c55e" }, "risk-conversion-rate"),
        ], charts: [
            // 1) Risk Distribution
            _jsx(ChartCard, { title: "Risk Distribution", subtitle: "Orders by risk level", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: riskDistributionData, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "level", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} orders` }), _jsx(Bar, { dataKey: "orders", fill: "#F97316", name: "Orders" })] }) }) }, "risk-distribution"),
            // 2) High Risk Orders – table
            _jsx(ChartCard, { title: "High Risk Orders", subtitle: "Orders requiring immediate attention", compact: true, className: "h-full", children: highRiskOrders.length === 0 ? (_jsxs("div", { className: "flex h-full flex-col items-center justify-center text-white/40 text-xs", children: [_jsx(Shield, { className: "h-10 w-10 mb-2 opacity-60" }), _jsx("span", { children: "No high-risk orders in this date range" })] })) : (_jsx(HighRiskOrdersCard, { orders: highRiskOrders })) }, "high-risk-orders-panel"),
            // 3) Risk Score Over Time
            _jsx(ChartCard, { title: "Risk Score Over Time", subtitle: "Average risk score by day", compact: true, className: "h-full", children: riskScoreSeries.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No risk score data in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: riskScoreSeries, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (value) => formatRiskDateTick(String(value), riskGranularity) }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, domain: scoreDomain }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} pts` }), _jsx(Line, { type: "monotone", dataKey: "avgScore", stroke: "#8B5CF6", strokeWidth: 2, dot: { r: 3, fill: "#8B5CF6" }, name: "Avg risk score" })] }) })) }, "risk-score-over-time"),
            // 4) Risk by Province
            _jsx(ChartCard, { title: "Risk by Province", subtitle: "Average risk score per province", compact: true, className: "h-full", children: riskByProvince.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No risk data by province in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: riskByProvince, layout: "vertical", margin: { top: 10, right: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, domain: provinceDomain }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} pts`, labelFormatter: (name) => `Province: ${name}` }), _jsx(Bar, { name: "Avg risk score", dataKey: "avgScore", fill: "#F97316", radius: [4, 4, 4, 4] })] }) })) }, "risk-by-province"),
            // 5) Risk by Products
            _jsx(ChartCard, { title: "Risk by Products", subtitle: "Average risk score per product", compact: true, className: "h-full", children: riskByProduct.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No risk data by product in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: riskByProduct, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, domain: productDomain }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} pts`, labelFormatter: (name) => `Product: ${name}` }), _jsx(Bar, { name: "Avg risk score", dataKey: "avgScore", fill: "#3B82F6", radius: [4, 4, 4, 4] })] }) })) }, "risk-by-products"),
            // 6) Repeat Offenders
            _jsx(ChartCard, { title: "Repeat Offenders", subtitle: "Customers with multiple high-risk orders", compact: true, className: "h-full", children: repeatOffenders.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No repeat high-risk customers in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: repeatOffenders, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(YAxis, { type: "category", dataKey: "customer", width: 160, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 11, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} high-risk orders`, labelFormatter: (name) => `Customer: ${name}` }), _jsx(Bar, { name: "# high-risk orders", dataKey: "orders", fill: "#EC4899", radius: [4, 4, 4, 4] })] }) })) }, "repeat-offenders"),
        ], chartHeight: 200 }));
};
