import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, AlertCircle, Shield, TrendingUp } from 'lucide-react';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface RiskTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const RiskTab: React.FC<RiskTabProps> = ({ dateRange, customFrom, customTo }) => {
    // TODO: Fetch real data based on dateRange
    // TODO: Replace with real Supabase data
    const chartData: any[] = [];

    return (
        <div className="space-y-4">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Avg Risk Score"
                    value="–"
                    subtitle="–"
                    icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                />
                <StatCard
                    title="High-Risk Orders"
                    value={0}
                    subtitle="–"
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                />
                <StatCard
                    title="Medium-Risk Orders"
                    value={0}
                    subtitle="–"
                    icon={<AlertCircle className="w-5 h-5 text-yellow-400" />}
                />
                <StatCard
                    title="Low-Risk Orders"
                    value={0}
                    subtitle="–"
                    icon={<Shield className="w-5 h-5 text-green-400" />}
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Risk Distribution" subtitle="Orders by risk level">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => `${entry.name}: ${((entry.value / 383) * 100).toFixed(1)}%`}
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

                <ChartCard title="Boom Rate by Risk Bucket" subtitle="Cancellation rate correlation">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis dataKey="bucket" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 12 }} />
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
