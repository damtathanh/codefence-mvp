import React, { useState, useMemo, useEffect } from "react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar,
} from "recharts";
import {
    REVENUE_KPI_TARGETS,
    REVENUE_KPI_LABELS,
    REVENUE_KPI_CHIPS,
    calculateRevenueKpi,
    type RevenueKpiMode,
} from "../config/revenueKpiConfig";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";
import {
    useDashboardStats,
    type DashboardDateRange,
} from "../../dashboard/useDashboardStats";

interface RevenueTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

interface RevenueAggregationByYear {
    years: number[];
    byYear: Record<
        number,
        {
            total: number;
            byMonth: number[]; // 0–11
            byQuarter: number[]; // 0–3
        }
    >;
}

export const RevenueTab: React.FC<RevenueTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    const { loading, error, stats, revenueChart } = useDashboardStats(
        dateRange,
        customFrom,
        customTo
    );

    // ================== KPI AGGREGATION ==================
    const aggregation = useMemo(
        () => buildRevenueAggregation(revenueChart),
        [revenueChart]
    );
    const availableYears = aggregation.years;
    const currentYear = new Date().getFullYear();

    const [kpiMode, setKpiMode] = useState<RevenueKpiMode>("month");
    const [kpiPickerOpen, setKpiPickerOpen] = useState(false);
    const [pickerMode, setPickerMode] = useState<RevenueKpiMode | null>(null);
    const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);

    const openPicker = (mode: RevenueKpiMode) => {
        setPickerMode(mode);
        setKpiMode(mode);         // cập nhật luôn mode để gauge đổi target
        setKpiPickerOpen(true);
    };

    const closePicker = () => {
        setKpiPickerOpen(false);
    };

    // Reset chip khi đổi mode
    useEffect(() => {
        if (kpiMode === "month") {
            setSelectedChipIndex(new Date().getMonth()); // tháng hiện tại
        } else if (kpiMode === "quarter") {
            setSelectedChipIndex(Math.floor(new Date().getMonth() / 3)); // quý hiện tại
        } else if (kpiMode === "year") {
            if (availableYears.length > 0) {
                // chọn năm mới nhất có data
                setSelectedChipIndex(availableYears.length - 1);
            } else {
                setSelectedChipIndex(null);
            }
        }
    }, [kpiMode, availableYears]);

    const target = REVENUE_KPI_TARGETS[kpiMode];
    const label = REVENUE_KPI_LABELS[kpiMode];
    const chips = REVENUE_KPI_CHIPS[kpiMode];

    // ================== KPI ACTUAL ==================
    let actual = 0;

    if (kpiMode === "month" && selectedChipIndex !== null) {
        const yearAgg = aggregation.byYear[currentYear];
        if (yearAgg) {
            actual = yearAgg.byMonth[selectedChipIndex] || 0;
        }
    } else if (kpiMode === "quarter" && selectedChipIndex !== null) {
        const yearAgg = aggregation.byYear[currentYear];
        if (yearAgg) {
            actual = yearAgg.byQuarter[selectedChipIndex] || 0;
        }
    } else if (kpiMode === "year" && selectedChipIndex !== null) {
        const year = availableYears[selectedChipIndex];
        const yearAgg = aggregation.byYear[year];
        if (yearAgg) {
            actual = yearAgg.total;
        }
    } else {
        actual = stats.totalRevenue; // fallback
    }

    const { percent } = calculateRevenueKpi(actual, target);

    // Gauge color
    let gaugeColor = "#facc15";
    if (percent >= 110) gaugeColor = "#10B981";
    else if (percent >= 80) gaugeColor = "#8B5CF6";

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

    const { collectionDomain, collectionTicks } = useMemo(() => {
        const values = collectionRiskData.map((d) => d.value || 0);
        const maxValue = Math.max(...values, 0);
        const step = 100_000_000;
        const roundedMax = maxValue === 0 ? step : Math.ceil(maxValue / step) * step;

        const ticks: number[] = [];
        for (let v = 0; v <= roundedMax; v += step) {
            ticks.push(v);
        }

        return {
            collectionDomain: [0, roundedMax] as [number, number],
            collectionTicks: ticks,
        };
    }, [stats.confirmedCodRevenue, stats.deliveredNotPaidRevenue]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(value);

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

    // ======================================================
    //                      RENDER
    // ======================================================
    return (
        <>
            <AnalyticsLayout
                summaryCards={[
                    <StatCard
                        key="total-revenue"
                        className="px-4 py-2 h-[88px]"
                        title="Total Revenue"
                        titleClass="text-[11px]"
                        valueClass="text-xl"
                        value={formatCurrency(stats.totalRevenue)}
                        subtitle="Gross revenue from paid orders"
                        icon={<DollarSign className="h-4 w-4 text-[#4ade80]" />}
                        valueColor="#4ade80"
                    />,
                    <StatCard
                        key="converted-revenue"
                        className="px-4 py-2 h-[88px]"
                        title="Converted Revenue"
                        titleClass="text-[11px]"
                        valueClass="text-xl"
                        value={formatCurrency(stats.convertedRevenue)}
                        subtitle="Revenue from COD orders"
                        icon={<TrendingUp className="h-4 w-4 text-[#8B5CF6]" />}
                        valueColor="#8B5CF6"
                    />,
                    <StatCard
                        key="aov"
                        className="px-4 py-2 h-[88px]"
                        title="Average Order Value"
                        titleClass="text-[11px]"
                        valueClass="text-xl"
                        value={formatCurrency(stats.avgOrderValue)}
                        subtitle="Per paid order"
                        icon={<Users className="h-4 w-4 text-[#60a5fa]" />}
                        valueColor="#60a5fa"
                    />,
                    <StatCard
                        key="pending-revenue"
                        className="px-4 py-2 h-[88px]"
                        title="Pending Revenue"
                        titleClass="text-[11px]"
                        valueClass="text-xl"
                        value={formatCurrency(stats.pendingRevenue)}
                        subtitle="COD confirmed/delivering but not paid"
                        icon={<Wallet className="h-4 w-4 text-[#facc15]" />}
                        valueColor="#facc15"
                    />,
                ]}
                charts={[
                    // 1) KPI Gauge
                    <ChartCard
                        key="revenue-kpi"
                        title="Revenue KPI"
                        subtitle={`Progress vs ${label.toUpperCase()} target`}
                        compact
                        className="h-full"
                    >
                        <div className="flex items-center justify-between gap-6">
                            {/* LEFT: Gauge + % + actual / target */}
                            <div className="flex flex-1 flex-col items-center justify-center">
                                {/* Gauge */}
                                <div className="relative w-44 h-24 md:w-56 md:h-28">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart
                                            data={gaugeData}
                                            innerRadius="72%"
                                            outerRadius="100%"
                                            startAngle={180}
                                            endAngle={0}
                                        >
                                            <RadialBar
                                                dataKey="value"
                                                cornerRadius={10}
                                                background={{ fill: "#111827" }}
                                                fill={gaugeColor}
                                            />
                                        </RadialBarChart>
                                    </ResponsiveContainer>

                                    {/* % nằm trong lòng gauge, sát phía dưới */}
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center translate-y-2">
                                        <span className="text-3xl font-semibold">
                                            {percent}%
                                        </span>
                                    </div>
                                </div>

                                {/* Actual / Target – sát ngay dưới gauge */}
                                <div className="mt-2 text-xs text-white/65 text-center">
                                    {formatCurrency(actual)} / {formatCurrency(target)}
                                </div>
                            </div>

                            {/* RIGHT: 3 nút chọn mode */}
                            <div className="flex w-32 flex-col justify-center gap-2">
                                <button
                                    onClick={() => openPicker("month")}
                                    className={
                                        "w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                                        (kpiMode === "month"
                                            ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                            : "bg-[#020617] border-white/25 text-white/80 hover:bg-[#111827] hover:border-white/40")
                                    }
                                >
                                    Monthly
                                </button>

                                <button
                                    onClick={() => openPicker("quarter")}
                                    className={
                                        "w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                                        (kpiMode === "quarter"
                                            ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                            : "bg-[#020617] border-white/25 text-white/80 hover:bg-[#111827] hover:border-white/40")
                                    }
                                >
                                    Quarterly
                                </button>

                                <button
                                    onClick={() => openPicker("year")}
                                    className={
                                        "w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-all " +
                                        (kpiMode === "year"
                                            ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                            : "bg-[#020617] border-white/25 text-white/80 hover:bg-[#111827] hover:border-white/40")
                                    }
                                >
                                    Yearly
                                </button>
                            </div>
                        </div>
                    </ChartCard>,

                    // 2) COD Collection Risk
                    <ChartCard
                        key="cod-collection-risk"
                        title="COD Collection Risk"
                        subtitle="COD confirmed vs not paid"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={collectionRiskData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#E5E7EB"
                                    tick={{ fill: "#E5E7EB", fontSize: 10 }}
                                />
                                <YAxis
                                    stroke="#E5E7EB"
                                    tick={{ fill: "#E5E7EB", fontSize: 10 }}
                                    domain={collectionDomain}
                                    ticks={collectionTicks}
                                    tickFormatter={(v) =>
                                        `${(v as number) / 1_000_000}M`
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v) => formatCurrency(v as number)}
                                />
                                <Bar dataKey="value" fill="#F59E0B" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>,

                    // 3) Sales Growth
                    <ChartCard
                        key="sales-growth"
                        title="Sales Growth"
                        subtitle="Daily revenue trend"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v) =>
                                        `${(v as number / 1_000_000).toFixed(0)}M`
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v) => formatCurrency(v as number)}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="totalRevenue"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>,

                    // 4) Revenue Breakdown
                    <ChartCard
                        key="revenue-breakdown"
                        title="Revenue Breakdown"
                        subtitle="Total vs Converted"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v) =>
                                        `${(v as number / 1_000_000).toFixed(0)}M`
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v) => formatCurrency(v as number)}
                                />
                                <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                                <Bar dataKey="totalRevenue" fill="#8B5CF6" />
                                <Bar dataKey="convertedRevenue" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>,

                    // 5) Revenue by Province
                    <ChartCard
                        key="revenue-by-province"
                        title="Revenue by Province"
                        subtitle="Top provinces"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v) =>
                                        `${(v as number / 1_000_000).toFixed(0)}M`
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v) => formatCurrency(v as number)}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="convertedRevenue"
                                    stroke="#22C55E"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>,

                    // 6) Top Products
                    <ChartCard
                        key="top-products"
                        title="Top Products"
                        subtitle="Best sellers"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v) =>
                                        `${(v as number / 1_000_000).toFixed(0)}M`
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v) => formatCurrency(v as number)}
                                />
                                <Bar dataKey="convertedRevenue" fill="#A855F7" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>,
                ]}
                chartHeight={200}
            />

            {/* KPI Period Picker Modal – giữ như cũ */}
            {kpiPickerOpen && pickerMode && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
                    onClick={closePicker}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-[#050816] border border-[#6366F1]/40 p-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">
                                    Select {REVENUE_KPI_LABELS[pickerMode]}
                                </h3>
                                <p className="text-xs text-white/60">
                                    Choose{" "}
                                    {pickerMode === "year"
                                        ? "year"
                                        : pickerMode === "quarter"
                                            ? "quarter"
                                            : "month"}{" "}
                                    for KPI calculation
                                </p>
                            </div>
                            <button
                                onClick={closePicker}
                                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body: chips */}
                        {pickerMode === "year" ? (
                            <div className="flex justify-center">
                                {availableYears.length === 0 ? (
                                    <span className="text-[11px] text-white/40">
                                        No yearly data
                                    </span>
                                ) : (
                                    <div className="flex gap-2">
                                        {availableYears.map((year, index) => (
                                            <button
                                                key={year}
                                                onClick={() => setSelectedChipIndex(index)}
                                                className={
                                                    "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium border transition-all " +
                                                    (selectedChipIndex === index
                                                        ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                                        : "bg-[#020617] border-white/25 text-white/70 hover:bg-[#111827] hover:border-white/40")
                                                }
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : pickerMode === "quarter" ? (
                            <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-2">
                                {REVENUE_KPI_CHIPS.quarter.map((chip, index) => (
                                    <button
                                        key={chip}
                                        onClick={() => setSelectedChipIndex(index)}
                                        className={
                                            "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium border transition-all " +
                                            (selectedChipIndex === index
                                                ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                                : "bg-[#020617] border-white/25 text-white/70 hover:bg-[#111827] hover:border-white/40")
                                        }
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
                                {REVENUE_KPI_CHIPS.month.map((chip, index) => (
                                    <button
                                        key={chip}
                                        onClick={() => setSelectedChipIndex(index)}
                                        className={
                                            "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium border transition-all " +
                                            (selectedChipIndex === index
                                                ? "bg-[#8B5CF6] border-transparent text-white shadow"
                                                : "bg-[#020617] border-white/25 text-white/70 hover:bg-[#111827] hover:border-white/40")
                                        }
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={closePicker}
                                className="inline-flex items-center justify-center rounded-full bg-[#8B5CF6] px-5 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ================== HELPER: AGGREGATION BY YEAR ==================

function buildRevenueAggregation(
    revenuePoints: { date: string; totalRevenue: number }[]
): RevenueAggregationByYear {
    const byYear: RevenueAggregationByYear["byYear"] = {};

    for (const point of revenuePoints) {
        const d = new Date(point.date);
        if (Number.isNaN(d.getTime())) continue;

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
