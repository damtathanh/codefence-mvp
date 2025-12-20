import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation } from 'react-router-dom';
import { TrendingUp, ShoppingCart, ShieldCheck, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const dashboardSummary = [
    { label: 'Total Orders', value: '12,458', change: '+12.5%', trend: 'up', icon: ShoppingCart, color: 'text-blue-400' },
    { label: 'Verified Orders', value: '11,234', change: '+8.2%', trend: 'up', icon: ShieldCheck, color: 'text-green-400' },
    { label: 'Fraud Detected', value: '1,224', change: '-5.3%', trend: 'down', icon: TrendingUp, color: 'text-red-400' },
    { label: 'Revenue', value: '$2.4M', change: '+15.8%', trend: 'up', icon: DollarSign, color: 'text-purple-400' },
];
const adminTrendData = [
    { month: 'Jan', rate: 12.5 },
    { month: 'Feb', rate: 11.8 },
    { month: 'Mar', rate: 10.2 },
    { month: 'Apr', rate: 9.5 },
    { month: 'May', rate: 8.9 },
    { month: 'Jun', rate: 9.2 },
];
const adminVerificationData = [
    { day: 'Mon', verified: 450, flagged: 45 },
    { day: 'Tue', verified: 520, flagged: 38 },
    { day: 'Wed', verified: 480, flagged: 52 },
    { day: 'Thu', verified: 610, flagged: 42 },
    { day: 'Fri', verified: 580, flagged: 48 },
    { day: 'Sat', verified: 420, flagged: 35 },
    { day: 'Sun', verified: 390, flagged: 32 },
];
const analyticsTrendData = [
    { month: 'Jan', fraud: 152, verified: 1240 },
    { month: 'Feb', fraud: 138, verified: 1350 },
    { month: 'Mar', fraud: 125, verified: 1420 },
    { month: 'Apr', fraud: 118, verified: 1580 },
    { month: 'May', fraud: 108, verified: 1650 },
    { month: 'Jun', fraud: 112, verified: 1720 },
];
const analyticsSalesData = [
    { month: 'Jan', sales: 45000 },
    { month: 'Feb', sales: 52000 },
    { month: 'Mar', sales: 48000 },
    { month: 'Apr', sales: 61000 },
    { month: 'May', sales: 68000 },
    { month: 'Jun', sales: 75000 },
];
const analyticsRegionsData = [
    { name: 'Ho Chi Minh', value: 35, color: '#8B5CF6' },
    { name: 'Hanoi', value: 28, color: '#6366F1' },
    { name: 'Da Nang', value: 15, color: '#8B5CF6' },
    { name: 'Can Tho', value: 12, color: '#6366F1' },
    { name: 'Others', value: 10, color: '#8B5CF6' },
];
const analyticsKeyMetrics = [
    { label: 'Verification Rate', value: '94.2%', variant: 'success', progress: 94.2 },
    { label: 'Average Risk Score', value: '42.5', variant: 'info', progress: 42.5 },
    { label: 'Flagged Orders', value: '11.7%', variant: 'warning', progress: 11.7 },
    { label: 'Success Rate', value: '96.8%', variant: 'success', progress: 96.8 },
];
export const AdminDashboard = () => {
    const location = useLocation();
    const isAnalytics = location.pathname.includes('/admin/analytics');
    const renderDashboardContent = () => (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: dashboardSummary.map((item, index) => {
                    const Icon = item.icon;
                    return (_jsx(Card, { children: _jsxs(CardContent, { className: "p-6 lg:p-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsx("div", { className: `p-3 rounded-lg bg-white/5 ${item.color}`, children: _jsx(Icon, { size: 24 }) }), _jsx("span", { className: `text-sm font-medium ${item.trend === 'up' ? 'text-green-400' : 'text-red-400'}`, children: item.change })] }), _jsx("h3", { className: "text-2xl font-bold text-[#E5E7EB] mb-2", children: item.value }), _jsx("p", { className: "text-sm text-[#E5E7EB]/70", children: item.label })] }) }, index));
                }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Fraud Rate Trend" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/70 mt-2", children: "Monthly fraud detection rate" })] }), _jsx(CardContent, { className: "pt-6", children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: adminTrendData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "month", stroke: "#E5E7EB" }), _jsx(YAxis, { stroke: "#E5E7EB" }), _jsx(Tooltip, { contentStyle: {
                                                    backgroundColor: '#12163A',
                                                    border: '1px solid #1E223D',
                                                    borderRadius: '8px',
                                                    color: '#E5E7EB',
                                                } }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "rate", stroke: "#8B5CF6", strokeWidth: 2, name: "Fraud Rate (%)" })] }) }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Verification Activity" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/70 mt-2", children: "Daily verification statistics" })] }), _jsx(CardContent, { className: "pt-6", children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: adminVerificationData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "day", stroke: "#E5E7EB" }), _jsx(YAxis, { stroke: "#E5E7EB" }), _jsx(Tooltip, { contentStyle: {
                                                    backgroundColor: '#12163A',
                                                    border: '1px solid #1E223D',
                                                    borderRadius: '8px',
                                                    color: '#E5E7EB',
                                                } }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "verified", fill: "#6366F1", name: "Verified" }), _jsx(Bar, { dataKey: "flagged", fill: "#EF4444", name: "Flagged" })] }) }) })] })] })] }));
    const renderAnalyticsContent = () => (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Fraud Rate Trends" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/70 mt-1", children: "Monthly fraud vs verified orders" })] }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: analyticsTrendData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "month", stroke: "#E5E7EB" }), _jsx(YAxis, { stroke: "#E5E7EB" }), _jsx(Tooltip, { contentStyle: {
                                                backgroundColor: '#12163A',
                                                border: '1px solid #1E223D',
                                                borderRadius: '8px',
                                                color: '#E5E7EB',
                                            } }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "fraud", stroke: "#EF4444", strokeWidth: 2, name: "Fraud Cases" }), _jsx(Line, { type: "monotone", dataKey: "verified", stroke: "#10B981", strokeWidth: 2, name: "Verified Orders" })] }) }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Sales Growth" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/70 mt-1", children: "Monthly revenue trends" })] }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: analyticsSalesData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E223D" }), _jsx(XAxis, { dataKey: "month", stroke: "#E5E7EB" }), _jsx(YAxis, { stroke: "#E5E7EB" }), _jsx(Tooltip, { contentStyle: {
                                                backgroundColor: '#12163A',
                                                border: '1px solid #1E223D',
                                                borderRadius: '8px',
                                                color: '#E5E7EB',
                                            } }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "sales", fill: "#6366F1", name: "Sales ($)" })] }) }) })] }), _jsxs(Card, { className: "lg:col-span-2", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Top Regions" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/70 mt-1", children: "Order distribution by region" })] }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: analyticsRegionsData, cx: "50%", cy: "50%", labelLine: false, label: ({ name, percent }) => {
                                                const percentage = typeof percent === 'number' ? (percent * 100).toFixed(0) : '0';
                                                return `${name} ${percentage}%`;
                                            }, outerRadius: 100, fill: "#8884d8", dataKey: "value", children: analyticsRegionsData.map((entry, index) => (_jsx(Cell, { fill: entry.color }, `cell-${index}`))) }), _jsx(Tooltip, { contentStyle: {
                                                backgroundColor: '#12163A',
                                                border: '1px solid #1E223D',
                                                borderRadius: '8px',
                                                color: '#E5E7EB',
                                            } })] }) }) })] }), _jsxs(Card, { className: "lg:col-span-2", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Key Metrics" }) }), _jsx(CardContent, { className: "space-y-6", children: analyticsKeyMetrics.map((metric) => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[#E5E7EB]/70", children: metric.label }), _jsx(Badge, { variant: metric.variant, children: metric.value })] }), _jsx("div", { className: "w-full bg-white/10 rounded-full h-2 overflow-hidden", children: _jsx("div", { className: "h-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] rounded-full", style: { width: `${metric.progress}%` } }) })] }, metric.label))) })] })] }) }));
    return (_jsx("div", { className: "space-y-6", children: isAnalytics ? renderAnalyticsContent() : renderDashboardContent() }));
};
