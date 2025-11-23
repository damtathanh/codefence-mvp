import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Clock, Timer } from 'lucide-react';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface FunnelTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const FunnelTab: React.FC<FunnelTabProps> = ({ dateRange, customFrom, customTo }) => {
    // TODO: Fetch real data based on dateRange
    // TODO: Replace with real Supabase data
    const chartData: any[] = [];

    return (
        <div className="space-y-4">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Confirmation Rate"
                    value="–"
                    subtitle="–"
                    icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="Cancel Rate"
                    value="–"
                    subtitle="–"
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                />
                <StatCard
                    title="No Response Rate"
                    value="–"
                    subtitle="–"
                    icon={<Clock className="w-5 h-5 text-yellow-400" />}
                />
                <StatCard
                    title="Avg Confirmation Time"
                    value="–"
                    subtitle="–"
                    icon={<Timer className="w-5 h-5 text-blue-400" />}
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Verification Funnel" subtitle="Order progression stages">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis type="number" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
                            <YAxis type="category" dataKey="step" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 11 }} width={120} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                                formatter={(value, name, props) => [`${value} (${props.payload.percent}%)`, 'Count']}
                            />
                            <Bar dataKey="count" fill="#8B5CF6" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Avg Time to Confirmation" subtitle="Daily average in hours">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
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
                                formatter={(value) => `${value} hours`}
                            />
                            <Line type="monotone" dataKey="avgHours" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} name="Avg Hours" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};
