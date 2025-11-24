import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, TrendingDown, Users } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface OverviewTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, stats, ordersChart, revenueChart } = useDashboardStats(dateRange, customFrom, customTo);

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
        <div className="space-y-4">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Orders"
                    value={stats.totalOrders}
                    subtitle={`${stats.codOrders} COD / ${stats.prepaidOrders} Prepaid`}
                    icon={<Package className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    subtitle={`Avg: ${formatCurrency(stats.avgOrderValue)}`}
                    icon={<DollarSign className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="COD Cancel Rate"
                    value={`${stats.cancelRate}%`}
                    subtitle="of processed COD orders"
                    icon={<TrendingDown className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
                <StatCard
                    title="Converted Orders"
                    value={stats.convertedOrders}
                    subtitle={`${stats.convertedRate}% conversion rate`}
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Orders Over Time" subtitle="Total vs COD orders">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ordersChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="date"
                                stroke="#E5E7EB"
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                            />
                            <YAxis stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                            <Area type="monotone" dataKey="totalOrders" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} name="Total Orders" />
                            <Area type="monotone" dataKey="codPending" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="COD Pending" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue Performance" subtitle="Total vs Converted Revenue">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                dataKey="date"
                                stroke="#E5E7EB"
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                            />
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
