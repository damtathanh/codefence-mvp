import { useState, useCallback } from 'react';
import type { Order } from '../../../types/supabase';

export const useOrderSelection = (filteredOrders: Order[]) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelectAll = useCallback(() => {
        const pageIds = filteredOrders.map((order) => order.id);
        const allSelectedOnPage = pageIds.every((id) => selectedIds.has(id));

        if (allSelectedOnPage) {
            // unselect all on current page
            const next = new Set(selectedIds);
            pageIds.forEach((id) => next.delete(id));
            setSelectedIds(next);
        } else {
            // select all on current page
            const next = new Set(selectedIds);
            pageIds.forEach((id) => next.add(id));
            setSelectedIds(next);
        }
    }, [selectedIds, filteredOrders]);

    const handleToggleSelect = useCallback((id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    }, [selectedIds]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    return {
        selectedIds,
        handleSelectAll,
        handleToggleSelect,
        clearSelection,
        setSelectedIds
    };
};
