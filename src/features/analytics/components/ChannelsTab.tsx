import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Radio, TrendingUp, AlertTriangle, Percent } from 'lucide-react';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface ChannelsTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const ChannelsTab: React.FC<ChannelsTabProps> = ({ dateRange, customFrom, customTo }) => {
    // TODO: Fetch real data based on dateRange
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // TODO: Replace with real Supabase data
    const chartData: any[] = [];

    return (
        <div className="space-y-4">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Channels"
                    value={0}
                    subtitle="–"
                    icon={<Radio className="w-5 h-5 text-[#8B5CF6]" />}
                />
                <StatCard
                    title="Top Channel"
                    value="–"
                    subtitle="–"
                    icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="Highest Boom Channel"
                    value="–"
                    subtitle="–"
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                />
                <StatCard
                    title="Channel Conversion"
                    value="–"
                    subtitle="–"
                    icon={<Percent className="w-5 h-5 text-blue-400" />}
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Revenue by Channel" subtitle="Total revenue per channel">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis dataKey="channel" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
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
                            <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Boom Rate by Channel" subtitle="Cancellation rate per channel">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis dataKey="channel" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <YAxis stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                                formatter={(value) => `${value}%`}
                            />
                            <Bar dataKey="boomRate" fill="#EF4444" name="Boom Rate %" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};
