import React from 'react';
import { Filter, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { PrimaryActionButton } from '../../../components/dashboard/PrimaryActionButton';
import { ORDER_STATUS } from '../../../constants/orderStatus';

interface OrderFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    riskScoreFilter: string;
    setRiskScoreFilter: (risk: string) => void;
    availableStatusOptions: Set<string>;
    onAddOrder: () => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    riskScoreFilter,
    setRiskScoreFilter,
    availableStatusOptions,
    onAddOrder,
}) => {
    const statusOptions = Object.values(ORDER_STATUS).filter((status) =>
        availableStatusOptions.has(status)
    );

    return (
        <Card className="flex-shrink-0">
            <CardHeader className="!pt-3 !pb-2 !px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter size={18} />
                        Filters
                    </CardTitle>
                    <PrimaryActionButton label="Add Order" onClick={onAddOrder} />
                </div>
            </CardHeader>
            <CardContent className="!pt-0 !px-4 !pb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 !py-2"
                    />
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        >
                            <option value="all">All Statuses</option>
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    <div className="relative">
                        <select
                            value={riskScoreFilter}
                            onChange={(e) => setRiskScoreFilter(e.target.value)}
                            className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        >
                            <option value="all">All Risk Levels</option>
                            <option value="low">Low Risk (0-30)</option>
                            <option value="medium">Medium Risk (31-70)</option>
                            <option value="high">High Risk (70+)</option>
                        </select>
                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
