import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';
const formatDate = (iso) => {
    if (!iso)
        return "N/A";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "N/A";
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};
const formatAmount = (amount) => {
    if (amount === null || amount === undefined)
        return "N/A";
    return amount.toLocaleString("vi-VN") + " ₫";
};
// Large Risk Badge Component
const LargeRiskBadge = ({ score }) => {
    if (score === null || score === undefined) {
        return (_jsx("div", { className: "px-4 py-1 rounded-lg border-2 border-gray-500/30 bg-gray-500/10", children: _jsx("span", { className: "text-xl font-bold text-gray-400", children: "N/A" }) }));
    }
    let colorClass = '';
    let label = '';
    if (score <= 30) {
        colorClass = 'border-green-500/50 bg-green-500/10 text-green-400';
        label = 'Low Risk';
    }
    else if (score <= 70) {
        colorClass = 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
        label = 'Medium Risk';
    }
    else {
        colorClass = 'border-red-500/50 bg-red-500/10 text-red-400';
        label = 'High Risk';
    }
    return (_jsx("div", { className: `px-4 py-1 rounded-lg border-2 ${colorClass}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl font-bold", children: score.toFixed(0) }), _jsx("span", { className: "text-sm font-medium opacity-80", children: label })] }) }));
};
export const CustomerInsightPanel = ({ customer, orders, isOpen, onClose, }) => {
    // Compute derived stats
    const stats = useMemo(() => {
        if (!customer)
            return null;
        const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const aov = customer.totalOrders > 0 ? totalAmount / customer.totalOrders : 0;
        const successRate = customer.totalOrders > 0 ? (customer.successCount / customer.totalOrders) * 100 : 0;
        const failedRate = customer.totalOrders > 0 ? (customer.failedCount / customer.totalOrders) * 100 : 0;
        // Get most recent order for address
        const latest = orders[0];
        let address = "No address available";
        const structured = [
            latest?.address_detail,
            latest?.ward,
            latest?.district,
            latest?.province
        ].filter(Boolean).join(", ");
        if (structured) {
            address = structured;
        }
        else if (latest?.address) {
            address = latest.address;
        }
        // Behavior signals
        const behaviorSignals = [];
        if (customer.successCount === 0) {
            behaviorSignals.push("No successful orders yet");
        }
        if (customer.failedCount > 0) {
            behaviorSignals.push(`${customer.failedCount} failed order${customer.failedCount > 1 ? 's' : ''}`);
        }
        if (address === "No address available") {
            behaviorSignals.push("Address unverified");
        }
        else if (customer.successCount > 0) {
            behaviorSignals.push("Verified customer");
        }
        return {
            totalAmount,
            aov,
            successRate,
            failedRate,
            address,
            behaviorSignals,
        };
    }, [customer, orders]);
    if (!isOpen || !customer || typeof document === 'undefined' || !stats) {
        return null;
    }
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-50 flex justify-end", children: [_jsx("div", { className: "flex-1 bg-black/40", onClick: onClose }), _jsxs("div", { className: "w-full max-w-xl h-full bg-[#020617] border-l border-white/10 flex flex-col", children: [_jsxs("div", { className: "px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h2", { className: "text-xl font-semibold text-white truncate", children: customer.fullName || 'Customer' }), _jsx("p", { className: "text-sm text-white/50 mt-1", children: customer.phone }), _jsx("p", { className: "text-sm text-white/60 mt-1 leading-relaxed", children: stats.address })] }), _jsxs("div", { className: "flex items-center gap-3 flex-shrink-0", children: [_jsx(LargeRiskBadge, { score: customer.customerRiskScore }), _jsx("button", { onClick: onClose, className: "text-white/50 hover:text-white text-3xl leading-none px-2 transition-colors", children: "\u00D7" })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-6 space-y-6", children: [stats.behaviorSignals.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-white/70 uppercase tracking-wider mb-3", children: "Behavior Signals" }), _jsx("div", { className: "bg-white/5 rounded-lg p-4 border border-white/10", children: _jsx("ul", { className: "space-y-2", children: stats.behaviorSignals.map((signal, idx) => (_jsxs("li", { className: "text-sm text-white/80 flex items-start gap-2", children: [_jsx("span", { className: "text-white/40 mt-0.5", children: "\u2022" }), _jsx("span", { children: signal })] }, idx))) }) })] })), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-white/70 uppercase tracking-wider mb-4", children: "Customer Profile" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "bg-white/5 rounded-lg p-4 border border-white/10", children: [_jsx("p", { className: "text-xs text-white/50 mb-1", children: "Total Purchase" }), _jsx("p", { className: "text-lg font-bold text-white", children: formatAmount(stats.totalAmount) })] }), _jsxs("div", { className: "bg-white/5 rounded-lg p-4 border border-white/10", children: [_jsx("p", { className: "text-xs text-white/50 mb-1", children: "Avg Order Value" }), _jsx("p", { className: "text-lg font-bold text-white", children: formatAmount(stats.aov) })] }), _jsxs("div", { className: "bg-white/5 rounded-lg p-4 border border-white/10", children: [_jsx("p", { className: "text-xs text-white/50 mb-1", children: "Success Rate" }), _jsxs("p", { className: "text-lg font-bold text-green-400", children: [stats.successRate.toFixed(1), "%"] })] }), _jsxs("div", { className: "bg-white/5 rounded-lg p-4 border border-white/10", children: [_jsx("p", { className: "text-xs text-white/50 mb-1", children: "Failed Rate" }), _jsxs("p", { className: "text-lg font-bold text-red-400", children: [stats.failedRate.toFixed(1), "%"] })] })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-semibold text-white/70 uppercase tracking-wider mb-4", children: ["Order History (", orders.length, ")"] }), orders.length === 0 ? (_jsx("div", { className: "bg-white/5 rounded-lg p-6 border border-white/10 text-center", children: _jsx("p", { className: "text-white/50", children: "No orders for this customer yet." }) })) : (_jsx("div", { className: "bg-white/5 rounded-lg border border-white/10 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-white/5 border-b border-white/10", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-white/70", children: "Order ID" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-white/70", children: "Amount" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-white/70", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-white/70", children: "Date" })] }) }), _jsx("tbody", { className: "divide-y divide-white/10", children: orders.map((order) => (_jsxs("tr", { className: "hover:bg-white/5 transition-colors", children: [_jsx("td", { className: "px-4 py-3 text-sm text-white/90", children: order.order_id || order.id.slice(0, 8) }), _jsx("td", { className: "px-4 py-3 text-sm text-white/90", children: formatAmount(order.amount) }), _jsx("td", { className: "px-4 py-3 text-sm", children: _jsx(StatusBadge, { status: order.status }) }), _jsx("td", { className: "px-4 py-3 text-sm text-white/70", children: formatDate(order.created_at) })] }, order.id))) })] }) }) }))] })] })] })] }), document.body);
};
