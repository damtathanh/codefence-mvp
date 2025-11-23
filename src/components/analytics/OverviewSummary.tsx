import React from 'react';
import { DollarSign, ShoppingCart, TrendingDown, CheckCircle, TrendingUp } from 'lucide-react';
import type { OverviewAnalytics } from '../../features/analytics/services/overviewService';

interface OverviewSummaryProps {
    overview: OverviewAnalytics | null;
    loading: boolean;
}

export const OverviewSummary: React.FC<OverviewSummaryProps> = ({ overview, loading }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse border border-white/5" />
                ))}
            </div>
        );
    }

    if (!overview) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                title="Total Revenue"
                value={formatCurrency(overview.kpis.totalRevenue)}
                subtitle={`Realized: ${formatCurrency(overview.kpis.realizedRevenue)}`}
                icon={DollarSign}
                trend={overview.kpis.paidRate}
                trendLabel="Paid Rate"
            />
            <KpiCard
                title="Total Orders"
                value={overview.kpis.totalOrders.toLocaleString()}
                subtitle={`${overview.kpis.codOrders} COD / ${overview.kpis.prepaidOrders} Prepaid`}
                icon={ShoppingCart}
            />
            <KpiCard
                title="COD Return Rate"
                value={`${overview.kpis.codReturnRate.toFixed(1)}%`}
                subtitle="Failed COD orders"
                icon={TrendingDown}
                tone="danger"
            />
            <KpiCard
                title="Confirmation Rate"
                value={`${overview.kpis.confirmationRate.toFixed(1)}%`}
                subtitle="COD orders confirmed"
                icon={CheckCircle}
                tone="success"
            />
        </div>
    );
};

const KpiCard = ({ title, value, subtitle, icon: Icon, tone = 'neutral', trend, trendLabel }: any) => {
    const toneColors = {
        neutral: 'text-[#8B5CF6] bg-[#8B5CF6]/20',
        success: 'text-green-400 bg-green-500/20',
        danger: 'text-red-400 bg-red-500/20',
    };

    return (
        <div className="bg-[#12163A] border border-[#1E223D] rounded-xl p-6 shadow-lg shadow-black/20">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-[#E5E7EB]/60 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${toneColors[tone as keyof typeof toneColors]}`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xs text-[#E5E7EB]/40">{subtitle}</p>
                {trend !== undefined && (
                    <div className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                        <TrendingUp size={12} />
                        <span>{trend.toFixed(1)}% {trendLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};
