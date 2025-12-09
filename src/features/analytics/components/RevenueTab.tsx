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
    const { loading, error, stats, revenueChart, provinceRevenue, topProductsChart } = useDashboardStats(
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
    if (percent >= 100) gaugeColor = "#10B981";
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
        const niceMax = Math.ceil(maxValue / 10_000_000) * 10_000_000; // step 10M
        const step = niceMax / 4; // chia khoảng thành 4 tick

        const ticks: number[] = [];
        for (let v = 0; v <= niceMax; v += step) {
            ticks.push(v);
        }

        return {
            collectionDomain: [0, niceMax] as [number, number],
            collectionTicks: ticks,
        };
    }, [collectionRiskData]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(value);

    const formatYAxisMillions = (value: number) => {
        if (value === 0) return "0";
        const m = value / 1_000_000;
        if (Number.isInteger(m)) return `${m}M`;
        return `${m.toFixed(1)}M`;
    };

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
                        subtitle="COD approved/confirmed but not paid"
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
                        <div className="flex h-full items-center justify-between gap-6">
                            {/* LEFT: Gauge + % + actual/target (tất cả trong 1 khối) */}
                            <div className="flex flex-col items-center justify-center">
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

                                    {/* Overlay: % + actual/target cùng 1 overlay */}
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end translate-y-1">
                                        <span className="text-3xl font-semibold" style={{ color: gaugeColor }}>
                                            {percent}%
                                        </span>
                                        <span className="mt-1 text-[11px] text-white/70">
                                            {formatCurrency(actual)} / {formatCurrency(target)}
                                        </span>
                                    </div>
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
                    </ChartCard>
                    ,

                    // 2) COD Collection Risk
                    <ChartCard
                        key="cod-collection-risk"
                        title="COD Collection Risk"
                        subtitle="COD confirmed vs not paid"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={collectionRiskData} margin={{ top: 0, right: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#E5E7EB"
                                    tick={{ fill: "#E5E7EB", fontSize: 10 }}
                                />
                                <YAxis
                                    stroke="#E5E7EB"
                                    tick={{ fill: "#E5E7EB", fontSize: 10 }}
                                    // Nếu không có data → domain [0, 1] nhưng chỉ hiện tick 0
                                    domain={hasCollectionData ? [0, maxCollection] : [0, 1]}
                                    ticks={hasCollectionData ? undefined : [0]}
                                    tickFormatter={(v) =>
                                        hasCollectionData ? `${(v as number) / 1_000_000}M` : "0"
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
                            <LineChart data={revenueChart} margin={{ top: 0, right: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v) => formatYAxisMillions(v as number)}
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
                                    dot={true}
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
                            <BarChart data={revenueChart} margin={{ top: 0, right: 10, bottom: 0 }}>
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
                                <Legend
                                    verticalAlign="top"
                                    height={20}
                                    wrapperStyle={{
                                        paddingTop: 0,
                                        color: "#E5E7EB",
                                        fontSize: 12,
                                    }}
                                />
                                <Bar
                                    name="Total Revenue"
                                    dataKey="totalRevenue"
                                    fill="#8B5CF6"
                                />
                                <Bar
                                    name="Converted Revenue"
                                    dataKey="convertedRevenue"
                                    fill="#10B981"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>,

                    // 5) Revenue by Province
                    <ChartCard
                        key="revenue-by-province"
                        title="Revenue by Province"
                        subtitle="Top provinces by paid revenue"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={provinceRevenue}
                                layout="vertical"
                                margin={{ top: 10, right: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />

                                {/* trục X là số tiền */}
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={formatYAxisMillions}
                                />

                                {/* trục Y là tên tỉnh, tăng width để không bị cắt chữ */}
                                <YAxis
                                    type="category"
                                    dataKey="province"
                                    width={100}
                                    interval={0}
                                    tick={(props) => {
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
                                    formatter={(v: any) => formatCurrency(v as number)}
                                    labelFormatter={(name: any) => `Province: ${name}`}
                                />

                                <Bar
                                    name="Total Revenue"
                                    dataKey="total_revenue"
                                    fill="#22c55e"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>,

                    // 6) Top Products
                    <ChartCard
                        key="top-products"
                        title="Top Products"
                        subtitle="Top products by revenue"
                        compact
                        className="h-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topProductsChart}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />

                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={formatYAxisMillions}
                                />

                                <YAxis
                                    type="category"
                                    dataKey="productName"
                                    width={150}
                                    interval={0}
                                    tick={(props) => {
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

                                <Bar
                                    name="Total Revenue"
                                    dataKey="totalRevenue"
                                    fill="#A855F7"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
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
