import React, { useMemo } from "react";
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
} from "recharts";
import { CheckCircle, XCircle, Clock, Timer, Activity } from "lucide-react";

import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import {
    useDashboardStats,
    type DashboardDateRange,
    type FunnelStagePoint,
} from "../../dashboard/useDashboardStats";

interface FunnelTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

const formatPercent = (v: number) => `${v.toFixed(1)}%`;

export const FunnelTab: React.FC<FunnelTabProps> = ({
    dateRange,
    customFrom,
    customTo,
}) => {
    const {
        loading,
        error,
        funnelSummary,
        funnelStageSeries,
        cancelReasonBreakdown,
        rejectReasonBreakdown,
        timeToConfirmSeries,
        verificationOutcomes,
    } = useDashboardStats(dateRange, customFrom, customTo);

    const {
        totalCodOrders,
        approvedCodOrders,
        paidCodOrders,
        completedCodOrders,
        customerCancelledCodOrders,
        rejectedCodOrders,
        approvalRate,
        paymentConversionRate,
        deliverySuccessRate,
        failedRate,
    } = funnelSummary;

    // Health series – tính local từ stage data
    const codHealthSeries = useMemo(
        () =>
            funnelStageSeries.map((p: FunnelStagePoint) => {
                const { codOrders, approved, paid, completed, failed } = p;

                const safePct = (num: number, denom: number) =>
                    denom > 0
                        ? Math.round((num / denom) * 1000) / 10
                        : 0;

                return {
                    date: p.date,
                    approvalRate: safePct(approved, codOrders),
                    paymentRate: safePct(paid, approved),
                    deliveryRate: safePct(completed, approved),
                    failedRate: safePct(failed, codOrders),
                };
            }),
        [funnelStageSeries]
    );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-white/60">Loading funnel analytics...</p>
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

    return (
        <AnalyticsLayout
            summaryCards={[
                // 1) Approval Rate
                <StatCard
                    key="approval-rate"
                    className="px-4 py-2 h-[88px]"
                    title="APPROVAL RATE"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(approvalRate)}
                    subtitle={`${approvedCodOrders} approved / ${totalCodOrders} COD`}
                    icon={<CheckCircle className="h-4 w-4 text-[#22c55e]" />}
                    valueColor="#22c55e"
                />,

                // 2) Payment Conversion Rate
                <StatCard
                    key="payment-conversion"
                    className="px-4 py-2 h-[88px]"
                    title="PAYMENT CONVERSION"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(paymentConversionRate)}
                    subtitle={`${paidCodOrders} paid / ${approvedCodOrders} approved`}
                    icon={<Activity className="h-4 w-4 text-[#60a5fa]" />}
                    valueColor="#60a5fa"
                />,

                // 3) Delivery Success Rate
                <StatCard
                    key="delivery-success"
                    className="px-4 py-2 h-[88px]"
                    title="DELIVERY SUCCESS"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(deliverySuccessRate)}
                    subtitle={`${completedCodOrders} completed / ${approvedCodOrders} approved`}
                    icon={<Clock className="h-4 w-4 text-[#a855f7]" />}
                    valueColor="#a855f7"
                />,

                // 4) Failed Rate (Customer Cancel + Rejected)
                <StatCard
                    key="failed-rate"
                    className="px-4 py-2 h-[88px]"
                    title="FAILED RATE"
                    titleClass="text-[11px]"
                    valueClass="text-xl"
                    value={formatPercent(failedRate)}
                    subtitle={`${customerCancelledCodOrders} cancelled + ${rejectedCodOrders} rejected / ${totalCodOrders} COD`}
                    icon={<XCircle className="h-4 w-4 text-[#f97373]" />}
                    valueColor="#f97373"
                />,
            ]}
            charts={[
                // 1) COD Funnel over time
                <ChartCard
                    key="funnel-over-time"
                    title="COD Verification Funnel"
                    subtitle="COD → Approved → Completed → Paid"
                    compact
                    className="h-full"
                >
                    {funnelStageSeries.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No COD funnel data in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={funnelStageSeries}
                                margin={{ top: 0, right: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    height={20}
                                    wrapperStyle={{
                                        paddingTop: 0,
                                        color: "#E5E7EB",
                                        fontSize: 11,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="codOrders"
                                    name="COD Orders"
                                    stroke="#64748b"
                                    strokeWidth={1.5}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="approved"
                                    name="Approved"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ r: 2, fill: "#22c55e" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="completed"
                                    name="Completed"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    dot={{ r: 2, fill: "#a855f7" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="paid"
                                    name="Paid"
                                    stroke="#60a5fa"
                                    strokeWidth={2}
                                    dot={{ r: 2, fill: "#60a5fa" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 2) Customer Cancel Reasons
                <ChartCard
                    key="customer-cancel-reasons"
                    title="Customer Cancel Reasons"
                    subtitle="Only Customer Cancelled COD orders"
                    compact
                    className="h-full"
                >
                    {cancelReasonBreakdown.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No customer cancel reasons in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={cancelReasonBreakdown}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="reason"
                                    width={180}
                                    interval={0}
                                    tick={(props: any) => {
                                        const { y, payload } = props;
                                        return (
                                            <text
                                                x={12}
                                                y={y + 4}
                                                textAnchor="start"
                                                fill="#E5E7EB"
                                                fontSize={11}
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
                                    formatter={(v: any) => `${v} orders`}
                                />
                                <Bar
                                    dataKey="count"
                                    name="Cancelled orders"
                                    radius={[4, 4, 4, 4]}
                                    fill="#facc15"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 3) Shop Reject Reasons
                <ChartCard
                    key="reject-reasons"
                    title="Shop Reject Reasons"
                    subtitle="Risk / fraud rejections from merchant"
                    compact
                    className="h-full"
                >
                    {rejectReasonBreakdown.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No reject reasons in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rejectReasonBreakdown}
                                layout="vertical"
                                margin={{ top: 10, right: 10, left: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="reason"
                                    width={180}
                                    interval={0}
                                    tick={(props: any) => {
                                        const { y, payload } = props;
                                        return (
                                            <text
                                                x={12}
                                                y={y + 4}
                                                textAnchor="start"
                                                fill="#E5E7EB"
                                                fontSize={11}
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
                                    formatter={(v: any) => `${v} orders`}
                                />
                                <Bar
                                    dataKey="count"
                                    name="Rejected orders"
                                    radius={[4, 4, 4, 4]}
                                    fill="#f97373"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 4) Time to Customer Confirmation
                <ChartCard
                    key="time-to-confirm"
                    title="Time to Customer Confirmation"
                    subtitle="Average hours from order to customer confirm"
                    compact
                    className="h-full"
                >
                    {timeToConfirmSeries.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No confirmation data in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={timeToConfirmSeries}
                                margin={{ top: 0, right: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v: any, _name: any, entry: any) => {
                                        const hours = Number(v) || 0;
                                        const c = entry.payload?.confirmations ?? 0;
                                        return [
                                            `${hours} hours (n=${c})`,
                                            "Avg time to confirm",
                                        ];
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avgHours"
                                    name="Avg hours"
                                    stroke="#60a5fa"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: "#60a5fa" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 5) COD Health Index
                <ChartCard
                    key="cod-health"
                    title="COD Health Over Time"
                    subtitle="Approval, Payment, Failed rates"
                    compact
                    className="h-full"
                >
                    {codHealthSeries.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No COD health data in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={codHealthSeries}
                                margin={{ top: 0, right: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                    }}
                                    formatter={(v: any, name: any) => [
                                        `${v}%`,
                                        name,
                                    ]}
                                />
                                <Legend
                                    verticalAlign="top"
                                    height={20}
                                    wrapperStyle={{
                                        paddingTop: 0,
                                        color: "#E5E7EB",
                                        fontSize: 11,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="approvalRate"
                                    name="Approval %"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={true}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="paymentRate"
                                    name="Payment %"
                                    stroke="#60a5fa"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="failedRate"
                                    name="Failed %"
                                    stroke="#f97373"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>,

                // 6) Verification Required Breakdown
                <ChartCard
                    title="Verification Required Breakdown"
                    subtitle="Medium/High risk COD – Approved vs Cancel vs Reject"
                    compact
                    className="h-full"
                >
                    {verificationOutcomes.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                            No verification outcomes in this date range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={verificationOutcomes}
                                margin={{ top: 6, right: 10, left: 0, bottom: 0 }}
                                barCategoryGap="22%"
                                barGap={2}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" vertical={false} />

                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />

                                <YAxis
                                    tick={{ fontSize: 10, fill: "#E5E7EB" }}
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#020617",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                    formatter={(value: any, name: any) => {
                                        const label =
                                            name === "approved"
                                                ? "Approved"
                                                : name === "customerCancelled"
                                                    ? "Customer cancelled"
                                                    : "Rejected";
                                        return [`${value} orders`, label];
                                    }}
                                />

                                <Legend
                                    verticalAlign="bottom"
                                    align="left"
                                    iconType="circle"
                                    wrapperStyle={{
                                        paddingTop: 6,
                                        color: "#E5E7EB",
                                        fontSize: 12,
                                        lineHeight: "14px",
                                    }}
                                />

                                <Bar dataKey="approved" name="Approved" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="customerCancelled" name="Customer cancelled" stackId="a" fill="#facc15" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#f97373" radius={[0, 0, 4, 4]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            ]}
            chartHeight={200}
        />
    );
};
