import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Radio, TrendingUp, AlertTriangle, Percent } from "lucide-react";

import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    useDashboardStats,
    type DashboardDateRange,
} from "../../dashboard/useDashboardStats";

interface ChannelsTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const ChannelsTab: React.FC<ChannelsTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    // ✅ 1 hook duy nhất
    const { loading, error, channelStats, sourceStats } = useDashboardStats(
        dateRange,
        customFrom,
        customTo
    );

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(value);

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

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

    // ================== CHANNEL DATA ==================
    const channels = channelStats?.channels ?? [];
    const sortedChannels = [...channels].sort(
        (a, b) => b.totalRevenue - a.totalRevenue
    );
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
    const sortedSources = [...sources].sort(
        (a, b) => b.totalRevenue - a.totalRevenue
    );
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

    return (
        <AnalyticsLayout
            summaryCards={[
                // 1) Số lượng channel
                <StatCard
                    key="total-channels"
                    className="h-[88px] px-4 py-2"
                    title="ACTIVE CHANNELS"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={channelStats.totalChannels}
                    subtitle="Channels with orders in this period"
                    icon={<Radio className="h-4 w-4 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />,

                // 2) Top channel theo revenue
                <StatCard
                    key="top-channel"
                    className="h-[88px] px-4 py-2"
                    title="TOP REVENUE CHANNEL"
                    titleClass="text-[11px]"
                    valueClass="text-sm truncate"
                    value={
                        channelStats.topChannelByRevenue?.channel ?? "No data"
                    }
                    subtitle={
                        channelStats.topChannelByRevenue
                            ? `Revenue: ${formatCurrency(
                                channelStats.topChannelByRevenue.totalRevenue
                            )}`
                            : "Need at least 1 paid order"
                    }
                    icon={<TrendingUp className="h-4 w-4 text-green-400" />}
                    valueColor="#4ade80"
                />,

                // 3) Channel boom cao nhất
                <StatCard
                    key="highest-boom-channel"
                    className="h-[88px] px-4 py-2"
                    title="HIGHEST BOOM CHANNEL"
                    titleClass="text-[11px]"
                    valueClass="text-sm truncate"
                    value={
                        channelStats.highestBoomChannel?.channel ?? "No data"
                    }
                    subtitle={
                        channelStats.highestBoomChannel
                            ? `Boom rate: ${formatPercent(
                                channelStats.highestBoomChannel.cancelRate
                            )}`
                            : "Min 10 COD orders per channel"
                    }
                    icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                    valueColor="#f87171"
                />,

                // 4) Overall COD conversion toàn bộ channel
                <StatCard
                    key="overall-conversion"
                    className="h-[88px] px-4 py-2"
                    title="OVERALL COD CONVERSION"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(channelStats.overallConversionRate)}
                    subtitle="Paid COD / all COD orders"
                    icon={<Percent className="h-4 w-4 text-blue-400" />}
                    valueColor="#60a5fa"
                />,
            ]}
            charts={[
                // ========= CHANNEL CHARTS =========

                // 1) Revenue by Channel
                <ChartCard
                    key="revenue-by-channel"
                    title="Revenue by Channel"
                    subtitle="Top channels by total revenue"
                    compact
                    className="h-full"
                >
                    {!hasChannelData ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No channel data in this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={revenueByChannelData}
                                layout="vertical"
                                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={formatYAxisMillions}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="channel"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    cursor={{ fill: "rgba(148,163,184,0.12)" }}
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border:
                                            "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(value: any) => [
                                        formatCurrency(value as number),
                                        "Total revenue",
                                    ]}
                                />
                                <Bar
                                    dataKey="totalRevenue"
                                    name="Total revenue"
                                    fill="#A855F7"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 2) Boom Rate by Channel
                <ChartCard
                    key="boom-rate-by-channel"
                    title="Boom Rate by Channel"
                    subtitle="Cancellation rate on COD orders"
                    compact
                    className="h-full"
                >
                    {!hasChannelData ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No COD orders in this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={boomRateByChannelData}
                                layout="vertical"
                                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v: number) =>
                                        `${v.toFixed(0)}%`
                                    }
                                />
                                <YAxis
                                    type="category"
                                    dataKey="channel"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    cursor={{ fill: "rgba(248,113,113,0.08)" }}
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border:
                                            "1px solid rgba(248,113,113,0.4)",
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(value: any) => [
                                        `${(value as number).toFixed(1)}%`,
                                        "Boom rate",
                                    ]}
                                />
                                <Bar
                                    dataKey="cancelRate"
                                    name="Boom rate"
                                    fill="#F97373"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 3) COD Conversion by Channel
                <ChartCard
                    key="conversion-by-channel"
                    title="COD Conversion by Channel"
                    subtitle="Paid COD / COD orders per channel"
                    compact
                    className="h-full"
                >
                    {!hasChannelData ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No COD orders in this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={conversionByChannelData}
                                layout="vertical"
                                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v: number) =>
                                        `${v.toFixed(0)}%`
                                    }
                                />
                                <YAxis
                                    type="category"
                                    dataKey="channel"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    cursor={{ fill: "rgba(56,189,248,0.08)" }}
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border:
                                            "1px solid rgba(56,189,248,0.4)",
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(value: any) => [
                                        `${(value as number).toFixed(1)}%`,
                                        "COD conversion",
                                    ]}
                                />
                                <Bar
                                    dataKey="conversionRate"
                                    name="COD conversion"
                                    fill="#38BDF8"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // ========= SOURCE CHARTS =========

                // 4) Revenue by Source
                <ChartCard
                    key="revenue-by-source"
                    title="Revenue by Source"
                    subtitle="Top sources by total revenue"
                    compact
                    className="h-full"
                >
                    {!hasSourceData ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No source data in this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={revenueBySourceData}
                                layout="vertical"
                                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={formatYAxisMillions}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="source"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    cursor={{ fill: "rgba(148,163,184,0.12)" }}
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border:
                                            "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(value: any) => [
                                        formatCurrency(value as number),
                                        "Total revenue",
                                    ]}
                                />
                                <Bar
                                    dataKey="totalRevenue"
                                    name="Total revenue"
                                    fill="#EC4899"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 5) Boom Rate by Source
                <ChartCard
                    key="boom-rate-by-source"
                    title="Boom Rate by Source"
                    subtitle="Cancellation rate on COD orders by source"
                    compact
                    className="h-full"
                >
                    {!hasSourceData ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No COD orders by source in this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={boomRateBySourceData}
                                layout="vertical"
                                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v: number) =>
                                        `${v.toFixed(0)}%`
                                    }
                                />
                                <YAxis
                                    type="category"
                                    dataKey="source"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    cursor={{ fill: "rgba(248,113,113,0.08)" }}
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border:
                                            "1px solid rgba(248,113,113,0.4)",
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(value: any) => [
                                        `${(value as number).toFixed(1)}%`,
                                        "Boom rate",
                                    ]}
                                />
                                <Bar
                                    dataKey="cancelRate"
                                    name="Boom rate"
                                    fill="#FB7185"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 6) COD Conversion by Source
                <ChartCard
                    key="conversion-by-source"
                    title="COD Conversion by Source"
                    subtitle="Paid COD / COD orders per source"
                    compact
                    className="h-full"
                >
                    {!hasSourceData ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No COD orders by source in this period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={conversionBySourceData}
                                layout="vertical"
                                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E223D"
                                />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v: number) =>
                                        `${v.toFixed(0)}%`
                                    }
                                />
                                <YAxis
                                    type="category"
                                    dataKey="source"
                                    width={120}
                                    interval={0}
                                    tick={(props: any) => {
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
                                    cursor={{ fill: "rgba(56,189,248,0.08)" }}
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border:
                                            "1px solid rgba(56,189,248,0.4)",
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(value: any) => [
                                        `${(value as number).toFixed(1)}%`,
                                        "COD conversion",
                                    ]}
                                />
                                <Bar
                                    dataKey="conversionRate"
                                    name="COD conversion"
                                    fill="#22D3EE"
                                    radius={[4, 4, 4, 4]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,
            ]}
            chartHeight={200}
        />
    );
};
