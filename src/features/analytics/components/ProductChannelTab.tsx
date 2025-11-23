import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useProductChannelAnalytics } from '../hooks/useProductChannelAnalytics';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';
import { Loader2, Package } from 'lucide-react';

interface ProductChannelTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const ProductChannelTab: React.FC<ProductChannelTabProps> = ({ dateRange, customFrom, customTo }) => {
    const { data, loading, error } = useProductChannelAnalytics({ dateRange, customFrom, customTo });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400">
                {error || "No data available"}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                    <p className="text-sm text-[#E5E7EB]/70">Boom rate by product</p>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data.productStats.slice(0, 10)}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" vertical={false} />
                                <XAxis dataKey="product_name" stroke="#E5E7EB" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#E5E7EB" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#EF4444" tick={{ fill: '#EF4444', fontSize: 12 }} tickLine={false} axisLine={false} unit="%" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#12163A', borderColor: '#1E223D', color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalOrders" fill="#8B5CF6" name="Total Orders" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="boomRate" fill="#EF4444" name="Boom Rate (%)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {data.channelStats.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Channel Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.channelStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" vertical={false} />
                                    <XAxis dataKey="channel" stroke="#E5E7EB" />
                                    <YAxis stroke="#E5E7EB" />
                                    <Tooltip contentStyle={{ backgroundColor: '#12163A', borderColor: '#1E223D', color: '#fff' }} />
                                    <Bar dataKey="totalOrders" fill="#8B5CF6" name="Orders" />
                                    <Bar dataKey="boomRate" fill="#EF4444" name="Boom Rate %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-[#E5E7EB]/40">
                    Channel data not available yet.
                </div>
            )}
        </div>
    );
};
