import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DollarSign, ShoppingCart, TrendingDown, CheckCircle, TrendingUp } from 'lucide-react';
export const OverviewSummary = ({ overview, loading }) => {
    if (loading) {
        return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [1, 2, 3, 4].map((i) => (_jsx("div", { className: "h-32 bg-white/5 rounded-xl animate-pulse border border-white/5" }, i))) }));
    }
    if (!overview)
        return null;
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(KpiCard, { title: "Total Revenue", value: formatCurrency(overview.kpis.totalRevenue), subtitle: `Realized: ${formatCurrency(overview.kpis.realizedRevenue)}`, icon: DollarSign, trend: overview.kpis.paidRate, trendLabel: "Paid Rate" }), _jsx(KpiCard, { title: "Total Orders", value: overview.kpis.totalOrders.toLocaleString(), subtitle: `${overview.kpis.codOrders} COD / ${overview.kpis.prepaidOrders} Prepaid`, icon: ShoppingCart }), _jsx(KpiCard, { title: "COD Return Rate", value: `${overview.kpis.codReturnRate.toFixed(1)}%`, subtitle: "Failed COD orders", icon: TrendingDown, tone: "danger" }), _jsx(KpiCard, { title: "Confirmation Rate", value: `${overview.kpis.confirmationRate.toFixed(1)}%`, subtitle: "COD orders confirmed", icon: CheckCircle, tone: "success" })] }));
};
const KpiCard = ({ title, value, subtitle, icon: Icon, tone = 'neutral', trend, trendLabel }) => {
    const toneColors = {
        neutral: 'text-[#8B5CF6] bg-[#8B5CF6]/20',
        success: 'text-green-400 bg-green-500/20',
        danger: 'text-red-400 bg-red-500/20',
    };
    return (_jsxs("div", { className: "bg-[#12163A] border border-[#1E223D] rounded-xl p-6 shadow-lg shadow-black/20", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[#E5E7EB]/60 text-sm font-medium", children: title }), _jsx("h3", { className: "text-2xl font-bold text-white mt-1", children: value })] }), _jsx("div", { className: `p-3 rounded-xl ${toneColors[tone]}`, children: _jsx(Icon, { size: 24 }) })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-xs text-[#E5E7EB]/40", children: subtitle }), trend !== undefined && (_jsxs("div", { className: "flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full", children: [_jsx(TrendingUp, { size: 12 }), _jsxs("span", { children: [trend.toFixed(1), "% ", trendLabel] })] }))] })] }));
};
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};
