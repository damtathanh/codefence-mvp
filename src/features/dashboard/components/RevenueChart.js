import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
};
export const RevenueChart = ({ data }) => {
    return (_jsxs("div", { className: "bg-[#12163A] border border-[#1E223D] rounded-xl p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-4", children: "Total vs Converted Revenue" }), data.length === 0 ? (_jsx("div", { className: "h-[300px] flex items-center justify-center text-[#E5E7EB]/40", children: "No data available" })) : (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", stroke: "#E5E7EB", tick: { fill: '#E5E7EB' }, tickFormatter: (value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            } }), _jsx(YAxis, { stroke: "#E5E7EB", tick: { fill: '#E5E7EB' }, tickFormatter: (value) => {
                                if (value >= 1000000)
                                    return `${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000)
                                    return `${(value / 1000).toFixed(0)}K`;
                                return value.toString();
                            } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#12163A',
                                border: '1px solid #1E223D',
                                borderRadius: '8px',
                                color: '#E5E7EB'
                            }, formatter: (value) => formatCurrency(value) }), _jsx(Legend, { wrapperStyle: { color: '#E5E7EB' } }), _jsx(Bar, { dataKey: "convertedRevenue", stackId: "a", fill: "#10B981", name: "Converted Revenue (COD \u2192 Paid)" }), _jsx(Bar, { dataKey: "otherRevenue", stackId: "a", fill: "#8B5CF6", name: "Other Revenue" })] }) }))] }));
};
