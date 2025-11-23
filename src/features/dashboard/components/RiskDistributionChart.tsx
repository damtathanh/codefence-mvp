import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RiskDistributionChartProps {
    data: {
        low: number;
        medium: number;
        high: number;
    };
}

const COLORS = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
};

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ data }) => {
    const chartData = [
        { name: 'Low Risk', value: data.low, color: COLORS.low },
        { name: 'Medium Risk', value: data.medium, color: COLORS.medium },
        { name: 'High Risk', value: data.high, color: COLORS.high },
    ].filter(item => item.value > 0);

    const total = data.low + data.medium + data.high;

    return (
        <div className="bg-[#12163A] border border-[#1E223D] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Distribution (COD Orders)</h3>
            {total === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-[#E5E7EB]/40">
                    No data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
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
            )}
        </div>
    );
};
