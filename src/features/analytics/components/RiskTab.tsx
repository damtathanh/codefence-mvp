import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, AlertCircle, Shield, TrendingUp } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';
import { RiskBadge } from '../../../components/dashboard/RiskBadge';

interface RiskTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const RiskTab: React.FC<RiskTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, stats, riskDistribution, highRiskOrders, riskStats } = useDashboardStats(dateRange, customFrom, customTo);

    const chartData = [
        { name: 'Low Risk', value: riskDistribution.low, color: '#10B981' },
        { name: 'Medium Risk', value: riskDistribution.medium, color: '#F59E0B' },
        { name: 'High Risk', value: riskDistribution.high, color: '#EF4444' },
    ].filter(item => item.value > 0);

    const totalRiskOrders = riskDistribution.low + riskDistribution.medium + riskDistribution.high;

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
                    title="Avg Risk Score"
                    value={riskStats.avgRiskScore !== null ? riskStats.avgRiskScore.toFixed(1) : "–"}
                    subtitle={riskStats.avgRiskScore !== null ? "COD orders average" : "Not available yet"}
                    icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
                <StatCard
                    title="High-Risk Orders"
                    value={stats.riskHigh}
                    subtitle="Action required"
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
                <StatCard
                    title="Medium-Risk Orders"
                    value={stats.riskMedium}
                    subtitle="Monitor closely"
                    icon={<AlertCircle className="w-5 h-5 text-yellow-400" />}
                    valueColor="#facc15"
                />
                <StatCard
                    title="Low-Risk Orders"
                    value={stats.riskLow}
                    subtitle="Safe to process"
                    icon={<Shield className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Risk Distribution" subtitle="Orders by risk level">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => `${entry.name}: ${((entry.value / totalRiskOrders) * 100).toFixed(1)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <div className="bg-[#12163A] border border-[#1E223D] rounded-xl p-6 flex flex-col h-[400px]">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white">High Risk Orders</h3>
                        <p className="text-sm text-white/60">Orders requiring immediate attention</p>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {highRiskOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/40">
                                <Shield className="w-12 h-12 mb-2 opacity-50" />
                                <p>No high-risk orders in this date range</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm text-white/80">
                                <thead className="text-xs uppercase text-white/40 border-b border-[#1E223D]">
                                    <tr>
                                        <th className="px-4 py-3">Order ID</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {highRiskOrders.map(order => (
                                        <tr key={order.id} className="border-b border-[#1E223D] hover:bg-white/5">
                                            <td className="px-4 py-3 font-mono text-xs text-white/60">
                                                {order.id.slice(0, 8)}...
                                            </td>
                                            <td className="px-4 py-3">
                                                {order.customer_name || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.amount || 0)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <RiskBadge score={order.risk_score} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
