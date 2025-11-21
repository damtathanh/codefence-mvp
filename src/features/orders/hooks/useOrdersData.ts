import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth';
import { fetchOrdersByUser, updateOrder as updateOrderService, UpdateOrderPayload } from '../services/ordersService';
import { fetchActiveProducts, SimpleProduct } from '../../products/services/productsService';
import type { Order } from '../../../types/supabase';

export const useOrdersData = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<SimpleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: ordersData, error: ordersError } = await fetchOrdersByUser(user.id);
            if (ordersError) throw ordersError;

            const productsData = await fetchActiveProducts(user.id);

            setOrders(ordersData || []);
            setProducts(productsData || []);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError(err.message || 'Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

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
                            fetchOrders();
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
    };
};
