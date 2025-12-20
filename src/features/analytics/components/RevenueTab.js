import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, } from "recharts";
import { REVENUE_KPI_TARGETS, REVENUE_KPI_LABELS, REVENUE_KPI_CHIPS, calculateRevenueKpi, } from "../config/revenueKpiConfig";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
export const RevenueTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, stats, revenueChart, provinceRevenue, topProductsChart } = useDashboardStats(dateRange, customFrom, customTo);
    // ================== KPI AGGREGATION ==================
    const aggregation = useMemo(() => buildRevenueAggregation(revenueChart), [revenueChart]);
    const availableYears = aggregation.years;
    const currentYear = new Date().getFullYear();
    const [kpiMode, setKpiMode] = useState("month");
    const [kpiPickerOpen, setKpiPickerOpen] = useState(false);
    const [pickerMode, setPickerMode] = useState(null);
    const [selectedChipIndex, setSelectedChipIndex] = useState(null);
    const openPicker = (mode) => {
        setPickerMode(mode);
        setKpiMode(mode); // cập nhật luôn mode để gauge đổi target
        setKpiPickerOpen(true);
    };
    const closePicker = () => {
        setKpiPickerOpen(false);
    };
    // Reset chip khi đổi mode
    useEffect(() => {
        if (kpiMode === "month") {
            setSelectedChipIndex(new Date().getMonth()); // tháng hiện tại
        }
        else if (kpiMode === "quarter") {
            setSelectedChipIndex(Math.floor(new Date().getMonth() / 3)); // quý hiện tại
        }
        else if (kpiMode === "year") {
            if (availableYears.length > 0) {
                // chọn năm mới nhất có data
                setSelectedChipIndex(availableYears.length - 1);
            }
            else {
                setSelectedChipIndex(null);
            }
        }
    }, [kpiMode, availableYears]);
    const target = REVENUE_KPI_TARGETS[kpiMode];
    const label = REVENUE_KPI_LABELS[kpiMode];
    // ================== KPI ACTUAL ==================
    let actual = 0;
    if (kpiMode === "month" && selectedChipIndex !== null) {
        const yearAgg = aggregation.byYear[currentYear];
        if (yearAgg) {
            actual = yearAgg.byMonth[selectedChipIndex] || 0;
        }
    }
    else if (kpiMode === "quarter" && selectedChipIndex !== null) {
        const yearAgg = aggregation.byYear[currentYear];
        if (yearAgg) {
            actual = yearAgg.byQuarter[selectedChipIndex] || 0;
        }
    }
    else if (kpiMode === "year" && selectedChipIndex !== null) {
        const year = availableYears[selectedChipIndex];
        const yearAgg = aggregation.byYear[year];
        if (yearAgg) {
            actual = yearAgg.total;
        }
    }
    else {
        actual = stats.totalRevenue; // fallback
    }
    const { percent } = calculateRevenueKpi(actual, target);
    // Gauge color
    let gaugeColor = "#facc15";
    if (percent >= 100)
        gaugeColor = "#10B981";
    else if (percent >= 80)
        gaugeColor = "#8B5CF6";
    // Gauge dùng 0–100
    const gaugeData = [{ name: "progress", value: Math.min(percent, 100) }];
    // ================== COD COLLECTION ==================
    const collectionRiskData = [
        {
            name: "Confirmed COD",
            value: stats.confirmedCodRevenue,
        },
        {
            name: "Delivered Not Paid",
            value: stats.deliveredNotPaidRevenue,
        },
    ];
    const values = collectionRiskData.map((d) => d.value || 0);
    const maxCollection = Math.max(...values, 0);
    const hasCollectionData = maxCollection > 0;
    const { collectionDomain, collectionTicks } = useMemo(() => {
        const values = collectionRiskData.map((d) => d.value || 0);
        const maxValue = Math.max(...values, 0);
        // Nếu chưa có data → cho YAxis tự auto
        if (maxValue === 0) {
            return {
                collectionDomain: undefined,
                collectionTicks: undefined,
            };
        }
        // Có data → scale nhẹ cho đẹp
        const niceMax = Math.ceil(maxValue / 10000000) * 10000000; // step 10M
        const step = niceMax / 4; // chia khoảng thành 4 tick
        const ticks = [];
        for (let v = 0; v <= niceMax; v += step) {
            ticks.push(v);
        }
        return {
            collectionDomain: [0, niceMax],
            collectionTicks: ticks,
        };
    }, [collectionRiskData]);
    const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
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
    // ======================================================
    //                      RENDER
    // ======================================================
    return (_jsxs(_Fragment, { children: [_jsx(AnalyticsLayout, { summaryCards: [
                    _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Total Revenue", titleClass: "text-[11px]", valueClass: "text-xl", value: formatCurrency(stats.totalRevenue), subtitle: "Gross revenue from paid orders", icon: _jsx(DollarSign, { className: "h-4 w-4 text-[#4ade80]" }), valueColor: "#4ade80" }, "total-revenue"),
                    _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Converted Revenue", titleClass: "text-[11px]", valueClass: "text-xl", value: formatCurrency(stats.convertedRevenue), subtitle: "Revenue from COD orders", icon: _jsx(TrendingUp, { className: "h-4 w-4 text-[#8B5CF6]" }), valueColor: "#8B5CF6" }, "converted-revenue"),
                    _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Average Order Value", titleClass: "text-[11px]", valueClass: "text-xl", value: formatCurrency(stats.avgOrderValue), subtitle: "Per paid order", icon: _jsx(Users, { className: "h-4 w-4 text-[#60a5fa]" }), valueColor: "#60a5fa" }, "aov"),
                    _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "Pending Revenue", titleClass: "text-[11px]", valueClass: "text-xl", value: formatCurrency(stats.pendingRevenue), subtitle: "COD approved/confirmed but not paid", icon: _jsx(Wallet, { className: "h-4 w-4 text-[#facc15]" }), valueColor: "#facc15" }, "pending-revenue"),
                ], charts: [
                    // 1) KPI Gauge
                    _jsx(ChartCard, { title: "Revenue KPI", subtitle: `Progress vs ${label.toUpperCase()} target`, compact: true, className: "h-full", children: _jsxs("div", { className: "flex h-full items-center justify-between gap-6", children: [_jsx("div", { className: "flex flex-col items-center justify-center", children: _jsxs("div", { className: "relative w-44 h-24 md:w-56 md:h-28", children: [_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsx(RadialBarChart, { data: gaugeData, innerRadius: "72%", outerRadius: "100%", startAngle: 180, endAngle: 0, children: _jsx(RadialBar, { dataKey: "value", cornerRadius: 10, background: { fill: "#111827" }, fill: gaugeColor }) }) }), _jsxs("div", { className: "pointer-events-none absolute inset-0 flex flex-col items-center justify-end translate-y-1", children: [_jsxs("span", { className: "text-3xl font-semibold", style: { color: gaugeColor }, children: [percent, "%"] }), _jsxs("span", { className: "mt-1 text-[11px] text-white/70", children: [formatCurrency(actual), " / ", formatCurrency(target)] })] })] }) }), _jsxs("div", { className: "flex w-32 flex-col justify-center gap-2", children: [_jsx("button", { onClick: () => openPicker("month"), className: "w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                                                (kpiMode === "month"
                                                    ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                                    : "bg-[#020617] border-white/25 text-white/80 hover:bg-[#111827] hover:border-white/40"), children: "Monthly" }), _jsx("button", { onClick: () => openPicker("quarter"), className: "w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                                                (kpiMode === "quarter"
                                                    ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                                    : "bg-[#020617] border-white/25 text-white/80 hover:bg-[#111827] hover:border-white/40"), children: "Quarterly" }), _jsx("button", { onClick: () => openPicker("year"), className: "w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                                                (kpiMode === "year"
                                                    ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                                    : "bg-[#020617] border-white/25 text-white/80 hover:bg-[#111827] hover:border-white/40"), children: "Yearly" })] })] }) }, "revenue-kpi"),
                    // 2) COD Collection Risk
                    _jsx(ChartCard, { title: "COD Collection Risk", subtitle: "COD confirmed vs not paid", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: collectionRiskData, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "name", stroke: "#E5E7EB", tick: { fill: "#E5E7EB", fontSize: 10 } }), _jsx(YAxis, { stroke: "#E5E7EB", tick: { fill: "#E5E7EB", fontSize: 10 }, 
                                        // Nếu không có data → domain [0, 1] nhưng chỉ hiện tick 0
                                        domain: hasCollectionData ? [0, maxCollection] : [0, 1], ticks: hasCollectionData ? undefined : [0], tickFormatter: (v) => hasCollectionData ? `${v / 1000000}M` : "0" }), _jsx(Tooltip, { contentStyle: {
                                            backgroundColor: "#020617",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: 8,
                                        }, formatter: (v) => formatCurrency(v) }), _jsx(Bar, { dataKey: "value", fill: "#F59E0B" })] }) }) }, "cod-collection-risk"),
                    // 3) Sales Growth
                    _jsx(ChartCard, { title: "Sales Growth", subtitle: "Daily revenue trend", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: revenueChart, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => formatYAxisMillions(v) }), _jsx(Tooltip, { contentStyle: {
                                            backgroundColor: "#020617",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: 8,
                                        }, formatter: (v) => formatCurrency(v) }), _jsx(Line, { type: "monotone", dataKey: "totalRevenue", stroke: "#10B981", strokeWidth: 2, dot: true })] }) }) }, "sales-growth"),
                    // 4) Revenue Breakdown
                    _jsx(ChartCard, { title: "Revenue Breakdown", subtitle: "Total vs Converted", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: revenueChart, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${(v / 1000000).toFixed(0)}M` }), _jsx(Tooltip, { contentStyle: {
                                            backgroundColor: "#020617",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: 8,
                                        }, formatter: (v) => formatCurrency(v) }), _jsx(Legend, { verticalAlign: "top", height: 20, wrapperStyle: {
                                            paddingTop: 0,
                                            color: "#E5E7EB",
                                            fontSize: 12,
                                        } }), _jsx(Bar, { name: "Total Revenue", dataKey: "totalRevenue", fill: "#8B5CF6" }), _jsx(Bar, { name: "Converted Revenue", dataKey: "convertedRevenue", fill: "#10B981" })] }) }) }, "revenue-breakdown"),
                    // 5) Revenue by Province
                    _jsx(ChartCard, { title: "Revenue by Province", subtitle: "Top provinces by paid revenue", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: provinceRevenue, layout: "vertical", margin: { top: 10, right: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: formatYAxisMillions }), _jsx(YAxis, { type: "category", dataKey: "province", width: 100, interval: 0, tick: (props) => {
                                            const { y, payload } = props;
                                            return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                        } }), _jsx(Tooltip, { contentStyle: {
                                            backgroundColor: "#020617",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: 8,
                                        }, formatter: (v) => formatCurrency(v), labelFormatter: (name) => `Province: ${name}` }), _jsx(Bar, { name: "Total Revenue", dataKey: "total_revenue", fill: "#22c55e", radius: [4, 4, 4, 4] })] }) }) }, "revenue-by-province"),
                    // 6) Top Products
                    _jsx(ChartCard, { title: "Top Products", subtitle: "Top products by revenue", compact: true, className: "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: topProductsChart, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: formatYAxisMillions }), _jsx(YAxis, { type: "category", dataKey: "productName", width: 150, interval: 0, tick: (props) => {
                                            const { y, payload } = props;
                                            return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 12, children: payload.value }));
                                        } }), _jsx(Bar, { name: "Total Revenue", dataKey: "totalRevenue", fill: "#A855F7", radius: [4, 4, 4, 4] })] }) }) }, "top-products")
                ], chartHeight: 200 }), kpiPickerOpen && pickerMode && (_jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center bg-black/40", onClick: closePicker, children: _jsxs("div", { className: "w-full max-w-lg rounded-2xl bg-[#050816] border border-[#6366F1]/40 p-4 shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-semibold text-white", children: ["Select ", REVENUE_KPI_LABELS[pickerMode]] }), _jsxs("p", { className: "text-xs text-white/60", children: ["Choose", " ", pickerMode === "year"
                                                    ? "year"
                                                    : pickerMode === "quarter"
                                                        ? "quarter"
                                                        : "month", " ", "for KPI calculation"] })] }), _jsx("button", { onClick: closePicker, className: "rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition", children: "\u2715" })] }), pickerMode === "year" ? (_jsx("div", { className: "flex justify-center", children: availableYears.length === 0 ? (_jsx("span", { className: "text-[11px] text-white/40", children: "No yearly data" })) : (_jsx("div", { className: "flex gap-2", children: availableYears.map((year, index) => (_jsx("button", { onClick: () => setSelectedChipIndex(index), className: "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium border transition-all " +
                                        (selectedChipIndex === index
                                            ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                            : "bg-[#020617] border-white/25 text-white/70 hover:bg-[#111827] hover:border-white/40"), children: year }, year))) })) })) : pickerMode === "quarter" ? (_jsx("div", { className: "mx-auto grid w-full max-w-xs grid-cols-2 gap-2", children: REVENUE_KPI_CHIPS.quarter.map((chip, index) => (_jsx("button", { onClick: () => setSelectedChipIndex(index), className: "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium border transition-all " +
                                    (selectedChipIndex === index
                                        ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                        : "bg-[#020617] border-white/25 text-white/70 hover:bg-[#111827] hover:border-white/40"), children: chip }, chip))) })) : (_jsx("div", { className: "mx-auto grid w-full max-w-md grid-cols-3 gap-2", children: REVENUE_KPI_CHIPS.month.map((chip, index) => (_jsx("button", { onClick: () => setSelectedChipIndex(index), className: "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium border transition-all " +
                                    (selectedChipIndex === index
                                        ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                        : "bg-[#020617] border-white/25 text-white/70 hover:bg-[#111827] hover:border-white/40"), children: chip }, chip))) })), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { onClick: closePicker, className: "inline-flex items-center justify-center rounded-full bg-[#8B5CF6] px-5 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition", children: "Apply" }) })] }) }))] }));
};
// ================== HELPER: AGGREGATION BY YEAR ==================
function buildRevenueAggregation(revenuePoints) {
    const byYear = {};
    for (const point of revenuePoints) {
        const d = new Date(point.date);
        if (Number.isNaN(d.getTime()))
            continue;
        const y = d.getFullYear();
        const m = d.getMonth(); // 0–11
        const q = Math.floor(m / 3); // 0–3
        if (!byYear[y]) {
            byYear[y] = {
                total: 0,
                byMonth: new Array(12).fill(0),
                byQuarter: [0, 0, 0, 0],
            };
        }
        byYear[y].total += point.totalRevenue;
        byYear[y].byMonth[m] += point.totalRevenue;
        byYear[y].byQuarter[q] += point.totalRevenue;
    }
    const years = Object.keys(byYear)
        .map((s) => parseInt(s, 10))
        .sort((a, b) => a - b);
    return { years, byYear };
}
