import React, { useState } from 'react';
import { StatCard } from '../../../components/analytics/StatCard';
import { ChartCard } from '../../../components/analytics/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapPin, Shield, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface GeoTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const GeoTab: React.FC<GeoTabProps> = ({ dateRange, customFrom, customTo }) => {
    // TODO: Fetch real data based on dateRange
    const [selectedProvince, setSelectedProvince] = useState('all');
    const [selectedDistrict, setSelectedDistrict] = useState('all');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // TODO: Replace with real Supabase data
    const chartData: any[] = [];

    return (
        <div className="space-y-4">
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Highest-Risk Province"
                    value="–"
                    subtitle="–"
                    icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                />
                <StatCard
                    title="Safest Province"
                    value="–"
                    subtitle="–"
                    icon={<Shield className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="Sales by Top Province"
                    value={formatCurrency(0)}
                    subtitle="–"
                    icon={<DollarSign className="w-5 h-5 text-[#8B5CF6]" />}
                />
                <StatCard
                    title="Boom Rate (Top Province)"
                    value="–"
                    subtitle="–"
                    icon={<TrendingDown className="w-5 h-5 text-blue-400" />}
                />
            </div>

            {/* Row 2: Map & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Vietnam Risk Map" subtitle="Select province and district">
                    {/* TODO: Implement interactive Vietnam map with react-simple-maps or similar */}
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
                                <p className="text-xs text-white/40 mt-1">TODO: Implement interactive map</p>
                            </div>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Sales by Province" subtitle="Top 5 provinces">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                            <XAxis
                                type="number"
                                stroke="#E5E7EB"
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                            />
                            <YAxis type="category" dataKey="province" stroke="#E5E7EB" tick={{ fill: '#E5E7EB', fontSize: 11 }} width={100} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#12163A',
                                    border: '1px solid #1E223D',
                                    borderRadius: '8px',
                                    color: '#E5E7EB'
                                }}
                                formatter={(value: number, name) => [
                                    name === 'revenue' ? formatCurrency(value) : value,
                                    name === 'revenue' ? 'Revenue' : 'Orders'
                                ]}
                            />
                            <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};
