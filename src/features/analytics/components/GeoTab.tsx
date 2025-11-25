import React, { useState } from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { MapPin, Shield, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import { useDashboardStats, type DashboardDateRange } from '../../dashboard/useDashboardStats';

interface GeoTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const GeoTab: React.FC<GeoTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { loading, error, geoRiskStats } = useDashboardStats(dateRange, customFrom, customTo);
    const [selectedProvince, setSelectedProvince] = useState('all');
    const [selectedDistrict, setSelectedDistrict] = useState('all');

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
                    title="Highest-Risk Province"
                    value={geoRiskStats.highestRiskProvince?.province || "N/A"}
                    subtitle={geoRiskStats.highestRiskProvince
                        ? `Avg risk: ${geoRiskStats.highestRiskProvince.avgRiskScore?.toFixed(1)} (${geoRiskStats.highestRiskProvince.orderCount} orders)`
                        : "No data yet"}
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                    valueColor="#f87171"
                />
                <StatCard
                    title="Safest Province"
                    value={geoRiskStats.safestProvince?.province || "N/A"}
                    subtitle={geoRiskStats.safestProvince
                        ? `Avg risk: ${geoRiskStats.safestProvince.avgRiskScore?.toFixed(1)} (${geoRiskStats.safestProvince.orderCount} orders)`
                        : "No data yet"}
                    icon={<Shield className="w-5 h-5 text-green-400" />}
                    valueColor="#4ade80"
                />
                <StatCard
                    title="Sales by Top Province"
                    value={geoRiskStats.topRevenueProvince ? formatCurrency(geoRiskStats.topRevenueProvince.totalRevenue) : "N/A"}
                    subtitle={geoRiskStats.topRevenueProvince?.province || "No data yet"}
                    icon={<DollarSign className="w-5 h-5 text-[#8B5CF6]" />}
                    valueColor="#8B5CF6"
                />
                <StatCard
                    title="Boom Rate (Top Province)"
                    value="N/A"
                    subtitle="Coming soon"
                    icon={<TrendingDown className="w-5 h-5 text-blue-400" />}
                    valueColor="#60a5fa"
                />
            </div>

            {/* Row 2: Map & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Vietnam Risk Map" subtitle="Select province and district">
                    <div className="flex flex-col h-full">
                        <div className="flex gap-2 mb-3">
                            <select
                                value={selectedProvince}
                                onChange={(e) => setSelectedProvince(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-[#12163A] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                            >
                                <option value="all">All Provinces</option>
                                <option value="hcm">Hồ Chí Minh</option>
                                <option value="hn">Hà Nội</option>
                                <option value="dn">Đà Nẵng</option>
                            </select>
                            <select
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-[#12163A] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                            >
                                <option value="all">All Districts</option>
                                <option value="1">District 1</option>
                                <option value="2">District 2</option>
                                <option value="3">District 3</option>
                            </select>
                        </div>

                        {/* Placeholder for Vietnam map */}
                        <div className="flex-1 bg-gradient-to-br from-[#12163A] to-[#1E223D] rounded-lg border border-white/5 flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="w-12 h-12 text-[#8B5CF6] mx-auto mb-2" />
                                <p className="text-sm text-white/60">Vietnam Risk Map</p>
                                <p className="text-xs text-white/40 mt-1">Geo analytics coming soon</p>
                            </div>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Sales by Province" subtitle="Top 5 provinces">
                    <div className="flex items-center justify-center h-full min-h-[300px] text-white/40">
                        <p>Geo analytics coming soon</p>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
