import React, { useState } from "react";
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
    MapPin,
    Shield,
    DollarSign,
    TrendingDown,
    AlertTriangle,
} from "lucide-react";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    useDashboardStats,
    type DashboardDateRange,
} from "../../dashboard/useDashboardStats";

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

    const provinces = geoRiskStats?.provinces ?? [];

    // ======== DATASETS CHO 4 CHART ========

    // 1) Top 5 tỉnh theo doanh thu
    const topRevenueProvinces = [...provinces]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

    const salesByProvinceData = topRevenueProvinces.map((p) => ({
        province: p.province,
        totalRevenue: p.totalRevenue,
    }));

    // 2) Top 5 boom rate (chỉ lấy tỉnh có >= 50 đơn COD)
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

    // 3) Top 5 risk score trung bình
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

    // 4) COD vs Prepaid mix – top 5 tỉnh theo số đơn
    const topOrderProvinces = [...provinces]
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

    const codMixByProvinceData = topOrderProvinces.map((p) => ({
        province: p.province,
        codOrders: p.codOrdersCount,
        prepaidOrders: p.prepaidOrdersCount,
    }));

    const hasAnyProvince = provinces.length > 0;

    // ======== MAP – TÓM TẮT TỈNH ĐANG CHỌN ========

    const sortedProvinceNames = [...provinces]
        .map((p) => p.province)
        .sort((a, b) => a.localeCompare(b, "vi"));

    const selectedProvinceStat =
        selectedProvince === "all"
            ? undefined
            : provinces.find((p) => p.province === selectedProvince);

    return (
        <div className="flex h-full min-h-0 flex-col gap-3">
            {/* ===== ROW 1: 4 KPI CARDS ===== */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="HIGHEST-RISK PROVINCE"
                    value={
                        geoRiskStats.highestRiskProvince?.province ?? "No data"
                    }
                    subtitle={
                        geoRiskStats.highestRiskProvince
                            ? `Avg risk: ${geoRiskStats.highestRiskProvince
                                .avgRiskScore ?? "N/A"
                            } (${geoRiskStats.highestRiskProvince.orderCount} orders)`
                            : "Need more COD orders with risk score"
                    }
                    icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                    valueColor="#f87171"
                    className="h-[88px] px-4 py-2"
                    titleClass="text-[11px]"
                    valueClass="text-lg"
                />

                <StatCard
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
                />

                <StatCard
                    title="TOP REVENUE PROVINCE"
                    value={
                        geoRiskStats.topRevenueProvince
                            ? formatCurrency(
                                geoRiskStats.topRevenueProvince.totalRevenue
                            )
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
                />

                <StatCard
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
                />
            </div>

            {/* ===== ROW 2: 4 CHARTS (2/3 TRÁI) + MAP (1/3 PHẢI) ===== */}
            <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 xl:grid-cols-3">
                {/* LEFT: 4 charts trong 2 cột = 2/3 width */}
                <div className="flex flex-col gap-3 xl:col-span-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {/* Chart 1 – Sales by Province */}
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
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={salesByProvinceData}
                                        layout="vertical"
                                        margin={{
                                            top: 0,
                                            right: 10,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#1E223D"
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fontSize: 10,
                                                fill: "#E5E7EB",
                                            }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
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
                                            cursor={{
                                                fill: "rgba(148,163,184,0.12)",
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#020617",
                                                border:
                                                    "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 8,
                                                fontSize: 11,
                                            }}
                                            formatter={(value: any) => [
                                                formatCurrency(
                                                    value as number
                                                ),
                                                "Total revenue",
                                            ]}
                                        />
                                        <Bar
                                            dataKey="totalRevenue"
                                            name="Total revenue"
                                            fill="#8B5CF6"
                                            radius={[4, 4, 4, 4]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* Chart 2 – Boom Rate by Province */}
                        <ChartCard
                            title="Boom Rate by Province"
                            subtitle="Top 5 provinces by boom rate"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince ||
                                boomRateByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No COD boom data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={boomRateByProvinceData}
                                        layout="vertical"
                                        margin={{
                                            top: 0,
                                            right: 10,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#1E223D"
                                        />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{
                                                fontSize: 10,
                                                fill: "#E5E7EB",
                                            }}
                                            tickFormatter={(v: number) =>
                                                `${v.toFixed(0)}%`
                                            }
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
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
                                            cursor={{
                                                fill: "rgba(248,113,113,0.08)",
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#020617",
                                                border:
                                                    "1px solid rgba(248,113,113,0.4)",
                                                borderRadius: 8,
                                                fontSize: 11,
                                            }}
                                            formatter={(value: any) => [
                                                `${(value as number).toFixed(
                                                    1
                                                )}%`,
                                                "Boom rate",
                                            ]}
                                        />
                                        <Bar
                                            dataKey="boomRate"
                                            name="Boom rate"
                                            fill="#F97373"
                                            radius={[4, 4, 4, 4]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {/* Chart 3 – Avg Risk Score by Province */}
                        <ChartCard
                            title="Risk Score by Province"
                            subtitle="Top 5 provinces by avg risk score"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince ||
                                riskByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No geo risk score data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={riskByProvinceData}
                                        layout="vertical"
                                        margin={{
                                            top: 0,
                                            right: 10,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#1E223D"
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fontSize: 10,
                                                fill: "#E5E7EB",
                                            }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
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
                                            cursor={{
                                                fill: "rgba(129,140,248,0.08)",
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#020617",
                                                border:
                                                    "1px solid rgba(129,140,248,0.4)",
                                                borderRadius: 8,
                                                fontSize: 11,
                                            }}
                                            formatter={(value: any) => [
                                                (value as number).toFixed(1),
                                                "Avg risk score",
                                            ]}
                                        />
                                        <Bar
                                            dataKey="avgRiskScore"
                                            name="Avg risk score"
                                            fill="#6366F1"
                                            radius={[4, 4, 4, 4]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* Chart 4 – COD vs Prepaid mix */}
                        <ChartCard
                            title="COD vs Prepaid by Province"
                            subtitle="Order mix for top 5 provinces"
                            compact
                            className="h-[200px]"
                        >
                            {!hasAnyProvince ||
                                codMixByProvinceData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-white/40">
                                    No payment mix data in this period
                                </div>
                            ) : (
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={codMixByProvinceData}
                                        layout="vertical"
                                        margin={{
                                            top: 0,
                                            right: 10,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#1E223D"
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fontSize: 10,
                                                fill: "#E5E7EB",
                                            }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="province"
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
                                            cursor={{
                                                fill: "rgba(56,189,248,0.08)",
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#020617",
                                                border:
                                                    "1px solid rgba(56,189,248,0.4)",
                                                borderRadius: 8,
                                                fontSize: 11,
                                            }}
                                            formatter={(value: any, name) => [
                                                value,
                                                name === "codOrders"
                                                    ? "COD orders"
                                                    : "Prepaid orders",
                                            ]}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            height={20}
                                            iconSize={8}
                                            formatter={(value) =>
                                                value === "codOrders"
                                                    ? "COD"
                                                    : "Prepaid"
                                            }
                                        />
                                        <Bar
                                            dataKey="codOrders"
                                            stackId="a"
                                            name="COD"
                                            fill="#38BDF8"
                                            radius={[4, 0, 0, 4]}
                                        />
                                        <Bar
                                            dataKey="prepaidOrders"
                                            stackId="a"
                                            name="Prepaid"
                                            fill="#22D3EE"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>
                </div>

                {/* RIGHT: MAP CARD – 1/3 WIDTH */}
                <ChartCard
                    title="Vietnam Risk Map"
                    subtitle="Select province and district"
                    compact={false}
                    className="h-full min-h-[220px] xl:min-h-[420px]"
                >
                    <div className="flex h-full flex-col">
                        {/* Filters */}
                        <div className="mb-3 flex gap-2">
                            <select
                                value={selectedProvince}
                                onChange={(e) => {
                                    setSelectedProvince(e.target.value);
                                    setSelectedDistrict("all");
                                }}
                                className="rounded-lg border border-white/10 bg-[#12163A] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
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
                                onChange={(e) =>
                                    setSelectedDistrict(e.target.value)
                                }
                                className="rounded-lg border border-white/10 bg-[#12163A] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                            >
                                <option value="all">All Districts</option>
                                {/* TODO: hook real district data in future */}
                                <option value="placeholder" disabled>
                                    Coming soon
                                </option>
                            </select>
                        </div>

                        {/* Map placeholder + summary */}
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-white/5 bg-gradient-to-br from-[#12163A] to-[#1E223D]">
                            <div className="text-center">
                                <MapPin className="mx-auto mb-2 h-10 w-10 text-[#8B5CF6]" />
                                {selectedProvinceStat ? (
                                    <>
                                        <p className="text-sm font-medium text-white">
                                            {selectedProvinceStat.province}
                                        </p>
                                        <p className="mt-1 text-xs text-white/70">
                                            Orders:{" "}
                                            {selectedProvinceStat.orderCount} •
                                            Boom:{" "}
                                            {formatPercent(
                                                selectedProvinceStat.boomRate
                                            )}
                                        </p>
                                        <p className="text-xs text-white/70">
                                            Avg risk:{" "}
                                            {selectedProvinceStat
                                                .avgRiskScore ?? "N/A"}{" "}
                                            • Revenue:{" "}
                                            {formatCurrency(
                                                selectedProvinceStat.totalRevenue
                                            )}
                                        </p>
                                        <p className="mt-2 text-[11px] text-white/50">
                                            (Interactive Vietnam map coming
                                            soon)
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-white/80">
                                            Vietnam Risk Map
                                        </p>
                                        <p className="mt-1 text-xs text-white/60">
                                            Hover over provinces to see risk &
                                            boom (coming soon)
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
