import React, { useState, useMemo } from "react";
import { VietnamMap } from "../../../components/maps/VietnamMap";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

import {
    Shield,
    DollarSign,
    TrendingDown,
    AlertTriangle,
} from "lucide-react";

import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { AnalyticsLayout } from "./AnalyticsLayout";

import {
    useDashboardStats,
    type DashboardDateRange,
} from "../../dashboard/useDashboardStats";

// --------------------------------------------------------

interface GeoTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const GeoTab: React.FC<GeoTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    const { loading, error, geoRiskStats } = useDashboardStats(
        dateRange,
        customFrom,
        customTo
    );

    const [selectedProvince, setSelectedProvince] = useState<string>("all");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("all");

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(value);

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

    // ------------------ PREPARE DATA ------------------

    const provinces = geoRiskStats?.provinces ?? [];

    // Cast for TS to avoid {} type warning
    const districtsByProvince = (geoRiskStats?.districtsByProvince ??
        {}) as Record<string, string[]>;

    const hasAnyProvince = provinces.length > 0;

    const sortedProvinceNames = [...provinces]
        .map((p) => p.province)
        .sort((a, b) => a.localeCompare(b, "vi"));

    const selectedProvinceStat =
        selectedProvince === "all"
            ? undefined
            : provinces.find((p) => p.province === selectedProvince);

    const districtOptions: string[] =
        selectedProvince === "all"
            ? []
            : districtsByProvince[selectedProvince] ?? [];

    // ------------------ MAP DATA ------------------

    const mapData = useMemo(() => {
        const result: Record<string, number> = {};
        for (const p of provinces) {
            result[p.province] = p.avgRiskScore ?? 0;
        }
        return result;
    }, [provinces]);

    // ------------------ LOADING + ERROR ------------------

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

    // ------------------ DATASETS FOR CHARTS ------------------

    const topRevenueProvinces = [...provinces]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

    const salesByProvinceData = topRevenueProvinces.map((p) => ({
        province: p.province,
        totalRevenue: p.totalRevenue,
    }));

    const provincesWithVolume = provinces.filter(
        (p) => p.codOrdersCount >= 50
    );

    const topBoomProvinces = [...provincesWithVolume]
        .sort((a, b) => b.boomRate - a.boomRate)
        .slice(0, 5);

    const boomRateByProvinceData = topBoomProvinces.map((p) => ({
        province: p.province,
        boomRate: p.boomRate,
    }));

    const provincesWithRisk = provinces.filter(
        (p) => p.avgRiskScore !== null
    );

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

    return (
        <AnalyticsLayout
            summaryCards={[
                <StatCard
                    key="highest-risk-province"
                    title="HIGHEST-RISK PROVINCE"
                    value={geoRiskStats.highestRiskProvince?.province ?? "No data"}
                    subtitle={
                        geoRiskStats.highestRiskProvince
                            ? `Avg risk: ${geoRiskStats.highestRiskProvince.avgRiskScore ??
                            "N/A"
                            } (${geoRiskStats.highestRiskProvince.orderCount} orders)`
                            : "Need more COD orders with risk score"
                    }
                    icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                    valueColor="#f87171"
                    className="h-[88px] px-4 py-2"
                    titleClass="text-[11px]"
                    valueClass="text-lg"
                />,
                <StatCard
                    key="safest-province"
                    title="SAFEST PROVINCE"
                    value={geoRiskStats.safestProvince?.province ?? "No data"}
                    subtitle={
                        geoRiskStats.safestProvince
                            ? `Avg risk: ${geoRiskStats.safestProvince.avgRiskScore ??
                            "N/A"
                            } (${geoRiskStats.safestProvince.orderCount} orders)`
                            : "Need more COD orders with risk score"
                    }
                    icon={<Shield className="h-4 w-4 text-green-400" />}
                    valueColor="#4ade80"
                    className="h-[88px] px-4 py-2"
                    titleClass="text-[11px]"
                    valueClass="text-lg"
                />,
                <StatCard
                    key="top-revenue-province"
                    title="TOP REVENUE PROVINCE"
                    value={
                        geoRiskStats.topRevenueProvince
                            ? formatCurrency(geoRiskStats.topRevenueProvince.totalRevenue)
                            : "No data"
                    }
                    subtitle={
                        geoRiskStats.topRevenueProvince?.province ??
                        "Need at least 1 paid order"
                    }
                    icon={<DollarSign className="h-4 w-4 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                    className="h-[88px] px-4 py-2"
                    titleClass="text-[11px]"
                    valueClass="text-lg"
                />,
                <StatCard
                    key="worst-boom-province"
                    title="WORST BOOM PROVINCE"
                    value={
                        provincesWithVolume.length
                            ? topBoomProvinces[0]?.province ?? "No data"
                            : "No data"
                    }
                    subtitle={
                        provincesWithVolume.length && topBoomProvinces[0]
                            ? `Boom rate: ${formatPercent(
                                topBoomProvinces[0].boomRate
                            )} (min 50 COD orders)`
                            : "Min 50 COD orders per province"
                    }
                    icon={<TrendingDown className="h-4 w-4 text-blue-400" />}
                    valueColor="#60a5fa"
                    className="h-[88px] px-4 py-2"
                    titleClass="text-[11px]"
                    valueClass="text-lg"
                />,
            ]}
        >
            {/* ROW 2: charts + map (custom layout as children) */}
            <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 xl:grid-cols-3">
                {/* LEFT 2/3: CHARTS */}
                <div className="flex flex-col gap-3 xl:col-span-2">
                    {/* Row 1 Chart */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ChartCard
                            title="Sales by Province"
                            subtitle="Top 5 provinces by revenue"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince || salesByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No geo revenue data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salesByProvinceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
                                            width={120}
                                            interval={0}
                                            tick={({ y, payload }) => (
                                                <text
                                                    x={12}
                                                    y={y + 4}
                                                    fill="#E5E7EB"
                                                    fontSize={12}
                                                >
                                                    {payload.value}
                                                </text>
                                            )}
                                        />
                                        <Tooltip
                                            formatter={(v) => [
                                                formatCurrency(v as number),
                                                "Revenue",
                                            ]}
                                        />
                                        <Bar dataKey="totalRevenue" fill="#8B5CF6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        <ChartCard
                            title="Boom Rate by Province"
                            subtitle="Top 5 boom provinces"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince || boomRateByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No boom data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={boomRateByProvinceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
                                            width={120}
                                            interval={0}
                                            tick={({ y, payload }) => (
                                                <text
                                                    x={12}
                                                    y={y + 4}
                                                    fill="#E5E7EB"
                                                    fontSize={12}
                                                >
                                                    {payload.value}
                                                </text>
                                            )}
                                        />
                                        <Tooltip
                                            formatter={(v) => [`${v}%`, "Boom rate"]}
                                        />
                                        <Bar dataKey="boomRate" fill="#F97373" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    {/* Row 2 Chart */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ChartCard
                            title="Risk Score by Province"
                            subtitle="Top 5 provinces by risk"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince || riskByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No risk data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={riskByProvinceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
                                            width={120}
                                            interval={0}
                                            tick={({ y, payload }) => (
                                                <text
                                                    x={12}
                                                    y={y + 4}
                                                    fill="#E5E7EB"
                                                    fontSize={12}
                                                >
                                                    {payload.value}
                                                </text>
                                            )}
                                        />
                                        <Tooltip
                                            formatter={(v) => [
                                                (v as number).toFixed(1),
                                                "Risk score",
                                            ]}
                                        />
                                        <Bar dataKey="avgRiskScore" fill="#6366F1" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        <ChartCard
                            title="COD vs Prepaid"
                            subtitle="Order mix by province"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince || codMixByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No mix data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={codMixByProvinceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                        <XAxis type="number" />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
                                            width={120}
                                            interval={0}
                                            tick={({ y, payload }) => (
                                                <text
                                                    x={12}
                                                    y={y + 4}
                                                    fill="#E5E7EB"
                                                    fontSize={12}
                                                >
                                                    {payload.value}
                                                </text>
                                            )}
                                        />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                            dataKey="codOrders"
                                            name="COD"
                                            stackId="a"
                                            fill="#38BDF8"
                                        />
                                        <Bar
                                            dataKey="prepaidOrders"
                                            name="Prepaid"
                                            stackId="a"
                                            fill="#22D3EE"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>
                </div>

                {/* RIGHT 1/3: MAP */}
                <ChartCard
                    title=""
                    subtitle=""
                    compact={false}
                    className="h-[412px]"
                >
                    {/* This flex container uses the full inner height of the card */}
                    <div className="flex h-full min-h-0 items-stretch gap-6">
                        {/* LEFT COLUMN: title + filters + summary (fixed width controls map width) */}
                        <div className="flex h-full w-[190px] flex-col justify-start">
                            <h3 className="text-lg font-semibold text-white">
                                Vietnam Map
                            </h3>
                            <p className="mt-1 text-xs text-white/60">
                                Select a province and district
                            </p>

                            {/* Filters */}
                            <div className="mt-4 flex gap-2">
                                <select
                                    value={selectedProvince}
                                    onChange={(e) => {
                                        setSelectedProvince(e.target.value);
                                        setSelectedDistrict("all");
                                    }}
                                    className="w-full rounded-lg border border-white/10 bg-[#12163A] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                                >
                                    <option value="all">All Provinces</option>
                                    {sortedProvinceNames.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    disabled={
                                        selectedProvince === "all" ||
                                        districtOptions.length === 0
                                    }
                                    className="w-full rounded-lg border border-white/10 bg-[#12163A] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="all">All Districts</option>
                                    {districtOptions.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Summary text */}
                            <div className="mt-4 text-xs text-white/70">
                                {selectedProvinceStat ? (
                                    <>
                                        <div className="mb-1 text-sm font-medium text-white">
                                            {selectedProvinceStat.province}
                                        </div>
                                        <div>Orders: {selectedProvinceStat.orderCount}</div>
                                        <div>
                                            Boom: {formatPercent(selectedProvinceStat.boomRate)}
                                        </div>
                                        <div>
                                            Avg risk:{" "}
                                            {selectedProvinceStat.avgRiskScore ?? "N/A"}
                                        </div>
                                        <div>
                                            Revenue:{" "}
                                            {formatCurrency(
                                                selectedProvinceStat.totalRevenue
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-white/60">
                                        Click a province to view details.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: map fills remaining width and full height */}
                        <div className="flex h-full min-h-0 flex-1">
                            <div className="h-[370px] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#020617]">
                                <VietnamMap
                                    data={mapData}
                                    onProvinceClick={(name) => {
                                        setSelectedProvince(name);
                                        setSelectedDistrict("all");
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </ChartCard>
            </div>
        </AnalyticsLayout>
    );
};
