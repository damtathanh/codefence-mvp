import { useState, useCallback } from 'react';
import type { Order } from '../../../types/supabase';

export const useOrderSelection = (filteredOrders: Order[]) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
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
