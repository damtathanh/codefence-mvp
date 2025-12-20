import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
export const OrdersStatusChart = ({ data }) => {
    return (_jsxs("div", { className: "bg-[#12163A] border border-[#1E223D] rounded-xl p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-4", children: "Orders & COD Status Over Time" }), data.length === 0 ? (_jsx("div", { className: "h-[300px] flex items-center justify-center text-[#E5E7EB]/40", children: "No data available" })) : (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "date", stroke: "#E5E7EB", tick: { fill: '#E5E7EB' }, tickFormatter: (value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            } }), _jsx(YAxis, { stroke: "#E5E7EB", tick: { fill: '#E5E7EB' } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#12163A',
                                border: '1px solid #1E223D',
                                borderRadius: '8px',
                                color: '#E5E7EB'
                            } }), _jsx(Legend, { wrapperStyle: { color: '#E5E7EB' } }), _jsx(Bar, { dataKey: "codConfirmed", stackId: "cod", fill: "#10B981", name: "COD Confirmed" }), _jsx(Bar, { dataKey: "codCancelled", stackId: "cod", fill: "#EF4444", name: "COD Cancelled" }), _jsx(Bar, { dataKey: "codPending", stackId: "cod", fill: "#F59E0B", name: "COD Pending" }), _jsx(Bar, { dataKey: "totalOrders", fill: "#8B5CF6", fillOpacity: 0.3, name: "Total Orders" })] }) }))] }));
};
