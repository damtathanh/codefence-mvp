import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { VietnamMap } from "../../../components/maps/VietnamMap";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from "recharts";
import { Shield, DollarSign, TrendingDown, AlertTriangle, } from "lucide-react";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
export const GeoTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, geoRiskStats } = useDashboardStats(dateRange, customFrom, customTo);
    const [selectedProvince, setSelectedProvince] = useState("all");
    const [selectedDistrict, setSelectedDistrict] = useState("all");
    const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
    const formatPercent = (value) => `${value.toFixed(1)}%`;
    // ------------------ PREPARE DATA ------------------
    const provinces = geoRiskStats?.provinces ?? [];
    // Cast for TS to avoid {} type warning
    const districtsByProvince = (geoRiskStats?.districtsByProvince ??
        {});
    const hasAnyProvince = provinces.length > 0;
    const sortedProvinceNames = [...provinces]
        .map((p) => p.province)
        .sort((a, b) => a.localeCompare(b, "vi"));
    const selectedProvinceStat = selectedProvince === "all"
        ? undefined
        : provinces.find((p) => p.province === selectedProvince);
    const districtOptions = selectedProvince === "all"
        ? []
        : districtsByProvince[selectedProvince] ?? [];
    // ------------------ MAP DATA ------------------
    const mapData = useMemo(() => {
        const result = {};
        for (const p of provinces) {
            result[p.province] = p.avgRiskScore ?? 0;
        }
        return result;
    }, [provinces]);
    // ------------------ LOADING + ERROR ------------------
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    // ------------------ DATASETS FOR CHARTS ------------------
    const topRevenueProvinces = [...provinces]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);
    const salesByProvinceData = topRevenueProvinces.map((p) => ({
        province: p.province,
        totalRevenue: p.totalRevenue,
    }));
    const provincesWithVolume = provinces.filter((p) => p.codOrdersCount >= 50);
    const topBoomProvinces = [...provincesWithVolume]
        .sort((a, b) => b.boomRate - a.boomRate)
        .slice(0, 5);
    const boomRateByProvinceData = topBoomProvinces.map((p) => ({
        province: p.province,
        boomRate: p.boomRate,
    }));
    const provincesWithRisk = provinces.filter((p) => p.avgRiskScore !== null);
    const topRiskProvinces = [...provincesWithRisk]
        .sort((a, b) => (b.avgRiskScore ?? 0) - (a.avgRiskScore ?? 0))
        .slice(0, 5);
    const riskByProvinceData = topRiskProvinces.map((p) => ({
        province: p.province,
        avgRiskScore: p.avgRiskScore ?? 0,
    }));
    const topOrderProvinces = [...provinces]
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);
    const codMixByProvinceData = topOrderProvinces.map((p) => ({
        province: p.province,
        codOrders: p.codOrdersCount,
        prepaidOrders: p.prepaidOrdersCount,
    }));
    // ------------------ RENDER ------------------
    return (_jsx(AnalyticsLayout, { summaryCards: [
            _jsx(StatCard, { title: "HIGHEST-RISK PROVINCE", value: geoRiskStats.highestRiskProvince?.province ?? "No data", subtitle: geoRiskStats.highestRiskProvince
                    ? `Avg risk: ${geoRiskStats.highestRiskProvince.avgRiskScore ??
                        "N/A"} (${geoRiskStats.highestRiskProvince.orderCount} orders)`
                    : "Need more COD orders with risk score", icon: _jsx(AlertTriangle, { className: "h-4 w-4 text-red-400" }), valueColor: "#f87171", className: "h-[88px] px-4 py-2", titleClass: "text-[11px]", valueClass: "text-lg" }, "highest-risk-province"),
            _jsx(StatCard, { title: "SAFEST PROVINCE", value: geoRiskStats.safestProvince?.province ?? "No data", subtitle: geoRiskStats.safestProvince
                    ? `Avg risk: ${geoRiskStats.safestProvince.avgRiskScore ??
                        "N/A"} (${geoRiskStats.safestProvince.orderCount} orders)`
                    : "Need more COD orders with risk score", icon: _jsx(Shield, { className: "h-4 w-4 text-green-400" }), valueColor: "#4ade80", className: "h-[88px] px-4 py-2", titleClass: "text-[11px]", valueClass: "text-lg" }, "safest-province"),
            _jsx(StatCard, { title: "TOP REVENUE PROVINCE", value: geoRiskStats.topRevenueProvince
                    ? formatCurrency(geoRiskStats.topRevenueProvince.totalRevenue)
                    : "No data", subtitle: geoRiskStats.topRevenueProvince?.province ??
                    "Need at least 1 paid order", icon: _jsx(DollarSign, { className: "h-4 w-4 text-[#8B5CF6]" }), valueColor: "#8B5CF6", className: "h-[88px] px-4 py-2", titleClass: "text-[11px]", valueClass: "text-lg" }, "top-revenue-province"),
            _jsx(StatCard, { title: "WORST BOOM PROVINCE", value: provincesWithVolume.length
                    ? topBoomProvinces[0]?.province ?? "No data"
                    : "No data", subtitle: provincesWithVolume.length && topBoomProvinces[0]
                    ? `Boom rate: ${formatPercent(topBoomProvinces[0].boomRate)} (min 50 COD orders)`
                    : "Min 50 COD orders per province", icon: _jsx(TrendingDown, { className: "h-4 w-4 text-blue-400" }), valueColor: "#60a5fa", className: "h-[88px] px-4 py-2", titleClass: "text-[11px]", valueClass: "text-lg" }, "worst-boom-province"),
        ], children: _jsxs("div", { className: "grid flex-1 min-h-0 grid-cols-1 gap-3 xl:grid-cols-3", children: [_jsxs("div", { className: "flex flex-col gap-3 xl:col-span-2", children: [_jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [_jsx(ChartCard, { title: "Sales by Province", subtitle: "Top 5 provinces by revenue", compact: true, className: "h-[200px]", children: !hasAnyProvince || salesByProvinceData.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No geo revenue data in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: salesByProvinceData, layout: "vertical", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: ({ y, payload }) => (_jsx("text", { x: 12, y: y + 4, fill: "#E5E7EB", fontSize: 12, children: payload.value })) }), _jsx(Tooltip, { formatter: (v) => [
                                                        formatCurrency(v),
                                                        "Revenue",
                                                    ] }), _jsx(Bar, { dataKey: "totalRevenue", fill: "#8B5CF6" })] }) })) }), _jsx(ChartCard, { title: "Boom Rate by Province", subtitle: "Top 5 boom provinces", compact: true, className: "h-[200px]", children: !hasAnyProvince || boomRateByProvinceData.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No boom data in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: boomRateByProvinceData, layout: "vertical", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v}%` }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: ({ y, payload }) => (_jsx("text", { x: 12, y: y + 4, fill: "#E5E7EB", fontSize: 12, children: payload.value })) }), _jsx(Tooltip, { formatter: (v) => [`${v}%`, "Boom rate"] }), _jsx(Bar, { dataKey: "boomRate", fill: "#F97373" })] }) })) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [_jsx(ChartCard, { title: "Risk Score by Province", subtitle: "Top 5 provinces by risk", compact: true, className: "h-[200px]", children: !hasAnyProvince || riskByProvinceData.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No risk data in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: riskByProvinceData, layout: "vertical", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: ({ y, payload }) => (_jsx("text", { x: 12, y: y + 4, fill: "#E5E7EB", fontSize: 12, children: payload.value })) }), _jsx(Tooltip, { formatter: (v) => [
                                                        v.toFixed(1),
                                                        "Risk score",
                                                    ] }), _jsx(Bar, { dataKey: "avgRiskScore", fill: "#6366F1" })] }) })) }), _jsx(ChartCard, { title: "COD vs Prepaid", subtitle: "Order mix by province", compact: true, className: "h-[200px]", children: !hasAnyProvince || codMixByProvinceData.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No mix data in this period" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: codMixByProvinceData, layout: "vertical", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number" }), _jsx(YAxis, { type: "category", dataKey: "province", width: 120, interval: 0, tick: ({ y, payload }) => (_jsx("text", { x: 12, y: y + 4, fill: "#E5E7EB", fontSize: 12, children: payload.value })) }), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Bar, { dataKey: "codOrders", name: "COD", stackId: "a", fill: "#38BDF8" }), _jsx(Bar, { dataKey: "prepaidOrders", name: "Prepaid", stackId: "a", fill: "#22D3EE" })] }) })) })] })] }), _jsx(ChartCard, { title: "", subtitle: "", compact: false, className: "h-[412px]", children: _jsxs("div", { className: "flex h-full min-h-0 items-stretch gap-6", children: [_jsxs("div", { className: "flex h-full w-[190px] flex-col justify-start", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Vietnam Map" }), _jsx("p", { className: "mt-1 text-xs text-white/60", children: "Select a province and district" }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsxs("select", { value: selectedProvince, onChange: (e) => {
                                                    setSelectedProvince(e.target.value);
                                                    setSelectedDistrict("all");
                                                }, className: "w-full rounded-lg border border-white/10 bg-[#12163A] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]", children: [_jsx("option", { value: "all", children: "All Provinces" }), sortedProvinceNames.map((name) => (_jsx("option", { value: name, children: name }, name)))] }), _jsxs("select", { value: selectedDistrict, onChange: (e) => setSelectedDistrict(e.target.value), disabled: selectedProvince === "all" ||
                                                    districtOptions.length === 0, className: "w-full rounded-lg border border-white/10 bg-[#12163A] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60", children: [_jsx("option", { value: "all", children: "All Districts" }), districtOptions.map((d) => (_jsx("option", { value: d, children: d }, d)))] })] }), _jsx("div", { className: "mt-4 text-xs text-white/70", children: selectedProvinceStat ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-1 text-sm font-medium text-white", children: selectedProvinceStat.province }), _jsxs("div", { children: ["Orders: ", selectedProvinceStat.orderCount] }), _jsxs("div", { children: ["Boom: ", formatPercent(selectedProvinceStat.boomRate)] }), _jsxs("div", { children: ["Avg risk:", " ", selectedProvinceStat.avgRiskScore ?? "N/A"] }), _jsxs("div", { children: ["Revenue:", " ", formatCurrency(selectedProvinceStat.totalRevenue)] })] })) : (_jsx("div", { className: "text-white/60", children: "Click a province to view details." })) })] }), _jsx("div", { className: "flex h-full min-h-0 flex-1", children: _jsx("div", { className: "h-[370px] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#020617]", children: _jsx(VietnamMap, { data: mapData, onProvinceClick: (name) => {
                                            setSelectedProvince(name);
                                            setSelectedDistrict("all");
                                        } }) }) })] }) })] }) }));
};
