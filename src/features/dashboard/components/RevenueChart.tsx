import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { RevenueDashboardPoint } from '../useDashboardStats';

interface RevenueChartProps {
    data: RevenueDashboardPoint[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
    return (
        <div className="bg-[#12163A] border border-[#1E223D] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Total vs Converted Revenue</h3>
            {data.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-[#E5E7EB]/40">
                    No data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                        <XAxis
                            dataKey="date"
                            stroke="#E5E7EB"
                            tick={{ fill: '#E5E7EB' }}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                        />
                        <YAxis
                            stroke="#E5E7EB"
                            tick={{ fill: '#E5E7EB' }}
                            tickFormatter={(value) => {
                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                return value.toString();
                            }}
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
                        <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                        <Bar dataKey="convertedRevenue" stackId="a" fill="#10B981" name="Converted Revenue (COD → Paid)" />
                        <Bar dataKey="otherRevenue" stackId="a" fill="#8B5CF6" name="Other Revenue" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};
