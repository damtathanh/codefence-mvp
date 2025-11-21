import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  TooltipProps,
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  ShieldCheck,
  DollarSign,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import {
  DashboardDateRange,
  useDashboardStats,
} from "../../features/dashboard/useDashboardStats";

const COLORS = {
  // orders
  totalOrders: "#6366f1",     // indigo for total
  codPending: "#facc15",      // amber for pending
  codConfirmed: "#22c55e",    // green for confirmed
  codCancelled: "#f97373",    // soft red for cancelled
  // revenue
  converted: "#22c55e",       // same green for converted
  otherRevenue: "#8b5cf6",    // purple for other revenue
  // risk
  riskLow: "#22c55e",
  riskMedium: "#fbbf24",
  riskHigh: "#fb7185",
};

export const DashboardPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DashboardDateRange>("last_week");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();

  const {
    loading,
    error,
    stats,
    ordersChart,
    revenueChart,
    riskDistribution,
    highRiskOrders,
  } = useDashboardStats(dateRange, customFrom, customTo);

  const handleDateChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const value = e.target.value as DashboardDateRange;
    setDateRange(value);
  };

  const riskPieData = [
    { name: "Low", value: riskDistribution.low, key: "low" },
    { name: "Medium", value: riskDistribution.medium, key: "medium" },
    { name: "High", value: riskDistribution.high, key: "high" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Dashboard</h2>
          <p className="text-sm text-white/60">
            Overview of orders, verification, risk and revenue.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <label className="text-sm text-white/70">Date range</label>
            <select
              value={dateRange}
              onChange={handleDateChange}
              className="bg-slate-900/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Today</option>
              <option value="last_week">Last week</option>
              <option value="last_month">Last month</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {dateRange === "custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                className="bg-slate-900/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={customFrom ?? ""}
                onChange={(e) => setCustomFrom(e.target.value || undefined)}
              />
              <input
                type="date"
                className="bg-slate-900/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={customTo ?? ""}
                onChange={(e) => setCustomTo(e.target.value || undefined)}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* 1. Total Orders */}
        <SummaryCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.totalOrders.toLocaleString("vi-VN")}
          subtitle={`COD: ${stats.codOrders.toLocaleString(
            "vi-VN"
          )} | Prepaid: ${stats.prepaidOrders.toLocaleString("vi-VN")}`}
        />

        {/* 2. Total Revenue */}
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString("vi-VN")} VND`}
          subtitle={`Avg order value: ${stats.avgOrderValue.toLocaleString(
            "vi-VN"
          )} VND`}
        />

        {/* 3. Pending Verification */}
        <SummaryCard
          icon={Clock}
          label="Pending Verification"
          value={stats.pendingVerification.toLocaleString("vi-VN")}
          subtitle="Orders waiting for being processed"
          tone="warning"
        />

        {/* 4. Verified Orders (COD) */}
        <SummaryCard
          icon={ShieldCheck}
          label="Verified Orders (COD)"
          value={stats.verifiedOutcomeCount.toLocaleString("vi-VN")}
          subtitle={`Verified completion (COD): ${stats.verifiedOutcomeRate.toFixed(
            1
          )}%`}
          tone="success"
        />

        {/* 5. Converted Revenue (COD → Paid) */}
        <SummaryCard
          icon={ArrowRightLeft}
          label="Converted Revenue (COD → Paid)"
          value={`${stats.convertedRevenue.toLocaleString("vi-VN")} VND`}
          subtitle={`Converted COD orders: ${stats.convertedOrders.toLocaleString(
            "vi-VN"
          )} (${stats.convertedRate.toFixed(1)}%)`}
          tone="success"
        />

        {/* 6. Cancelled Rate (COD) */}
        <SummaryCard
          icon={TrendingUp}
          label="Cancelled Rate (COD)"
          value={`${stats.cancelRate.toFixed(1)}%`}
          subtitle="Cancelled COD orders in selected range"
          tone="danger"
        />
      </div>

      {/* Orders & Revenue dashboards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Orders Dashboard */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Orders Dashboard</CardTitle>
            <p className="mt-1 text-sm text-white/60">
              Total orders and COD breakdown (pending / confirmed / cancelled).
            </p>
          </CardHeader>
          <CardContent className="h-80">
            {ordersChart.length === 0 ? (
              <EmptyState message="No orders in this date range yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.2)"
                  />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip content={<OrdersTooltip />} />
                  <Legend
                    wrapperStyle={{
                      color: "#9ca3af",
                      fontSize: 11,
                    }}
                  />
                  {/* Total orders (separate bar) */}
                  <Bar
                    dataKey="totalOrders"
                    name="Total Orders"
                    fill={COLORS.totalOrders}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                  {/* COD breakdown (stacked) */}
                  <Bar
                    dataKey="codPending"
                    name="COD Pending"
                    stackId="cod"
                    fill={COLORS.codPending}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="codConfirmed"
                    name="COD Confirmed"
                    stackId="cod"
                    fill={COLORS.codConfirmed}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="codCancelled"
                    name="COD Cancelled"
                    stackId="cod"
                    fill={COLORS.codCancelled}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Dashboard */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Revenue Dashboard</CardTitle>
            <p className="mt-1 text-sm text-white/60">
              Total revenue vs converted revenue from COD orders.
            </p>
          </CardHeader>
          <CardContent className="h-80">
            {revenueChart.length === 0 ? (
              <EmptyState message="No revenue in this date range yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.2)"
                  />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend
                    wrapperStyle={{
                      color: "#9ca3af",
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="otherRevenue"
                    name="Other Revenue"
                    stackId="rev"
                    fill={COLORS.otherRevenue}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="convertedRevenue"
                    name="Converted Revenue (COD → Paid)"
                    stackId="rev"
                    fill={COLORS.converted}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk distribution + High risk orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <p className="mt-1 text-sm text-white/60">
              Low, medium and high risk orders.
            </p>
          </CardHeader>
          <CardContent className="h-80">
            {riskPieData.length === 0 ? (
              <EmptyState message="No risk data in this date range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {riskPieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={
                          entry.key === "low"
                            ? COLORS.riskLow
                            : entry.key === "medium"
                              ? COLORS.riskMedium
                              : COLORS.riskHigh
                        }
                        stroke="#020617"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<RiskTooltip />} />
                  <Legend
                    wrapperStyle={{
                      color: "#9ca3af",
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>High Risk Orders (Need Review)</CardTitle>
            <p className="mt-1 text-sm text-white/60">
              Orders with high risk score that are not verified yet.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {highRiskOrders.length === 0 ? (
              <EmptyState message="No high risk orders in this date range." />
            ) : (
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-white/60">
                    <th className="px-4 py-2">Order ID</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Address</th>
                    <th className="px-4 py-2">Risk Score</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {highRiskOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5">
                      <td className="px-4 py-2 text-white/90">
                        {order.order_id || order.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2 text-white/70">
                        {order.customer_name}
                      </td>
                      <td className="px-4 py-2 text-white/70">
                        {order.phone}
                      </td>
                      <td className="px-4 py-2 text-white/60">
                        {order.province || order.address || "-"}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                          {order.risk_score ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-white/70">
                        {order.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-full bg-slate-900/80 px-4 py-2 text-xs text-white/70 shadow-lg shadow-black/40 backdrop-blur">
            Loading dashboard...
          </div>
        </div>
      )}
    </div>
  );
};

interface TooltipItemProps {
  label: string;
  value: number | string;
  color: string;
}

const TooltipRow: React.FC<TooltipItemProps> = ({ label, value, color }) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-white/70">{label}</span>
    </div>
    <span className="font-medium text-white/90">{value}</span>
  </div>
);

const OrdersTooltip: React.FC<TooltipProps<number, string>> = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as any;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2.5 text-xs shadow-xl shadow-black/40 backdrop-blur">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div className="space-y-1.5">
        <TooltipRow
          label="Total Orders"
          value={data.totalOrders ?? 0}
          color={COLORS.totalOrders}
        />
        <TooltipRow
          label="COD Pending"
          value={data.codPending ?? 0}
          color={COLORS.codPending}
        />
        <TooltipRow
          label="COD Confirmed"
          value={data.codConfirmed ?? 0}
          color={COLORS.codConfirmed}
        />
        <TooltipRow
          label="COD Cancelled"
          value={data.codCancelled ?? 0}
          color={COLORS.codCancelled}
        />
      </div>
    </div>
  );
};

const RevenueTooltip: React.FC<TooltipProps<number, string>> = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as any;

  const total = Number(data.totalRevenue ?? 0);
  const converted = Number(data.convertedRevenue ?? 0);
  const other = Number(data.otherRevenue ?? 0);

  const formatVnd = (v: number) => `${v.toLocaleString("vi-VN")} VND`;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2.5 text-xs shadow-xl shadow-black/40 backdrop-blur">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div className="space-y-1.5">
        <TooltipRow
          label="Total Revenue"
          value={formatVnd(total)}
          color="#e5e7eb"
        />
        <TooltipRow
          label="Converted Revenue (COD → Paid)"
          value={formatVnd(converted)}
          color={COLORS.converted}
        />
        <TooltipRow
          label="Other Revenue"
          value={formatVnd(other)}
          color={COLORS.otherRevenue}
        />
      </div>
    </div>
  );
};

const RiskTooltip: React.FC<TooltipProps<number, string>> = (props: any) => {
  const { active, payload } = props;
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const name = p.name as string;
  const value = Number(p.value ?? 0);

  const color =
    name === "Low"
      ? COLORS.riskLow
      : name === "Medium"
        ? COLORS.riskMedium
        : COLORS.riskHigh;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2.5 text-xs shadow-xl shadow-black/40 backdrop-blur">
      <TooltipRow
        label={name}
        value={value.toLocaleString("vi-VN")}
        color={color}
      />
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = "default",
}) => {
  // Map tone to colors
  const toneConfig = {
    default: {
      valueClass: "text-white",
      iconChipClass: "bg-white/5 text-indigo-400",
    },
    success: {
      valueClass: "text-emerald-400",
      iconChipClass: "bg-emerald-500/10 text-emerald-400",
    },
    warning: {
      valueClass: "text-amber-400",
      iconChipClass: "bg-amber-500/10 text-amber-300",
    },
    danger: {
      valueClass: "text-rose-400",
      iconChipClass: "bg-rose-500/10 text-rose-400",
    },
  };

  const config = toneConfig[tone];

  return (
    <Card className="glass-card h-full">
      <CardContent className="p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">
              {label}
            </p>
            <div className={`mt-2 text-2xl font-semibold ${config.valueClass}`}>
              {value}
            </div>
            {subtitle && (
              <p className="mt-1 text-xs text-white/60">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-xl p-3 ${config.iconChipClass}`}>
            <Icon size={22} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex h-full items-center justify-center text-sm text-white/50">
    {message}
  </div>
);
