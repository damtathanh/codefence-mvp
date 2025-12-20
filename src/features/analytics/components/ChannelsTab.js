import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from "recharts";
import { Radio, TrendingUp, AlertTriangle, Percent } from "lucide-react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
export const ChannelsTab = ({ dateRange, customFrom, customTo, }) => {
    // ✅ 1 hook duy nhất
    const { loading, error, channelStats, sourceStats } = useDashboardStats(dateRange, customFrom, customTo);
    const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
    const formatPercent = (value) => `${value.toFixed(1)}%`;
    const formatYAxisMillions = (value) => {
        if (value === 0)
            return "0";
        const m = value / 1000000;
        if (Number.isInteger(m))
            return `${m}M`;
        return `${m.toFixed(1)}M`;
    };
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    // ================== CHANNEL DATA ==================
    const channels = channelStats?.channels ?? [];
    const sortedChannels = [...channels].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topChannels = sortedChannels.slice(0, 8);
    const revenueByChannelData = topChannels.map((c) => ({
        channel: c.channel || "Unknown",
        totalRevenue: c.totalRevenue ?? 0,
    }));
    const boomRateByChannelData = topChannels.map((c) => ({
        channel: c.channel || "Unknown",
        cancelRate: c.cancelRate ?? 0,
    }));
    const conversionByChannelData = topChannels.map((c) => ({
        channel: c.channel || "Unknown",
        conversionRate: c.conversionRate ?? 0,
    }));
    const hasChannelData = topChannels.length > 0;
    // ================== SOURCE DATA ==================
    const sources = sourceStats?.sources ?? [];
    const sortedSources = [...sources].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topSources = sortedSources.slice(0, 8);
    const revenueBySourceData = topSources.map((s) => ({
        source: s.source || "Unknown",
        totalRevenue: s.totalRevenue ?? 0,
    }));
    const boomRateBySourceData = topSources.map((s) => ({
        source: s.source || "Unknown",
        cancelRate: s.cancelRate ?? 0,
    }));
    const conversionBySourceData = topSources.map((s) => ({
        source: s.source || "Unknown",
        conversionRate: s.conversionRate ?? 0,
    }));
    const hasSourceData = topSources.length > 0;
    return (_jsx(AnalyticsLayout, { summaryCards: [
            // 1) Số lượng channel
            _jsx(StatCard, { className: "h-[88px] px-4 py-2", title: "ACTIVE CHANNELS", titleClass: "text-[11px]", valueClass: "text-xl", value: channelStats.totalChannels, subtitle: "Channels with orders in this period", icon: _jsx(Radio, { className: "h-4 w-4 text-[#8B5CF6]" }), valueColor: "#8B5CF6" }, "total-channels"),
            // 2) Top channel theo revenue
            _jsx(StatCard, { className: "h-[88px] px-4 py-2", title: "TOP REVENUE CHANNEL", titleClass: "text-[11px]", valueClass: "text-sm truncate", value: channelStats.topChannelByRevenue?.channel ?? "No data", subtitle: channelStats.topChannelByRevenue
                    ? `Revenue: ${formatCurrency(channelStats.topChannelByRevenue.totalRevenue)}`
                    : "Need at least 1 paid order", icon: _jsx(TrendingUp, { className: "h-4 w-4 text-green-400" }), valueColor: "#4ade80" }, "top-channel"),
            // 3) Channel boom cao nhất
            _jsx(StatCard, { className: "h-[88px] px-4 py-2", title: "HIGHEST BOOM CHANNEL", titleClass: "text-[11px]", valueClass: "text-sm truncate", value: channelStats.highestBoomChannel?.channel ?? "No data", subtitle: channelStats.highestBoomChannel
                    ? `Boom rate: ${formatPercent(channelStats.highestBoomChannel.cancelRate)}`
                    : "Min 10 COD orders per channel", icon: _jsx(AlertTriangle, { className: "h-4 w-4 text-red-400" }), valueColor: "#f87171" }, "highest-boom-channel"),
            // 4) Overall COD conversion toàn bộ channel
            _jsx(StatCard, { className: "h-[88px] px-4 py-2", title: "OVERALL COD CONVERSION", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(channelStats.overallConversionRate), subtitle: "Paid COD / all COD orders", icon: _jsx(Percent, { className: "h-4 w-4 text-blue-400" }), valueColor: "#60a5fa" }, "overall-conversion"),
        ], charts: [
            // ========= CHANNEL CHARTS =========
            // 1) Revenue by Channel
            _jsx(ChartCard, { title: "Revenue by Channel", subtitle: "Top channels by total revenue", compact: true, className: "h-full", children: !hasChannelData ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No channel data in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: revenueByChannelData, layout: "vertical", margin: { top: 0, right: 10, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: formatYAxisMillions }), _jsx(YAxis, { type: "category", dataKey: "channel", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { cursor: { fill: "rgba(148,163,184,0.12)" }, contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }, formatter: (value) => [
                                    formatCurrency(value),
                                    "Total revenue",
                                ] }), _jsx(Bar, { dataKey: "totalRevenue", name: "Total revenue", fill: "#A855F7", radius: [4, 4, 4, 4] })] }) })) }, "revenue-by-channel"),
            // 2) Boom Rate by Channel
            _jsx(ChartCard, { title: "Boom Rate by Channel", subtitle: "Cancellation rate on COD orders", compact: true, className: "h-full", children: !hasChannelData ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No COD orders in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: boomRateByChannelData, layout: "vertical", margin: { top: 0, right: 10, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v.toFixed(0)}%` }), _jsx(YAxis, { type: "category", dataKey: "channel", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { cursor: { fill: "rgba(248,113,113,0.08)" }, contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(248,113,113,0.4)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }, formatter: (value) => [
                                    `${value.toFixed(1)}%`,
                                    "Boom rate",
                                ] }), _jsx(Bar, { dataKey: "cancelRate", name: "Boom rate", fill: "#F97373", radius: [4, 4, 4, 4] })] }) })) }, "boom-rate-by-channel"),
            // 3) COD Conversion by Channel
            _jsx(ChartCard, { title: "COD Conversion by Channel", subtitle: "Paid COD / COD orders per channel", compact: true, className: "h-full", children: !hasChannelData ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No COD orders in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: conversionByChannelData, layout: "vertical", margin: { top: 0, right: 10, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v.toFixed(0)}%` }), _jsx(YAxis, { type: "category", dataKey: "channel", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { cursor: { fill: "rgba(56,189,248,0.08)" }, contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(56,189,248,0.4)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }, formatter: (value) => [
                                    `${value.toFixed(1)}%`,
                                    "COD conversion",
                                ] }), _jsx(Bar, { dataKey: "conversionRate", name: "COD conversion", fill: "#38BDF8", radius: [4, 4, 4, 4] })] }) })) }, "conversion-by-channel"),
            // ========= SOURCE CHARTS =========
            // 4) Revenue by Source
            _jsx(ChartCard, { title: "Revenue by Source", subtitle: "Top sources by total revenue", compact: true, className: "h-full", children: !hasSourceData ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No source data in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: revenueBySourceData, layout: "vertical", margin: { top: 0, right: 10, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: formatYAxisMillions }), _jsx(YAxis, { type: "category", dataKey: "source", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { cursor: { fill: "rgba(148,163,184,0.12)" }, contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }, formatter: (value) => [
                                    formatCurrency(value),
                                    "Total revenue",
                                ] }), _jsx(Bar, { dataKey: "totalRevenue", name: "Total revenue", fill: "#EC4899", radius: [4, 4, 4, 4] })] }) })) }, "revenue-by-source"),
            // 5) Boom Rate by Source
            _jsx(ChartCard, { title: "Boom Rate by Source", subtitle: "Cancellation rate on COD orders by source", compact: true, className: "h-full", children: !hasSourceData ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No COD orders by source in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: boomRateBySourceData, layout: "vertical", margin: { top: 0, right: 10, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v.toFixed(0)}%` }), _jsx(YAxis, { type: "category", dataKey: "source", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { cursor: { fill: "rgba(248,113,113,0.08)" }, contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(248,113,113,0.4)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }, formatter: (value) => [
                                    `${value.toFixed(1)}%`,
                                    "Boom rate",
                                ] }), _jsx(Bar, { dataKey: "cancelRate", name: "Boom rate", fill: "#FB7185", radius: [4, 4, 4, 4] })] }) })) }, "boom-rate-by-source"),
            // 6) COD Conversion by Source
            _jsx(ChartCard, { title: "COD Conversion by Source", subtitle: "Paid COD / COD orders per source", compact: true, className: "h-full", children: !hasSourceData ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No COD orders by source in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: conversionBySourceData, layout: "vertical", margin: { top: 0, right: 10, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v.toFixed(0)}%` }), _jsx(YAxis, { type: "category", dataKey: "source", width: 120, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                } }), _jsx(Tooltip, { cursor: { fill: "rgba(56,189,248,0.08)" }, contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(56,189,248,0.4)",
                                    borderRadius: 8,
                                    fontSize: 11,
                                }, formatter: (value) => [
                                    `${value.toFixed(1)}%`,
                                    "COD conversion",
                                ] }), _jsx(Bar, { dataKey: "conversionRate", name: "COD conversion", fill: "#22D3EE", radius: [4, 4, 4, 4] })] }) })) }, "conversion-by-source"),
        ], chartHeight: 200 }));
};
