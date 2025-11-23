import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth';
import { fetchOrdersByUser, updateOrder as updateOrderService, UpdateOrderPayload, OrderFilters } from '../services/ordersService';
import { fetchActiveProducts, SimpleProduct } from '../../products/services/productsService';
import type { Order } from '../../../types/supabase';

export const useOrdersData = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 200;

    const [products, setProducts] = useState<SimpleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async (currentPage: number = 1, filters?: OrderFilters) => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { orders: ordersData, totalCount: count, error: ordersError } = await fetchOrdersByUser(
                user.id,
                currentPage,
                PAGE_SIZE,
                filters
            );

            if (ordersError) throw ordersError;

            const productsData = await fetchActiveProducts(user.id);

            setOrders(ordersData || []);
            setTotalCount(count);
            setPage(currentPage);
            setProducts(productsData || []);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError(err.message || 'Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Removed auto-fetch useEffect to allow View to control fetching with filters
    // useEffect(() => {
    //     fetchOrders();
    // }, [fetchOrders]);

    // Realtime subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('orders_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const newRow = payload.new as Order | null;

                    switch (payload.eventType) {
                        case 'INSERT':
                        case 'DELETE':
                        case 'INSERT':
                        case 'DELETE':
                            // For now, we don't auto-refetch on realtime events to avoid resetting pagination/filters unexpectedly
                            // or we could refetch current page:
                            // fetchOrders(page); 
                            // But we don't have access to current filters here easily without state.
                            // Let's leave it manual or rely on parent re-render.
                            break;
                            break;
                        case 'UPDATE':
                            if (!newRow) return;
                            setOrders((prev) => {
                                const exists = prev.some((o) => o.id === newRow.id);
                                if (!exists) return prev;
                                return prev.map((o) => (o.id === newRow.id ? { ...o, ...newRow } : o));
                            });
                            break;
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchOrders]);

    const updateOrderLocal = async (orderId: string, updates: UpdateOrderPayload) => {
        if (!user) return false;
        try {
            const { data, error } = await updateOrderService(orderId, user.id, updates);
            if (error) throw error;

            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? { ...order, ...updates, ...(data ?? {}) }
                        : order
                )
            );
            return true;
        } catch (err) {
            console.error('Error updating order:', err);
            throw err;
        }
    };

    return {
        orders,
        products,
        loading,
        error,
        refreshOrders: fetchOrders,
        updateOrderLocal,
        setOrders, // Exposed for optimistic updates if needed
        totalCount,
        page,
        pageSize: PAGE_SIZE,
        setPage,
    };
};
