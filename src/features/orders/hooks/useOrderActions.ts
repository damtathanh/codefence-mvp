import { useCallback } from 'react';
import { useAuth } from '../../auth';
import { useToast } from '../../../components/ui/Toast';
import type { Order } from '../../../types/supabase';
import { zaloGateway } from '../../zalo';
import { logUserAction } from '../../../utils/logUserAction';
import { generateChanges } from '../../../utils/generateChanges';
import { logOrderEvent } from '../services/orderEventsService';
import { deleteOrders } from '../services/ordersService';
import { deleteInvoicesByOrderIds, ensurePendingInvoiceForOrder, markInvoicePaidForOrder } from '../../invoices/services/invoiceService';
import { ORDER_STATUS } from '../../../constants/orderStatus';

export const useOrderActions = (
    updateOrderLocal: (orderId: string, updates: Partial<Order>) => Promise<boolean>,
    refreshOrders: () => Promise<void>
) => {
    const { user } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();

    // 1. SHOP ACTION: Approve (Send Zalo Confirmation)
    const handleApprove = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await zaloGateway.sendConfirmation(order); // Mock call

            // Update status
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                confirmation_sent_at: new Date().toISOString()
            });

            await logUserAction({
                userId: user.id,
                action: 'Approve Order',
                status: 'success',
                orderId: order.order_id ?? "",
            });

            showSuccess('Order approved. Confirmation sent via Zalo (Simulated).');
        } catch (err) {
            showError('Failed to approve order.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 2. SHOP ACTION: Reject / Verification Required
    const handleConfirmReject = useCallback(async (order: Order, reason: string, mode: 'VERIFICATION_REQUIRED' | 'ORDER_REJECTED') => {
        if (!user) return;
        try {
            const nextStatus = mode === 'VERIFICATION_REQUIRED' ? ORDER_STATUS.VERIFICATION_REQUIRED : ORDER_STATUS.ORDER_REJECTED;
            const updateData: any = { status: nextStatus };

            if (mode === 'VERIFICATION_REQUIRED') updateData.verification_reason = reason;
            else updateData.reject_reason = reason;

            await updateOrderLocal(order.id, updateData);

            // Log Event
            await logOrderEvent(order.id, mode, { reason }, 'manual_action');

            showSuccess(mode === 'VERIFICATION_REQUIRED' ? 'Order flagged for verification.' : 'Order rejected.');
        } catch (err) { showError('Failed to update order.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 3. SIMULATION: Customer Confirms (Create Pending Invoice + Send QR)
    const handleSimulateConfirmed = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            const now = new Date().toISOString();
            // Update Order Status
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.CUSTOMER_CONFIRMED,
                customer_confirmed_at: now
            });

            // Automatically create Pending Invoice
            await ensurePendingInvoiceForOrder({ ...order, status: ORDER_STATUS.CUSTOMER_CONFIRMED });

            // Log event
            await logOrderEvent(order.id, 'QR_SENT', { desc: 'Sent after confirmation' }, 'simulation');

            showSuccess('Simulated: Customer confirmed. Invoice created & QR Code sent.');
        } catch (e) { showError('Simulation failed.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 4. SIMULATION: Customer Cancels
    const handleSimulateCancelled = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.CUSTOMER_CANCELLED,
                cancelled_at: new Date().toISOString(),
                cancel_reason: 'Simulated: Customer changed mind'
            });
            await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { reason: 'Customer clicked Cancel on Zalo' }, 'simulation');
            showSuccess('Simulated: Customer cancelled order.');
        } catch (e) { showError('Simulation failed.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 5. SIMULATION: Customer Pays (QR Scan or COD Received)
    const handleSimulatePaid = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            // Update Invoice -> Paid. 
            // Also updates Order -> Paid_at. 
            // If Order is Delivering/Completed, status remains. If not, status -> ORDER_PAID.
            await markInvoicePaidForOrder(order);

            // Optimistic UI Update
            let nextStatus = order.status;
            if (order.status !== ORDER_STATUS.DELIVERING && order.status !== ORDER_STATUS.COMPLETED) {
                nextStatus = ORDER_STATUS.ORDER_PAID;
            }

            await updateOrderLocal(order.id, {
                status: nextStatus,
                paid_at: new Date().toISOString()
            });

            showSuccess('Payment received! Invoice marked as Paid.');
        } catch (e) { showError('Payment simulation failed.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 6. FULFILLMENT: Delivering
    const handleMarkShipped = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.DELIVERING,
                shipped_at: new Date().toISOString(),
            });
            await logOrderEvent(order.id, 'ORDER_SHIPPED', {}, 'fulfillment');
            showSuccess('Order marked as Delivering.');
        } catch (err) { showError('Failed to update status.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 7. FULFILLMENT: Completed
    const handleMarkCompleted = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.COMPLETED,
                completed_at: new Date().toISOString(),
            });
            await logOrderEvent(order.id, 'ORDER_COMPLETED', {}, 'fulfillment');
            showSuccess('Order marked as Completed.');
        } catch (err) { showError('Failed to complete order.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 8. PRODUCT CORRECTION
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
            showError('Failed to update product.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 9. DELETE ORDERS
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
            showError('Failed to delete orders.');
        }
    }, [user, refreshOrders, showSuccess, showError]);

    return {
        handleApprove,
        handleConfirmReject,
        handleSimulateConfirmed,
        handleSimulateCancelled,
        handleSimulatePaid,
        handleMarkShipped,
        handleMarkCompleted,
        handleProductCorrection,
        handleDeleteOrders
    };
};