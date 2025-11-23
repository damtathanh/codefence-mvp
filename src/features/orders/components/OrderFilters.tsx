import React from 'react';
import { Filter, Plus } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PrimaryActionButton } from '../../../components/dashboard/PrimaryActionButton';
import { ORDER_STATUS } from '../../../constants/orderStatus';

interface OrderFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    riskScoreFilter: string;
    setRiskScoreFilter: (risk: string) => void;
    paymentMethodFilter: string;
    setPaymentMethodFilter: (method: string) => void;
    availableStatusOptions: Set<string>;
    availablePaymentMethods: Set<string>;
    onAddOrder: () => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    riskScoreFilter,
    setRiskScoreFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    availableStatusOptions,
    availablePaymentMethods,
    onAddOrder,
}) => {
    const statusOptions = Object.values(ORDER_STATUS).filter((status) =>
        availableStatusOptions.has(status)
    );

    const paymentOptions = Array.from(availablePaymentMethods);

    return (
        <Card className="flex-shrink-0">
            <CardHeader className="!pt-3 !pb-2 !px-4 flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <Filter className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                    <CardTitle className="text-base font-semibold text-white">
                        Filters
                    </CardTitle>
                </div>
                <PrimaryActionButton onClick={onAddOrder}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Order
                </PrimaryActionButton>
            </CardHeader>

            <CardContent className="!pt-0 !px-4 !pb-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Search */}
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search orders..."
                        className="h-10 bg-white/5 border-white/10 placeholder:text-white/40 text-sm"
                    />

                    {/* Status filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-sm text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        >
                            <option value="all">All Statuses</option>
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>

                    {/* Risk score filter */}
                    <div className="relative">
                        <select
                            value={riskScoreFilter}
                            onChange={(e) => setRiskScoreFilter(e.target.value)}
                            className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-sm text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        >
                            <option value="all">All Risk Levels</option>
                            <option value="low">Low Risk (0–30)</option>
                            <option value="medium">Medium Risk (31–70)</option>
                            <option value="high">High Risk (70+)</option>
                        </select>
                        <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>

                    {/* Payment method filter */}
                    <div className="relative">
                        <select
                            value={paymentMethodFilter}
                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-sm text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        >
                            <option value="all">All Payment Methods</option>
                            {paymentOptions.map((method) => (
                                <option key={method} value={method}>
                                    {method}
                                </option>
                            ))}
                        </select>
                        <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
