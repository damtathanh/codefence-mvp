import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth';
import { fetchOrdersByUser, updateOrder as updateOrderService, UpdateOrderPayload, OrderFilters, fetchOrderFilterOptions } from '../services/ordersService';
import { fetchActiveProducts, SimpleProduct } from '../../products/services/productsService';
import type { Order } from '../../../types/supabase';
import { matchesStatusFilter, matchesPaymentMethodFilter, matchesRiskFilter } from '../utils/orderFilters';

export const useOrdersData = () => {
    const { user } = useAuth();

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [products, setProducts] = useState<SimpleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & Pagination State
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 50;

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [riskScoreFilter, setRiskScoreFilter] = useState<string[]>([]);
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState('');

    // Filter Options
    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [paymentMethodOptions, setPaymentMethodOptions] = useState<string[]>([]);

    // 1. Fetch Filter Options
    const fetchFilterOptions = useCallback(async () => {
        if (!user) {
            setStatusOptions([]);
            setPaymentMethodOptions([]);
            return;
        }
        try {
            const { statusOptions: statuses, paymentMethodOptions: paymentMethods } = await fetchOrderFilterOptions(user.id);
            setStatusOptions(statuses);
            setPaymentMethodOptions(paymentMethods);
        } catch (err) {
            console.error('Error fetching order filter options:', err);
        }
    }, [user]);

    // 2. Fetch Orders (Centralized)
    const fetchOrders = useCallback(async (
        overridePage?: number,
        overrideFilters?: OrderFilters
    ) => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const targetPage = overridePage ?? page;
            const currentFilters: OrderFilters = overrideFilters ?? {
                searchQuery,
                status: statusFilter,
                riskScore: riskScoreFilter,
                paymentMethod: paymentMethodFilter,
                date: dateFilter
            };

            const { orders: ordersData, totalCount: count, error: ordersError } = await fetchOrdersByUser(
                user.id,
                targetPage,
                PAGE_SIZE,
                currentFilters
            );

            if (ordersError) throw ordersError;

            const productsData = await fetchActiveProducts(user.id);

            setOrders(ordersData || []);
            setTotalCount(count);
            setProducts(productsData || []);

            // Only update page state if we successfully fetched a different page
            if (overridePage) setPage(overridePage);

        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError(err.message || 'Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, page, searchQuery, statusFilter, riskScoreFilter, paymentMethodFilter, dateFilter]);

    // 3. Initial Load & Filter Changes
    // We want to refetch when filters change, but NOT when they are just set initially if we can avoid double fetch.
    // However, simple useEffect on filters is easiest.
    useEffect(() => {
        fetchOrders(1); // Reset to page 1 on filter change
    }, [searchQuery, statusFilter, riskScoreFilter, paymentMethodFilter, dateFilter]);
    // Note: We intentionally exclude 'fetchOrders' from dependency to avoid loop, 
    // and we exclude 'page' because page changes are handled by setPage -> fetchOrders call in UI or separate effect? 
    // Actually, let's handle page changes separately or expose a handlePageChange.

    // Let's handle Page changes:
    useEffect(() => {
        // When page changes, we fetch that page (keeping current filters)
        // But wait, the above effect resets to page 1 on filter change.
        // We need to distinguish between filter change and page change.
        // For now, let's just expose a manual refresh and rely on the above effect for filters.
        // For pagination, the UI calls setPage, which should trigger fetch?
        // Or better: make fetchOrders the ONLY way to update data.
    }, []);

    // Helper: Apply Local Patch (Optimistic)
    const applyLocalOrderPatch = useCallback((orderId: string, patch: Partial<Order>) => {
        setOrders(prevOrders => {
            const orderIndex = prevOrders.findIndex(o => o.id === orderId);
            if (orderIndex === -1) return prevOrders;

            const originalOrder = prevOrders[orderIndex];
            const updatedOrder = { ...originalOrder, ...patch };

            const newOrders = [...prevOrders];
            newOrders[orderIndex] = updatedOrder;
            return newOrders;
        });
    }, []);

    // 4. Update Order (Optimistic)
    const updateOrderLocal = async (orderId: string, updates: UpdateOrderPayload) => {
        if (!user) return false;

        // 1. Snapshot previous state for rollback
        const previousOrders = [...orders];
        const previousTotal = totalCount;

        // 2. Optimistic Update
        // We need to convert UpdateOrderPayload (service) to Partial<Order> (local)
        // Some fields might need mapping if names differ, but they mostly match.
        applyLocalOrderPatch(orderId, updates as any);

        try {
            // 3. API Call
            const { data, error } = await updateOrderService(orderId, user.id, updates);
            if (error) throw error;

            // 4. Apply server response (e.g. updated_at, or calculated fields)
            if (data) {
                applyLocalOrderPatch(orderId, data);

                // Sync status options if new status appeared
                const nextStatus = data.status;
                if (nextStatus) {
                    setStatusOptions(prev =>
                        prev.includes(nextStatus) ? prev : [...prev, nextStatus].sort()
                    );
                }
            }
            return true;
        } catch (err) {
            console.error('Error updating order:', err);
            // 5. Rollback on error
            setOrders(previousOrders);
            setTotalCount(previousTotal);
            throw err;
        }
    };

    // Realtime subscription
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('orders_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    // We only handle UPDATEs to avoid list jumping on inserts/deletes
                    // Inserts/Deletes are handled by manual refresh or page navigation
                    if (payload.eventType === 'UPDATE') {
                        const newRow = payload.new as Order;
                        // Only apply if we have this order in current view
                        // applyLocalOrderPatch(newRow.id, newRow); 
                        // Actually, let's NOT auto-apply realtime updates for now 
                        // as it might conflict with optimistic updates or cause unexpected jumps.
                        // The requirement says "Do NOT refetch... Replace updated order".
                        // Our optimistic update handles the user's own actions.
                        // For external actions, we might want to update IF it's on screen.
                        setOrders(prev => {
                            const idx = prev.findIndex(o => o.id === newRow.id);
                            if (idx === -1) return prev;
                            // Update in place without moving
                            const next = [...prev];
                            next[idx] = { ...next[idx], ...newRow };
                            return next;
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Initial fetch
    useEffect(() => {
        fetchFilterOptions();
        // fetchOrders(1); // Handled by filter effect
    }, [fetchFilterOptions]);

    return {
        orders,
        products,
        loading,
        error,
        refreshOrders: () => fetchOrders(page), // Refresh current page
        updateOrderLocal,
        totalCount,
        page,
        setPage: (p: number) => {
            setPage(p);
            fetchOrders(p);
        },
        pageSize: PAGE_SIZE,

        // Filters
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        riskScoreFilter,
        setRiskScoreFilter,
        paymentMethodFilter,
        setPaymentMethodFilter,
        dateFilter,
        setDateFilter,

        // Options
        statusOptions,
        paymentMethodOptions,
    };
};
