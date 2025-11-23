import { useState, useMemo } from 'react';
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

    const availableStatusOptions = useMemo(() => {
        const used = new Set<string>();
        for (const o of orders) {
            if (o.status) used.add(o.status);
        }
        return used;
    }, [orders]);

    const availablePaymentMethods = useMemo(() => {
        const used = new Set<string>();
        for (const o of orders) {
            const method = o.payment_method || 'COD';
            used.add(method);
        }
        return used;
    }, [orders]);

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
        availableStatusOptions,
        availablePaymentMethods,
    };
};
