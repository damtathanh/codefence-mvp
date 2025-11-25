import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { Radio, TrendingUp, AlertTriangle, Percent } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface ChannelsTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const ChannelsTab: React.FC<ChannelsTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, channelStats } = useDashboardStats(dateRange, customFrom, customTo);

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
                    title="Total Channels"
                    value={channelStats.totalChannels}
                    subtitle="Distinct channels active"
                    icon={<Radio className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
                <StatCard
                    title="Top Channel"
                    value={channelStats.topChannelByRevenue?.channel || "N/A"}
                    subtitle={channelStats.topChannelByRevenue
                        ? `Revenue: ${formatCurrency(channelStats.topChannelByRevenue.totalRevenue)}`
                        : "No data yet"}
                    icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Highest Boom Channel"
                    value={channelStats.highestBoomChannel?.channel || "N/A"}
                    subtitle={channelStats.highestBoomChannel
                        ? `${channelStats.highestBoomChannel.cancelRate}% boom rate`
                        : "Min 10 COD orders required"}
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
                <StatCard
                    title="Channel Conversion"
                    value={`${channelStats.overallConversionRate}%`}
                    subtitle="COD orders converted to paid"
                    icon={<Percent className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Revenue by Channel" subtitle="Total revenue per channel">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Channel analytics coming soon</p>
                    </div>
                </ChartCard>

                <ChartCard title="Boom Rate by Channel" subtitle="Cancellation rate per channel">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Boom rate analytics coming soon</p>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
