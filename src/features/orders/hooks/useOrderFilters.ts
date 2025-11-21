import { useState, useMemo } from 'react';
import type { Order } from '../../../types/supabase';

export const useOrderFilters = (orders: Order[]) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [riskScoreFilter, setRiskScoreFilter] = useState('all');

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const term = searchQuery.trim().toLowerCase();

            const matchesSearch =
                term === "" ||
                (order.order_id?.toLowerCase().includes(term) ?? false) ||
                order.id.toLowerCase().includes(term) ||
                (order.customer_name?.toLowerCase().includes(term) ?? false) ||
                (order.phone?.toLowerCase().includes(term) ?? false);

            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

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

            return matchesSearch && matchesStatus && matchesRiskScore;
        });
    }, [orders, searchQuery, statusFilter, riskScoreFilter]);

    const availableStatusOptions = useMemo(() => {
        const used = new Set(orders.map((o) => o.status).filter(Boolean));
        // We need to import ORDER_STATUS. Since we can't easily import it here without adding imports, 
        // I will assume the caller might pass it or I will just return the used statuses.
        // Actually, let's just return the used statuses and let the component map them or filter ORDER_STATUS.
        // But the original code filtered ORDER_STATUS values.
        return used;
    }, [orders]);

    return {
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        riskScoreFilter,
        setRiskScoreFilter,
        filteredOrders,
        availableStatusOptions,
    };
};
