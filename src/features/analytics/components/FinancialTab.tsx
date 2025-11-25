import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users, Wallet } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface FinancialTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, stats, revenueChart } = useDashboardStats(dateRange, customFrom, customTo);

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
                    value="–"
                    subtitle="Orders pending verification"
                    icon={<Wallet className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
            </div>

            {/* Row 2: Charts */}
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
