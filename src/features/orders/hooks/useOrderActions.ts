import { useCallback } from 'react';
import { useAuth } from '../../auth';
import { useToast } from '../../../components/ui/Toast';
import { Order } from '../../../types/supabase';
import { zaloGateway } from '../../zalo';
import { logUserAction } from '../../../utils/logUserAction';
import { generateChanges } from '../../../utils/generateChanges';
import { logOrderEvent } from '../services/orderEventsService';
import { deleteOrders } from '../services/ordersService';
import { deleteInvoicesByOrderIds } from '../../invoices/services/invoiceService';
import { ORDER_STATUS } from '../../../constants/orderStatus';

export const useOrderActions = (
    updateOrderLocal: (orderId: string, updates: Partial<Order>) => Promise<boolean>,
    refreshOrders: () => Promise<void>
) => {
    const { user } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();

    const handleApprove = useCallback(async (order: Order) => {
        if (!user) return;

        const rawMethod = order.payment_method || 'COD';
        const method = rawMethod.toUpperCase();

        if (method !== 'COD') {
            showInfo('Non-COD order is already paid. No confirmation needed.');
            return;
        }

        try {
            await zaloGateway.sendConfirmation(order);

            await logUserAction({
                userId: user.id,
                action: 'Approve Order (Send Confirmation)',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    order_id: order.order_id,
                    payment_method: method,
                },
            });

            await updateOrderLocal(order.id, { status: ORDER_STATUS.ORDER_CONFIRMATION_SENT } as Partial<Order>);
            showSuccess('Confirmation sent via mock Zalo OA');
        } catch (err) {
            console.error('Error sending confirmation:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to send confirmation';
            showError(errorMessage);

            await logUserAction({
                userId: user.id,
                action: 'Approve Order (Send Confirmation)',
                status: 'failed',
                orderId: order.order_id ?? "",
                details: {
                    order_id: order.order_id,
                    error: String(err),
                },
            });
        }
    }, [user, updateOrderLocal, showSuccess, showError, showInfo]);

    const handleConfirmReject = useCallback(async (
        order: Order,
        reason: string,
        mode: 'VERIFICATION_REQUIRED' | 'ORDER_REJECTED'
    ) => {
        if (!user) return;

        try {
            const nextStatus = mode === 'VERIFICATION_REQUIRED'
                ? ORDER_STATUS.VERIFICATION_REQUIRED
                : ORDER_STATUS.ORDER_REJECTED;

            const updateData: any = { status: nextStatus };
            if (mode === 'VERIFICATION_REQUIRED') {
                updateData.verification_reason = reason;
            } else {
                updateData.reject_reason = reason;
            }

            const previousData = { status: order.status };
            const changes = generateChanges(previousData, updateData);

            await updateOrderLocal(order.id, updateData);

            const eventType = mode === 'VERIFICATION_REQUIRED' ? 'VERIFICATION_REQUIRED' : 'REJECTED';
            const { error: eventError } = await logOrderEvent(
                order.id,
                eventType,
                { reason },
                'order_actions_hook'
            );

            if (eventError) throw eventError;

            await logUserAction({
                userId: user.id,
                action: mode === 'VERIFICATION_REQUIRED' ? 'Mark Order as Verification Required' : 'Reject Order',
                status: 'success',
                orderId: order.order_id ?? order.id,
                details: Object.keys(changes).length > 0 ? changes : null,
            });

            showSuccess(mode === 'VERIFICATION_REQUIRED' ? 'Order marked as Verification Required' : 'Order rejected successfully!');
        } catch (err) {
            console.error('Error handling reject/verification:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update order. Please try again.';
            showError(errorMessage);

            await logUserAction({
                userId: user.id,
                action: 'Reject Order',
                status: 'failed',
                orderId: order.order_id ?? '',
            });
            throw err;
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    const handleMarkShipped = useCallback(async (order: Order) => {
        if (!user) return;
        const now = new Date().toISOString();

        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.DELIVERING,
                shipped_at: now,
            });

            const { error: eventError } = await logOrderEvent(
                order.id,
                'ORDER_SHIPPED',
                { shipped_at: now },
                'order_actions_hook'
            );

            if (eventError) throw eventError;

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Delivering',
                status: 'success',
                orderId: order.order_id ?? '',
            });

            showSuccess('Order marked as Delivering');
        } catch (err) {
            console.error('Error marking order as delivering:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update order status.';
            showError(errorMessage);

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Delivering',
                status: 'failed',
                orderId: order.order_id ?? '',
            });
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    const handleMarkCompleted = useCallback(async (order: Order) => {
        if (!user) return;
        const now = new Date().toISOString();

        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.COMPLETED,
                completed_at: now,
            });

            const { error: eventError } = await logOrderEvent(
                order.id,
                'ORDER_COMPLETED',
                { completed_at: now },
                'order_actions_hook'
            );

            if (eventError) throw eventError;

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Completed',
                status: 'success',
                orderId: order.order_id ?? '',
            });

            showSuccess('Order marked as Completed');
        } catch (err) {
            console.error('Error marking order as completed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update order status.';
            showError(errorMessage);

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Completed',
                status: 'failed',
                orderId: order.order_id ?? '',
            });
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    const handleProductCorrection = useCallback(async (order: Order, productId: string, productName: string) => {
        if (!user) return;

        try {
            const previousData = { product: order.product || 'N/A' };
            const updateData = { product: productName };
            const changes = generateChanges(previousData, updateData);

            await updateOrderLocal(order.id, { product_id: productId });

            await logUserAction({
                userId: user.id,
                action: 'Update Order Product',
                status: 'success',
                orderId: order.order_id ?? "",
                details: Object.keys(changes).length > 0 ? changes : null,
            });

            showSuccess('Product updated successfully!');
        } catch (err) {
            console.error('Error updating product:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update product. Please try again.';
            showError(errorMessage);

            await logUserAction({
                userId: user.id,
                action: 'Update Order Product',
                status: 'failed',
                orderId: order.order_id ?? "",
            });
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    const handleDeleteOrders = useCallback(async (orderIds: string[], ordersToDelete: Order[]) => {
        if (!user || orderIds.length === 0) return;

        try {
            const { error: deleteError } = await deleteOrders(user.id, orderIds);
            if (deleteError) throw deleteError;

            try {
                await deleteInvoicesByOrderIds(user.id, orderIds);
            } catch (invoiceError) {
                console.error("Failed to delete related invoices", invoiceError);
            }

            const logPromises = ordersToDelete.map(order =>
                logUserAction({
                    userId: user.id,
                    action: 'Delete Order',
                    status: 'success',
                    orderId: order.order_id ?? "",
                })
            );
            await Promise.all(logPromises);

            await refreshOrders();
            showSuccess(`Successfully deleted ${orderIds.length} order${orderIds.length > 1 ? 's' : ''}!`);
        } catch (err) {
            console.error('Error deleting orders:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete orders. Please try again.';
            showError(errorMessage);

            const logPromises = ordersToDelete.map(order =>
                logUserAction({
                    userId: user.id,
                    action: 'Delete Order',
                    status: 'failed',
                    orderId: order.order_id ?? "",
                })
            );
            await Promise.all(logPromises);
            throw err;
        }
    }, [user, refreshOrders, showSuccess, showError]);

    return {
        handleApprove,
        handleConfirmReject,
        handleMarkShipped,
        handleMarkCompleted,
        handleProductCorrection,
        handleDeleteOrders
    };
};
