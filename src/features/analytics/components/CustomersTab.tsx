import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { UserPlus, Users, Repeat, TrendingUp } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface CustomersTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, customerStats } = useDashboardStats(dateRange, customFrom, customTo);

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
                    title="New Customers"
                    value={customerStats.newCustomers}
                    subtitle="First order in this period"
                    icon={<UserPlus className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Returning Customers"
                    value={customerStats.returningCustomers}
                    subtitle="Had orders before this period"
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
                <StatCard
                    title="Repeat Purchase Rate"
                    value={`${customerStats.repeatPurchaseRate}%`}
                    subtitle="Returning / Total customers"
                    icon={<Repeat className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
                <StatCard
                    title="Average CLV"
                    value="N/A"
                    subtitle="Coming soon"
                    icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                    valueColor="#34d399"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Top Customers by Revenue" subtitle="Top 5 customers">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Customer analytics coming soon</p>
                    </div>
                </ChartCard>

                <ChartCard title="Customer Demographics" subtitle="Gender distribution">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Demographics coming soon</p>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
