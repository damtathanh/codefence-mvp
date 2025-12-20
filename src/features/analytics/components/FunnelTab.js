import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from "recharts";
import { CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { AnalyticsLayout } from "./AnalyticsLayout";
import { StatCard } from "../../../components/analytics/StatCard";
import { ChartCard } from "../../../components/analytics/ChartCard";
import { useDashboardStats, } from "../../dashboard/useDashboardStats";
const formatPercent = (v) => `${v.toFixed(1)}%`;
export const FunnelTab = ({ dateRange, customFrom, customTo, }) => {
    const { loading, error, funnelSummary, funnelStageSeries, cancelReasonBreakdown, rejectReasonBreakdown, timeToConfirmSeries, verificationOutcomes, } = useDashboardStats(dateRange, customFrom, customTo);
    const { totalCodOrders, approvedCodOrders, paidCodOrders, completedCodOrders, customerCancelledCodOrders, rejectedCodOrders, approvalRate, paymentConversionRate, deliverySuccessRate, failedRate, } = funnelSummary;
    // Health series – tính local từ stage data
    const codHealthSeries = useMemo(() => funnelStageSeries.map((p) => {
        const { codOrders, approved, paid, completed, failed } = p;
        const safePct = (num, denom) => denom > 0
            ? Math.round((num / denom) * 1000) / 10
            : 0;
        return {
            date: p.date,
            approvalRate: safePct(approved, codOrders),
            paymentRate: safePct(paid, approved),
            deliveryRate: safePct(completed, approved),
            failedRate: safePct(failed, codOrders),
        };
    }), [funnelStageSeries]);
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("p", { className: "text-white/60", children: "Loading funnel analytics..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("p", { className: "text-red-400", children: ["Error loading analytics: ", error] }) }));
    }
    return (_jsx(AnalyticsLayout, { summaryCards: [
            // 1) Approval Rate
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "APPROVAL RATE", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(approvalRate), subtitle: `${approvedCodOrders} approved / ${totalCodOrders} COD`, icon: _jsx(CheckCircle, { className: "h-4 w-4 text-[#22c55e]" }), valueColor: "#22c55e" }, "approval-rate"),
            // 2) Payment Conversion Rate
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "PAYMENT CONVERSION", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(paymentConversionRate), subtitle: `${paidCodOrders} paid / ${approvedCodOrders} approved`, icon: _jsx(Activity, { className: "h-4 w-4 text-[#60a5fa]" }), valueColor: "#60a5fa" }, "payment-conversion"),
            // 3) Delivery Success Rate
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "DELIVERY SUCCESS", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(deliverySuccessRate), subtitle: `${completedCodOrders} completed / ${approvedCodOrders} approved`, icon: _jsx(Clock, { className: "h-4 w-4 text-[#a855f7]" }), valueColor: "#a855f7" }, "delivery-success"),
            // 4) Failed Rate (Customer Cancel + Rejected)
            _jsx(StatCard, { className: "px-4 py-2 h-[88px]", title: "FAILED RATE", titleClass: "text-[11px]", valueClass: "text-xl", value: formatPercent(failedRate), subtitle: `${customerCancelledCodOrders} cancelled + ${rejectedCodOrders} rejected / ${totalCodOrders} COD`, icon: _jsx(XCircle, { className: "h-4 w-4 text-[#f97373]" }), valueColor: "#f97373" }, "failed-rate"),
        ], charts: [
            // 1) COD Funnel over time
            _jsx(ChartCard, { title: "COD Verification Funnel", subtitle: "COD \u2192 Approved \u2192 Completed \u2192 Paid", compact: true, className: "h-full", children: funnelStageSeries.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No COD funnel data in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: funnelStageSeries, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                } }), _jsx(Legend, { verticalAlign: "top", height: 20, wrapperStyle: {
                                    paddingTop: 0,
                                    color: "#E5E7EB",
                                    fontSize: 11,
                                } }), _jsx(Line, { type: "monotone", dataKey: "codOrders", name: "COD Orders", stroke: "#64748b", strokeWidth: 1.5, dot: false }), _jsx(Line, { type: "monotone", dataKey: "approved", name: "Approved", stroke: "#22c55e", strokeWidth: 2, dot: { r: 2, fill: "#22c55e" } }), _jsx(Line, { type: "monotone", dataKey: "completed", name: "Completed", stroke: "#a855f7", strokeWidth: 2, dot: { r: 2, fill: "#a855f7" } }), _jsx(Line, { type: "monotone", dataKey: "paid", name: "Paid", stroke: "#60a5fa", strokeWidth: 2, dot: { r: 2, fill: "#60a5fa" } })] }) })) }, "funnel-over-time"),
            // 2) Customer Cancel Reasons
            _jsx(ChartCard, { title: "Customer Cancel Reasons", subtitle: "Only Customer Cancelled COD orders", compact: true, className: "h-full", children: cancelReasonBreakdown.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No customer cancel reasons in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: cancelReasonBreakdown, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(YAxis, { type: "category", dataKey: "reason", width: 180, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 11, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} orders` }), _jsx(Bar, { dataKey: "count", name: "Cancelled orders", radius: [4, 4, 4, 4], fill: "#facc15" })] }) })) }, "customer-cancel-reasons"),
            // 3) Shop Reject Reasons
            _jsx(ChartCard, { title: "Shop Reject Reasons", subtitle: "Risk / fraud rejections from merchant", compact: true, className: "h-full", children: rejectReasonBreakdown.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No reject reasons in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: rejectReasonBreakdown, layout: "vertical", margin: { top: 10, right: 10, left: 10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(YAxis, { type: "category", dataKey: "reason", width: 180, interval: 0, tick: (props) => {
                                    const { y, payload } = props;
                                    return (_jsx("text", { x: 12, y: y + 4, textAnchor: "start", fill: "#E5E7EB", fontSize: 11, children: payload.value }));
                                } }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v) => `${v} orders` }), _jsx(Bar, { dataKey: "count", name: "Rejected orders", radius: [4, 4, 4, 4], fill: "#f97373" })] }) })) }, "reject-reasons"),
            // 4) Time to Customer Confirmation
            _jsx(ChartCard, { title: "Time to Customer Confirmation", subtitle: "Average hours from order to customer confirm", compact: true, className: "h-full", children: timeToConfirmSeries.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No confirmation data in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: timeToConfirmSeries, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v, _name, entry) => {
                                    const hours = Number(v) || 0;
                                    const c = entry.payload?.confirmations ?? 0;
                                    return [
                                        `${hours} hours (n=${c})`,
                                        "Avg time to confirm",
                                    ];
                                } }), _jsx(Line, { type: "monotone", dataKey: "avgHours", name: "Avg hours", stroke: "#60a5fa", strokeWidth: 2, dot: { r: 3, fill: "#60a5fa" } })] }) })) }, "time-to-confirm"),
            // 5) COD Health Index
            _jsx(ChartCard, { title: "COD Health Over Time", subtitle: "Approval, Payment, Failed rates", compact: true, className: "h-full", children: codHealthSeries.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No COD health data in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: codHealthSeries, margin: { top: 0, right: 10, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" } }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, tickFormatter: (v) => `${v}%` }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                }, formatter: (v, name) => [
                                    `${v}%`,
                                    name,
                                ] }), _jsx(Legend, { verticalAlign: "top", height: 20, wrapperStyle: {
                                    paddingTop: 0,
                                    color: "#E5E7EB",
                                    fontSize: 11,
                                } }), _jsx(Line, { type: "monotone", dataKey: "approvalRate", name: "Approval %", stroke: "#22c55e", strokeWidth: 2, dot: true }), _jsx(Line, { type: "monotone", dataKey: "paymentRate", name: "Payment %", stroke: "#60a5fa", strokeWidth: 2, dot: false }), _jsx(Line, { type: "monotone", dataKey: "failedRate", name: "Failed %", stroke: "#f97373", strokeWidth: 2, dot: false })] }) })) }, "cod-health"),
            // 6) Verification Required Breakdown
            _jsx(ChartCard, { title: "Verification Required Breakdown", subtitle: "Medium/High risk COD \u2013 Approved vs Cancel vs Reject", compact: true, className: "h-full", children: verificationOutcomes.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-white/40", children: "No verification outcomes in this date range" })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: verificationOutcomes, margin: { top: 6, right: 10, left: 0, bottom: 0 }, barCategoryGap: "22%", barGap: 2, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#E5E7EB" }, axisLine: false, tickLine: false, interval: "preserveStartEnd" }), _jsx(YAxis, { tick: { fontSize: 10, fill: "#E5E7EB" }, allowDecimals: false, axisLine: false, tickLine: false }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                }, formatter: (value, name) => {
                                    const label = name === "approved"
                                        ? "Approved"
                                        : name === "customerCancelled"
                                            ? "Customer cancelled"
                                            : "Rejected";
                                    return [`${value} orders`, label];
                                } }), _jsx(Legend, { verticalAlign: "bottom", align: "left", iconType: "circle", wrapperStyle: {
                                    paddingTop: 6,
                                    color: "#E5E7EB",
                                    fontSize: 12,
                                    lineHeight: "14px",
                                } }), _jsx(Bar, { dataKey: "approved", name: "Approved", stackId: "a", fill: "#22c55e", radius: [4, 4, 0, 0] }), _jsx(Bar, { dataKey: "customerCancelled", name: "Customer cancelled", stackId: "a", fill: "#facc15", radius: [0, 0, 0, 0] }), _jsx(Bar, { dataKey: "rejected", name: "Rejected", stackId: "a", fill: "#f97373", radius: [0, 0, 4, 4] })] }) })) })
        ], chartHeight: 200 }));
};
