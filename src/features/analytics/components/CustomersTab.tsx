import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserPlus, Users, Repeat, TrendingUp } from 'lucide-react';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface CustomersTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ dateRange, customFrom, customTo }) => {
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
                    title="New Customers"
                    value={0}
                    subtitle="–"
                    icon={<UserPlus className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="Returning Customers"
                    value={0}
                    subtitle="–"
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                />
                <StatCard
                    title="Repeat Purchase Rate"
                    value="–"
                    subtitle="–"
                    icon={<Repeat className="w-5 h-5 text-[#8B5CF6]" />}
                />
                <StatCard
                    title="Average CLV"
                    value={formatCurrency(0)}
                    subtitle="–"
                    icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Top Customers by Revenue" subtitle="Top 5 customers">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                type="number"
                                stroke="#E5E7EB"
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                            />
                            <YAxis type="category" dataKey="name" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 11 }} width={100} />
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

                <ChartCard title="Customer Demographics" subtitle="Gender distribution">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => {
                                    // Display gender labels as "Male" or "Female"
                                    const label = entry.gender === "male" ? "Male" : entry.gender === "female" ? "Female" : entry.name;
                                    return `${label}: ${((entry.value / 383) * 100).toFixed(1)}%`;
                                }}
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
