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
import { MultiSelectFilter } from '../../../components/filters/MultiSelectFilter';

interface OrderFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string[];
    setStatusFilter: (status: string[]) => void;
    riskScoreFilter: string[];
    setRiskScoreFilter: (risk: string[]) => void;
    paymentMethodFilter: string[];
    setPaymentMethodFilter: (method: string[]) => void;
    statusOptions: string[];
    paymentOptions: string[];
    onAddOrder: () => void;
    onClearFilters?: () => void;
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
    statusOptions,
    paymentOptions,
    onAddOrder,
    onClearFilters,
}) => {
    return (
        <Card className="flex-shrink-0">
            <CardHeader className="!pt-3 !pb-2 !px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter size={18} />
                        Filters
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {onClearFilters && (
                            <button
                                type="button"
                                onClick={onClearFilters}
                                className="text-xs sm:text-sm text-white/60 hover:text-white underline-offset-2 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                        <PrimaryActionButton onClick={onAddOrder}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Order
                        </PrimaryActionButton>
                    </div>
                </div>
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
                    <MultiSelectFilter
                        label="Statuses"
                        options={statusOptions.map(s => ({ value: s, label: s }))}
                        selectedValues={statusFilter}
                        onChange={setStatusFilter}
                    />

                    {/* Risk score filter */}
                    <MultiSelectFilter
                        label="Risk Levels"
                        options={[
                            { value: 'low', label: 'Low Risk (0–30)' },
                            { value: 'medium', label: 'Medium Risk (31–70)' },
                            { value: 'high', label: 'High Risk (70+)' },
                        ]}
                        selectedValues={riskScoreFilter}
                        onChange={setRiskScoreFilter}
                    />

                    {/* Payment method filter */}
                    <MultiSelectFilter
                        label="Payment Methods"
                        options={paymentOptions.map(m => ({ value: m, label: m }))}
                        selectedValues={paymentMethodFilter}
                        onChange={setPaymentMethodFilter}
                    />
                </div>
            </CardContent>
        </Card>
    );
};
