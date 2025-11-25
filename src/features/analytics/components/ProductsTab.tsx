import React from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { Package, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface ProductsTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, productStats } = useDashboardStats(dateRange, customFrom, customTo);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-white/60">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-red-400">Error loading analytics: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 min-h-0">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Top Product"
                    value={productStats.topProductByRevenue?.productName || "N/A"}
                    subtitle={productStats.topProductByRevenue
                        ? `Revenue: ${formatCurrency(productStats.topProductByRevenue.totalRevenue)}`
                        : "No data yet"}
                    icon={<Package className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
                <StatCard
                    title="Top Product Orders"
                    value={productStats.topProductByOrders?.orderCount || "N/A"}
                    subtitle={productStats.topProductByOrders?.productName || "No data yet"}
                    icon={<ShoppingCart className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Avg Revenue/Unit"
                    value={formatCurrency(productStats.avgRevenuePerUnit)}
                    subtitle="Per paid order"
                    icon={<DollarSign className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
                <StatCard
                    title="Product Boom Rate"
                    value={productStats.topBoomRateProduct ? `${productStats.topBoomRateProduct.boomRate}%` : "N/A"}
                    subtitle={productStats.topBoomRateProduct?.productName || "Min 10 COD orders required"}
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Top 5 Products by Orders" subtitle="Most popular products">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Product analytics coming soon</p>
                    </div>
                </ChartCard>

                <ChartCard title="Boom Rate by Product" subtitle="Top 5 products">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Boom rate analytics coming soon</p>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
