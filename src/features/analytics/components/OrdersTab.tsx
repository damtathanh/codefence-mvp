import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, XCircle, MessageCircle, Clock } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface OrdersTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, stats, ordersChart } = useDashboardStats(dateRange, customFrom, customTo);

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
                    title="Total Orders"
                    value={stats.totalOrders}
                    subtitle={`${stats.codOrders} COD / ${stats.prepaidOrders} Prepaid`}
                    icon={<Package className="w-5 h-5 text-[#4ade80]" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Customer Responses"
                    value={stats.customerResponses}
                    subtitle={`${stats.codConfirmed} confirmed / ${stats.codCancelled} cancelled`}
                    icon={<MessageCircle className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
                <StatCard
                    title="Pending Verification"
                    value={stats.pendingVerification}
                    subtitle="COD orders waiting for processing"
                    icon={<Clock className="w-5 h-5 text-[#facc15]" />}
                    valueColor="#facc15"
                />
                <StatCard
                    title="Cancellation Rate"
                    value={`${stats.cancelRate}%`}
                    subtitle="of processed COD orders"
                    icon={<XCircle className="w-5 h-5 text-[#f87171]" />}
                    valueColor="#f87171"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Orders Total" subtitle="Order per day/week/month">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersChart}>
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
                            />
                            <Bar dataKey="totalOrders" fill="#8B5CF6" name="Total Orders" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Status Breakdown of COD Orders" subtitle="Confirmed, Cancelled, Pending">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersChart}>
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
                            />
                            <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                            <Bar dataKey="codConfirmed" stackId="a" fill="#10B981" name="Confirmed" />
                            <Bar dataKey="codCancelled" stackId="a" fill="#EF4444" name="Cancelled" />
                            <Bar dataKey="codPending" stackId="a" fill="#F59E0B" name="Pending" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};
