import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
const COLORS = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
};
export const RiskDistributionChart = ({ data }) => {
    const chartData = [
        { name: 'Low Risk', value: data.low, color: COLORS.low },
        { name: 'Medium Risk', value: data.medium, color: COLORS.medium },
        { name: 'High Risk', value: data.high, color: COLORS.high },
    ].filter(item => item.value > 0);
    const total = data.low + data.medium + data.high;
    return (_jsxs("div", { className: "bg-[#12163A] border border-[#1E223D] rounded-xl p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-4", children: "Risk Distribution (COD Orders)" }), total === 0 ? (_jsx("div", { className: "h-[250px] flex items-center justify-center text-[#E5E7EB]/40", children: "No data available" })) : (_jsx(ResponsiveContainer, { width: "100%", height: 250, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: chartData, cx: "50%", cy: "50%", labelLine: false, label: (entry) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`, outerRadius: 80, fill: "#8884d8", dataKey: "value", children: chartData.map((entry, index) => (_jsx(Cell, { fill: entry.color }, `cell-${index}`))) }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#12163A',
                                border: '1px solid #1E223D',
                                borderRadius: '8px',
                                color: '#E5E7EB'
                            } }), _jsx(Legend, { wrapperStyle: { color: '#E5E7EB' } })] }) }))] }));
};
