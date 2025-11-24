import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface CodTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const CodTab: React.FC<CodTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, stats, ordersChart } = useDashboardStats(dateRange, customFrom, customTo);

    // Calculate boom rate for chart
    const boomRateData = ordersChart.map(point => {
        const totalProcessed = point.codConfirmed + point.codCancelled;
        const boomRate = totalProcessed > 0 ? (point.codCancelled / totalProcessed) * 100 : 0;
        return {
            date: point.date,
            boomRate: Math.round(boomRate * 10) / 10
        };
    });

    // Calculate status distribution for pie chart
    const statusDistribution = [
        { name: 'Pending', value: stats.pendingVerification, color: '#F59E0B' },
        { name: 'Confirmed', value: stats.codConfirmed, color: '#10B981' },
        { name: 'Cancelled', value: stats.codCancelled, color: '#EF4444' },
    ].filter(item => item.value > 0);

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
                    title="COD Orders"
                    value={stats.codOrders}
                    subtitle={`${stats.pendingVerification} pending verification`}
                    icon={<Package className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
                <StatCard
                    title="COD Confirmed"
                    value={stats.codConfirmed}
                    subtitle={`${stats.verifiedOutcomeRate}% outcome rate`}
                    icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="COD Cancelled"
                    value={stats.codCancelled}
                    subtitle="Cancelled or Rejected"
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
                <StatCard
                    title="COD Boom Rate"
                    value={`${stats.cancelRate}%`}
                    subtitle="of processed orders"
                    icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />}
                    valueColor="#facc15"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="COD Boom Rate Over Time" subtitle="Daily boom percentage">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={boomRateData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis dataKey="date" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <YAxis stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                                formatter={(value: number) => `${value}%`}
                            />
                            <Line type="monotone" dataKey="boomRate" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 4 }} name="Boom Rate %" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="COD Status Distribution" subtitle="Current status breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => `${entry.name}: ${((entry.value / stats.codOrders) * 100).toFixed(1)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusDistribution.map((entry, index) => (
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
            </div>
        </div>
    );
};
