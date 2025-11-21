import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CustomerStats } from '../services/customersService';
import type { Order } from '../../../types/supabase';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';

interface CustomerInsightPanelProps {
    customer: CustomerStats | null;
    orders: Order[];
    isOpen: boolean;
    onClose: () => void;
}

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};

const formatAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A";
    return amount.toLocaleString("vi-VN") + " ₫";
};

// Large Risk Badge Component
const LargeRiskBadge: React.FC<{ score: number | null }> = ({ score }) => {
    if (score === null || score === undefined) {
        return (
            <div className="px-4 py-1 rounded-lg border-2 border-gray-500/30 bg-gray-500/10">
                <span className="text-xl font-bold text-gray-400">N/A</span>
            </div>
        );
    }

    let colorClass = '';
    let label = '';

    if (score <= 30) {
        colorClass = 'border-green-500/50 bg-green-500/10 text-green-400';
        label = 'Low Risk';
    } else if (score <= 70) {
        colorClass = 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
        label = 'Medium Risk';
    } else {
        colorClass = 'border-red-500/50 bg-red-500/10 text-red-400';
        label = 'High Risk';
    }

    return (
        <div className={`px-4 py-1 rounded-lg border-2 ${colorClass}`}>
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{score.toFixed(0)}</span>
                <span className="text-sm font-medium opacity-80">{label}</span>
            </div>
        </div>
    );
};

export const CustomerInsightPanel: React.FC<CustomerInsightPanelProps> = ({
    customer,
    orders,
    isOpen,
    onClose,
}) => {
    // Compute derived stats
    const stats = useMemo(() => {
        if (!customer) return null;

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
        } else if (latest?.address) {
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
        } else if (customer.successCount > 0) {
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

    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="flex-1 bg-black/40" onClick={onClose} />

            {/* Side Panel */}
            <div className="w-full max-w-xl h-full bg-[#020617] border-l border-white/10 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-white truncate">
                            {customer.lastName || 'Customer'}
                        </h2>
                        <p className="text-sm text-white/50 mt-1">{customer.phone}</p>
                        <p className="text-sm text-white/60 mt-1 leading-relaxed">
                            {stats.address}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <LargeRiskBadge score={customer.customerRiskScore} />
                        <button
                            onClick={onClose}
                            className="text-white/50 hover:text-white text-3xl leading-none px-2 transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Behavior Signals Section */}
                    {stats.behaviorSignals.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                                Behavior Signals
                            </h3>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <ul className="space-y-2">
                                    {stats.behaviorSignals.map((signal, idx) => (
                                        <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>{signal}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Customer Profile Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
                            Customer Profile
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Total Amount Purchased */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <p className="text-xs text-white/50 mb-1">Total Purchase</p>
                                <p className="text-lg font-bold text-white">
                                    {formatAmount(stats.totalAmount)}
                                </p>
                            </div>

                            {/* Average Order Value */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <p className="text-xs text-white/50 mb-1">Avg Order Value</p>
                                <p className="text-lg font-bold text-white">
                                    {formatAmount(stats.aov)}
                                </p>
                            </div>

                            {/* Success Rate */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <p className="text-xs text-white/50 mb-1">Success Rate</p>
                                <p className="text-lg font-bold text-green-400">
                                    {stats.successRate.toFixed(1)}%
                                </p>
                            </div>

                            {/* Failed Rate */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <p className="text-xs text-white/50 mb-1">Failed Rate</p>
                                <p className="text-lg font-bold text-red-400">
                                    {stats.failedRate.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Order History Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
                            Order History ({orders.length})
                        </h3>
                        {orders.length === 0 ? (
                            <div className="bg-white/5 rounded-lg p-6 border border-white/10 text-center">
                                <p className="text-white/50">No orders for this customer yet.</p>
                            </div>
                        ) : (
                            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-white/5 border-b border-white/10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70">
                                                    Order ID
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70">
                                                    Amount
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70">
                                                    Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {orders.map((order) => (
                                                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-white/90">
                                                        {order.order_id || order.id.slice(0, 8)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-white/90">
                                                        {formatAmount(order.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <StatusBadge status={order.status} />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-white/70">
                                                        {formatDate(order.created_at)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
