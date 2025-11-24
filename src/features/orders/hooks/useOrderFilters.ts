import { useState, useMemo, useEffect } from 'react';
import type { Order } from '../../../types/supabase';

export const useOrderFilters = (orders: Order[]) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [riskScoreFilter, setRiskScoreFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const term = searchQuery.trim().toLowerCase();

            const matchesSearch =
                term === '' ||
                (order.order_id?.toLowerCase().includes(term) ?? false) ||
                order.id.toLowerCase().includes(term) ||
                (order.customer_name?.toLowerCase().includes(term) ?? false) ||
                (order.phone?.toLowerCase().includes(term) ?? false);

            const matchesStatus =
                statusFilter === 'all' || order.status === statusFilter;

            const matchesRiskScore = (() => {
                if (riskScoreFilter === 'all') return true;
                if (order.risk_score === null || order.risk_score === undefined) {
                    return riskScoreFilter === 'all';
                }
                const score = order.risk_score;
                switch (riskScoreFilter) {
                    case 'low':
                        return score <= 30;
                    case 'medium':
                        return score > 30 && score <= 70;
                    case 'high':
                        return score > 70;
                    default:
                        return true;
                }
            })();

            const matchesPaymentMethod = (() => {
                if (paymentMethodFilter === 'all') return true;
                const method = order.payment_method || 'COD'; // null => COD
                return method === paymentMethodFilter;
            })();

            return (
                matchesSearch &&
                matchesStatus &&
                matchesRiskScore &&
                matchesPaymentMethod
            );
        });
    }, [orders, searchQuery, statusFilter, riskScoreFilter, paymentMethodFilter]);

    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [paymentMethodOptions, setPaymentMethodOptions] = useState<string[]>([]);

    // Grow union of statuses
    useEffect(() => {
        setStatusOptions((prev) => {
            const set = new Set(prev);
            for (const o of orders) {
                if (o.status) set.add(o.status);
            }
            return Array.from(set);
        });
    }, [orders]);

    // Grow union of payment methods
    useEffect(() => {
        setPaymentMethodOptions((prev) => {
            const set = new Set(prev);
            for (const o of orders) {
                if (o.payment_method) {
                    set.add(o.payment_method.toUpperCase());
                }
            }
            return Array.from(set);
        });
    }, [orders]);

    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setRiskScoreFilter('all');
        setPaymentMethodFilter('all');
    };

    return {
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        riskScoreFilter,
        setRiskScoreFilter,
        paymentMethodFilter,
        setPaymentMethodFilter,
        filteredOrders,
        statusOptions,
        paymentMethodOptions,
        clearAllFilters,
    };
};
