import React from 'react';
import { AlertCircle, Phone, User } from 'lucide-react';
import type { Order } from '../../../types/supabase';

interface HighRiskOrdersCardProps {
    orders: Order[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
};

const getRiskLevelColor = (level?: string | null) => {
    if (!level) return 'text-gray-400';
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

const getRiskLevelBg = (level?: string | null) => {
    if (!level) return 'bg-gray-500/10 border-gray-500/20';
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

export const HighRiskOrdersCard: React.FC<HighRiskOrdersCardProps> = ({ orders }) => {
    const topOrders = orders.slice(0, 3);

    return (
        <div className="bg-[#12163A] border border-[#1E223D] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-red-400" size={20} />
                <h3 className="text-lg font-semibold text-white">High-Risk Orders to Review</h3>
            </div>

            {topOrders.length === 0 ? (
                <div className="py-8 text-center text-[#E5E7EB]/40">
                    No high-risk orders pending review
                </div>
            ) : (
                <div className="space-y-3">
                    {topOrders.map((order) => (
                        <div
                            key={order.id}
                            className={`p-4 rounded-lg border ${getRiskLevelBg(order.risk_level)} hover:bg-white/5 transition cursor-pointer`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">#{order.order_id}</p>
                                    <p className="text-xs text-[#E5E7EB]/60 mt-0.5">{order.status}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(order.risk_level)}`}>
                                    {order.risk_level?.toUpperCase() || 'N/A'}
                                    {order.risk_score !== null && order.risk_score !== undefined && ` (${order.risk_score})`}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                {order.customer_name && (
                                    <div className="flex items-center gap-2 text-xs text-[#E5E7EB]/80">
                                        <User size={14} className="text-[#8B5CF6]" />
                                        <span>{order.customer_name}</span>
                                    </div>
                                )}
                                {order.phone && (
                                    <div className="flex items-center gap-2 text-xs text-[#E5E7EB]/80">
                                        <Phone size={14} className="text-[#8B5CF6]" />
                                        <span>{order.phone}</span>
                                    </div>
                                )}
                                <div className="text-sm font-semibold text-white mt-2">
                                    {formatCurrency(order.amount)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
