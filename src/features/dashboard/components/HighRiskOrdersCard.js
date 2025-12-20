import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, Phone, User } from 'lucide-react';
const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
};
const getRiskLevelColor = (level) => {
    if (!level)
        return 'text-gray-400';
    switch (level.toLowerCase()) {
        case 'high':
            return 'text-red-400';
        case 'medium':
            return 'text-yellow-400';
        case 'low':
            return 'text-green-400';
        default:
            return 'text-gray-400';
    }
};
const getRiskLevelBg = (level) => {
    if (!level)
        return 'bg-gray-500/10 border-gray-500/20';
    switch (level.toLowerCase()) {
        case 'high':
            return 'bg-red-500/10 border-red-500/20';
        case 'medium':
            return 'bg-yellow-500/10 border-yellow-500/20';
        case 'low':
            return 'bg-green-500/10 border-green-500/20';
        default:
            return 'bg-gray-500/10 border-gray-500/20';
    }
};
export const HighRiskOrdersCard = ({ orders }) => {
    const topOrders = orders.slice(0, 3);
    return (_jsxs("div", { className: "bg-[#12163A] border border-[#1E223D] rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(AlertCircle, { className: "text-red-400", size: 20 }), _jsx("h3", { className: "text-lg font-semibold text-white", children: "High-Risk Orders to Review" })] }), topOrders.length === 0 ? (_jsx("div", { className: "py-8 text-center text-[#E5E7EB]/40", children: "No high-risk orders pending review" })) : (_jsx("div", { className: "space-y-3", children: topOrders.map((order) => (_jsxs("div", { className: `p-4 rounded-lg border ${getRiskLevelBg(order.risk_level)} hover:bg-white/5 transition cursor-pointer`, children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "text-sm font-semibold text-white", children: ["#", order.order_id] }), _jsx("p", { className: "text-xs text-[#E5E7EB]/60 mt-0.5", children: order.status })] }), _jsxs("div", { className: `px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(order.risk_level)}`, children: [order.risk_level?.toUpperCase() || 'N/A', order.risk_score !== null && order.risk_score !== undefined && ` (${order.risk_score})`] })] }), _jsxs("div", { className: "space-y-1.5", children: [order.customer_name && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-[#E5E7EB]/80", children: [_jsx(User, { size: 14, className: "text-[#8B5CF6]" }), _jsx("span", { children: order.customer_name })] })), order.phone && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-[#E5E7EB]/80", children: [_jsx(Phone, { size: 14, className: "text-[#8B5CF6]" }), _jsx("span", { children: order.phone })] })), _jsx("div", { className: "text-sm font-semibold text-white mt-2", children: formatCurrency(order.amount) })] })] }, order.id))) }))] }));
};
