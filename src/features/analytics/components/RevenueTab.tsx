import React, { useState, useMemo, useEffect } from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import {
    REVENUE_KPI_TARGETS,
    REVENUE_KPI_LABELS,
    REVENUE_KPI_CHIPS,
    calculateRevenueKpi,
    type RevenueKpiMode,
} from "../config/revenueKpiConfig";
import { DollarSign, TrendingUp, Users, Wallet } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface RevenueTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const RevenueTab: React.FC<RevenueTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, stats, revenueChart } = useDashboardStats(dateRange, customFrom, customTo);
    const [kpiMode, setKpiMode] = useState<RevenueKpiMode>("month");
    const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);

    // Reset selected chip when mode changes
    useEffect(() => {
        const now = new Date();
        if (kpiMode === 'month') {
            setSelectedChipIndex(now.getMonth()); // 0-11
        } else if (kpiMode === 'quarter') {
            setSelectedChipIndex(Math.floor(now.getMonth() / 3)); // 0-3
        } else {
            setSelectedChipIndex(0); // Year mode
        }
    }, [kpiMode]);

    // Build yearly summary from revenue chart (or orders if available)
    // Note: This relies on the current date range including the data. 
    // If the global date range is small (e.g. "Today"), this will only show today's data.
    const yearlySummary = useMemo(() => {
        return buildYearlyRevenueSummary(revenueChart);
    }, [revenueChart]);

    // Calculate Target
    const target = REVENUE_KPI_TARGETS[kpiMode];
    const label = REVENUE_KPI_LABELS[kpiMode];
    const chips = REVENUE_KPI_CHIPS[kpiMode];

    // Calculate Actual based on mode and selected chip
    let actual = 0;
    if (kpiMode === 'month' && selectedChipIndex !== null) {
        actual = yearlySummary.thisYearByMonth[selectedChipIndex] || 0;
    } else if (kpiMode === 'quarter' && selectedChipIndex !== null) {
        actual = yearlySummary.thisYearByQuarter[selectedChipIndex] || 0;
    } else if (kpiMode === 'year') {
        actual = yearlySummary.thisYear;
    } else {
        actual = stats.totalRevenue; // Fallback
    }

    const { percent, clampedPercent, isOverTarget } = calculateRevenueKpi(actual, target);

    // Gauge color logic
    let gaugeColor = "#facc15"; // amber (default/low < 80%)
    if (percent >= 110) {
        gaugeColor = "#10B981"; // green (over-achieved)
    } else if (percent >= 80) {
        gaugeColor = "#8B5CF6"; // purple (on track)
    }

    // Visual cap at 100% for the gauge arc
    const visualPercent = Math.min(percent, 100);
    const gaugeData = [{ name: "progress", value: visualPercent }];

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

        // Đơn vị 100M
        const step = 100_000_000;
        const roundedMax =
            maxValue === 0 ? step : Math.ceil(maxValue / step) * step;

        const ticks: number[] = [];
        for (let v = 0; v <= roundedMax; v += step) {
            ticks.push(v);
        }

        return {
            collectionDomain: [0, roundedMax] as [number, number],
            collectionTicks: ticks,
        };
    }, [stats.confirmedCodRevenue, stats.deliveredNotPaidRevenue]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-white/60">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-red-400">Error loading analytics: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 min-h-0">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    subtitle="Gross revenue from paid orders"
                    icon={<DollarSign className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Converted Revenue"
                    value={formatCurrency(stats.convertedRevenue)}
                    subtitle="Revenue from COD orders"
                    icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                    valueColor="#34d399"
                />
                <StatCard
                    title="Average Order Value"
                    value={formatCurrency(stats.avgOrderValue)}
                    subtitle="Per paid order"
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
                <StatCard
                    title="Pending Revenue"
                    value={formatCurrency(stats.pendingRevenue)}
                    subtitle="COD confirmed/delivering but not paid"
                    icon={<Wallet className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
            </div>

            {/* Row 2: KPI & Risk Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Revenue KPI" subtitle={`Progress vs ${label.toUpperCase()} Target`}>
                    <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-6 h-full p-4">

                        {/* Gauge bên trái */}
                        <div className="flex flex-col items-center justify-center w-full lg:w-1/2">
                            <div className="relative w-full h-64 max-w-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart
                                        data={gaugeData}
                                        innerRadius="75%"
                                        outerRadius="100%"
                                        startAngle={180}
                                        endAngle={0}
                                    >
                                        <RadialBar
                                            dataKey="value"
                                            cornerRadius={10}
                                            background={{ fill: '#1F2937' }}
                                            fill={gaugeColor}
                                        />
                                    </RadialBarChart>
                                </ResponsiveContainer>

                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                    <span className={`text-4xl font-bold ${percent >= 110 ? 'text-emerald-400' : 'text-white'}`}>
                                        {percent}%
                                    </span>
                                    <div className="mt-3 text-sm text-white/60">
                                        {formatCurrency(actual)} / {formatCurrency(target)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selector + chips bên phải */}
                        <div className="flex-1 flex flex-col gap-4">

                            {/* Label */}
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">KPI Period</p>

                            {/* Button Group */}
                            <div className="inline-flex p-1 bg-transparent border border-white/10 rounded-lg w-fit">
                                {(["month", "quarter", "year"] as RevenueKpiMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setKpiMode(mode)}
                                        className={`
                                            px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200
                                            ${kpiMode === mode
                                                ? "bg-[#8B5CF6] text-white shadow-md"
                                                : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white"
                                            }
                                        `}
                                    >
                                        {REVENUE_KPI_LABELS[mode]}
                                    </button>
                                ))}
                            </div>

                            {/* Chips Grid */}
                            {/* Chips Grid or Yearly Row */}
                            {kpiMode === 'year' ? (
                                <div className="mt-2 flex items-center justify-center gap-4">
                                    <div className="text-sm text-white/60 flex flex-col items-end">
                                        <span>Last Year: {yearlySummary.lastYear !== null ? formatCurrency(yearlySummary.lastYear) : 'N/A'}</span>
                                        {yearlySummary.lastYear !== null && yearlySummary.lastYear > 0 && (
                                            <span className={`text-xs ${actual >= yearlySummary.lastYear ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {actual >= yearlySummary.lastYear ? '+' : ''}
                                                {((actual - yearlySummary.lastYear) / yearlySummary.lastYear * 100).toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="h-8 px-4 flex items-center justify-center rounded-full text-xs font-medium border border-transparent bg-[#8B5CF6] text-white shadow-md cursor-default"
                                    >
                                        This Year
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-2 w-full mt-2 grid-cols-3 sm:grid-cols-4">
                                    {chips.map((chip, index) => (
                                        <button
                                            key={chip}
                                            onClick={() => setSelectedChipIndex(index)}
                                            className={`
                                                h-8 flex items-center justify-center rounded-full text-xs font-medium border transition-all duration-200
                                                ${selectedChipIndex === index
                                                    ? "bg-[#8B5CF6] border-transparent text-white shadow-md"
                                                    : "bg-[#0B1020] border-white/10 text-white/40 hover:bg-[#1F2937] hover:border-white/20"
                                                }
                                                cursor-pointer
                                            `}
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="COD Collection Risk" subtitle="Confirmed COD revenue vs Delivered but not paid">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={collectionRiskData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="name"
                                stroke="#E5E7EB"
                                tick={{ fill: "#E5E7EB", fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#E5E7EB"
                                tick={{ fill: "#E5E7EB", fontSize: 12 }}
                                domain={collectionDomain}
                                ticks={collectionTicks}
                                tickFormatter={(value) =>
                                    `${(value as number) / 1_000_000}M`
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
                </ChartCard>
            </div>

            {/* Row 3: Revenue Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Sales Growth" subtitle="Daily revenue trend">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis dataKey="date" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <YAxis
                                stroke="#E5E7EB"
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Line type="monotone" dataKey="totalRevenue" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} name="Revenue" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue Breakdown" subtitle="Total vs Converted">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis dataKey="date" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <YAxis
                                stroke="#E5E7EB"
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                            <Bar dataKey="totalRevenue" fill="#8B5CF6" name="Total Revenue" />
                            <Bar dataKey="convertedRevenue" fill="#10B981" name="Converted Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};

interface YearlyRevenueSummary {
    thisYear: number;
    lastYear: number | null;
    thisYearByMonth: number[]; // 0-11
    thisYearByQuarter: number[]; // 0-3
}

function buildYearlyRevenueSummary(
    revenuePoints: { date: string; totalRevenue: number }[]
): YearlyRevenueSummary {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const thisYearByMonth = new Array(12).fill(0);
    const lastYearByMonth = new Array(12).fill(0);
    let hasLastYearData = false;

    for (const point of revenuePoints) {
        const d = new Date(point.date);
        const y = d.getFullYear();
        const m = d.getMonth(); // 0-11

        if (y === currentYear) {
            thisYearByMonth[m] += point.totalRevenue;
        } else if (y === lastYear) {
            lastYearByMonth[m] += point.totalRevenue;
            hasLastYearData = true;
        }
    }

    const thisYear = thisYearByMonth.reduce((a, b) => a + b, 0);
    const lastYearTotal = hasLastYearData ? lastYearByMonth.reduce((a, b) => a + b, 0) : null;

    const thisYearByQuarter = [0, 0, 0, 0];
    for (let i = 0; i < 12; i++) {
        const q = Math.floor(i / 3);
        thisYearByQuarter[q] += thisYearByMonth[i];
    }

    return {
        thisYear,
        lastYear: lastYearTotal,
        thisYearByMonth,
        thisYearByQuarter,
    };
}
