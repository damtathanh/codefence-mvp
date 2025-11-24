import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Clock, Timer } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface FunnelTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const FunnelTab: React.FC<FunnelTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error } = useDashboardStats(dateRange, customFrom, customTo);

    // Placeholder data
    const chartData: any[] = [];

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
                    title="Confirmation Rate"
                    value="N/A"
                    subtitle="Coming soon"
                    icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Cancel Rate"
                    value="N/A"
                    subtitle="Coming soon"
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
                <StatCard
                    title="No Response Rate"
                    value="N/A"
                    subtitle="Coming soon"
                    icon={<Clock className="w-5 h-5 text-yellow-400" />}
                    valueColor="#facc15"
                />
                <StatCard
                    title="Avg Confirmation Time"
                    value="N/A"
                    subtitle="Coming soon"
                    icon={<Timer className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Verification Funnel" subtitle="Order progression stages">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Funnel analytics coming soon</p>
                    </div>
                </ChartCard>

                <ChartCard title="Avg Time to Confirmation" subtitle="Daily average in hours">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Time analytics coming soon</p>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
