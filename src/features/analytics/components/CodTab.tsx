import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface CodTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const CodTab: React.FC<CodTabProps> = ({ dateRange, customFrom, customTo }) => {
    // TODO: Fetch real data based on dateRange
    // TODO: Replace with real Supabase data
    const chartData: any[] = [];

    return (
        <div className="space-y-4">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="COD Orders"
                    value={0}
                    subtitle="–"
                    icon={<Package className="w-5 h-5 text-[#8B5CF6]" />}
                />
                <StatCard
                    title="COD Confirmed"
                    value={0}
                    subtitle="–"
                    icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="COD Cancelled"
                    value={0}
                    subtitle="–"
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                />
                <StatCard
                    title="COD Boom Rate"
                    value="–"
                    subtitle="–"
                    icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />}
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="COD Boom Rate Over Time" subtitle="Daily boom percentage">
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
                                formatter={(value) => `${value}%`}
                            />
                            <Line type="monotone" dataKey="boomRate" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 4 }} name="Boom Rate %" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="COD Status Distribution" subtitle="Current status breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => `${entry.name}: ${((entry.value / 340) * 100).toFixed(1)}%`}
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
            </div>
        </div>
    );
};
