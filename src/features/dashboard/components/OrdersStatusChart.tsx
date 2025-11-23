import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { OrdersDashboardPoint } from '../useDashboardStats';

interface OrdersStatusChartProps {
    data: OrdersDashboardPoint[];
}

export const OrdersStatusChart: React.FC<OrdersStatusChartProps> = ({ data }) => {
    return (
        <div className="bg-[#12163A] border border-[#1E223D] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Orders & COD Status Over Time</h3>
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
                        <YAxis stroke="#E5E7EB" tick={{ fill: '#E5E7EB' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#12163A',
                                border: '1px solid #1E223D',
                                borderRadius: '8px',
                                color: '#E5E7EB'
                            }}
                        />
                        <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                        <Bar dataKey="codConfirmed" stackId="cod" fill="#10B981" name="COD Confirmed" />
                        <Bar dataKey="codCancelled" stackId="cod" fill="#EF4444" name="COD Cancelled" />
                        <Bar dataKey="codPending" stackId="cod" fill="#F59E0B" name="COD Pending" />
                        <Bar dataKey="totalOrders" fill="#8B5CF6" fillOpacity={0.3} name="Total Orders" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};
