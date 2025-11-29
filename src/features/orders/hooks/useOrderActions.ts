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

    // 1. SHOP ACTION: Approve (High/Medium Risk -> Confirmation Sent)
    // Logic: Medium/High Risk approved -> Send Zalo confirmation immediately.
    const handleApprove = useCallback(async (order: Order, onSuccess?: () => void) => {
        if (!user) return;
        try {
            // Optional: Zalo confirmation trigger
            await zaloGateway.sendConfirmation(order);

            const now = new Date().toISOString();

            // 1️⃣ Log the "Order Approved" event (even if status does not stay on APPROVED)
            await logOrderEvent(order.id, 'ORDER_APPROVED', {}, 'manual_action');

            // 2️⃣ Update to ORDER_CONFIRMATION_SENT (final status)
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                confirmation_sent_at: now
            });

            // 3️⃣ Log the "order confirmation sent" event
            await logOrderEvent(
                order.id,
                'ORDER_CONFIRMATION_SENT',
                { via: 'zalo' },
                'system'
            );

            // 4️⃣ User action log
            await logUserAction({
                userId: user.id,
                action: 'Approve Order',
                status: 'success',
                orderId: order.order_id ?? "",
            });

            showSuccess('Order approved & confirmation sent.');
            if (onSuccess) onSuccess();

        } catch (err) {
            showError('Failed to approve order.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 2. SHOP ACTION: Reject / Verification Required
    const handleConfirmReject = useCallback(async (order: Order, reason: string, mode: 'VERIFICATION_REQUIRED' | 'ORDER_REJECTED', onSuccess?: () => void) => {
        if (!user) return;
        try {
            const nextStatus = mode === 'VERIFICATION_REQUIRED' ? ORDER_STATUS.VERIFICATION_REQUIRED : ORDER_STATUS.ORDER_REJECTED;
            const updateData: any = { status: nextStatus };

            if (mode === 'VERIFICATION_REQUIRED') updateData.verification_reason = reason;
            else updateData.reject_reason = reason;

            await updateOrderLocal(order.id, updateData);
            await logOrderEvent(order.id, mode, { reason }, 'manual_action');

            showSuccess(mode === 'VERIFICATION_REQUIRED' ? 'Order flagged for verification.' : 'Order rejected.');
            if (onSuccess) onSuccess();
        } catch (err) { showError('Failed to update order.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 3. CUSTOMER CONFIRMED (Create Invoice + Send QR)
    const handleSimulateConfirmed = useCallback(async (order: Order, onSuccess?: () => void) => {
        if (!user) return;
        try {
            const now = new Date().toISOString();

            // 1. Create Pending Invoice (Important for COD flow)
            await ensurePendingInvoiceForOrder({ ...order, status: ORDER_STATUS.CUSTOMER_CONFIRMED });

            // 2. Update Status
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.CUSTOMER_CONFIRMED,
                customer_confirmed_at: now
            });

            // 3. Log event
            await logOrderEvent(order.id, 'CUSTOMER_CONFIRMED', { method: 'simulation' }, 'simulation');
            await logOrderEvent(order.id, 'QR_SENT', { desc: 'Auto sent after confirmation' }, 'simulation');

            showSuccess('Customer Confirmed. Invoice Created. QR Sent.');
            if (onSuccess) onSuccess();
        } catch (e) { showError('Simulation failed.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 4. CUSTOMER CANCELLED
    const handleSimulateCancelled = useCallback(async (order: Order, reason: string, onSuccess?: () => void) => {
        if (!user) return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.CUSTOMER_CANCELLED,
                cancelled_at: new Date().toISOString(),
                cancel_reason: reason || 'Simulated cancellation'
            });
            await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { reason }, 'simulation');
            showSuccess('Order Cancelled by Customer.');
            if (onSuccess) onSuccess();
        } catch (e) { showError('Simulation failed.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 5. SIMULATE PAID (QR Scanned / COD Received)
    const handleSimulatePaid = useCallback(async (order: Order, onSuccess?: () => void) => {
        if (!user) return;
        try {
            // 1. Update Invoice -> Paid (Always)
            await markInvoicePaidForOrder(order);

            // 2. Logic: Only update status to ORDER_PAID if NOT currently Delivering or Completed
            // If delivering/completed, we just record payment but keep logistics status
            const currentStatus = order.status;
            let nextStatus = currentStatus;

            if (currentStatus !== ORDER_STATUS.DELIVERING && currentStatus !== ORDER_STATUS.COMPLETED) {
                nextStatus = ORDER_STATUS.ORDER_PAID;
            }

            await updateOrderLocal(order.id, {
                status: nextStatus,
                paid_at: new Date().toISOString()
            });

            await logUserAction({
                userId: user.id,
                action: 'Mark Paid',
                status: 'success',
                orderId: order.order_id ?? "",
                details: { from: currentStatus, to: nextStatus }
            });

            showSuccess('Payment Received. Invoice Updated.');
            if (onSuccess) onSuccess();
        } catch (e) { showError('Payment simulation failed.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 6. SEND QR LINK MANUALLY (For Low Risk)
    const handleSendQrLink = useCallback(async (order: Order, onSuccess?: () => void) => {
        if (!user) return;
        try {
            await logOrderEvent(order.id, 'QR_PAYMENT_LINK_SENT', { manual: true }, 'manual_action');
            // Optimistic update to trigger UI re-render if needed (e.g. tracking qr_sent_at)
            await updateOrderLocal(order.id, { qr_sent_at: new Date().toISOString() });

            showSuccess('QR Payment Link Sent.');
            if (onSuccess) onSuccess();
        } catch (e) { showError('Failed to send QR link.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 7. FULFILLMENT: Delivering
    const handleMarkShipped = useCallback(async (order: Order, onSuccess?: () => void) => {
        if (!user) return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.DELIVERING,
                shipped_at: new Date().toISOString(),
            });
            await logOrderEvent(order.id, 'ORDER_SHIPPED', {}, 'fulfillment');
            showSuccess('Order marked as Delivering.');
            if (onSuccess) onSuccess();
        } catch (err) { showError('Failed to update status.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 8. FULFILLMENT: Completed
    const handleMarkCompleted = useCallback(async (order: Order, onSuccess?: () => void) => {
        if (!user) return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.COMPLETED,
                completed_at: new Date().toISOString(),
            });
            await logOrderEvent(order.id, 'ORDER_COMPLETED', {}, 'fulfillment');
            showSuccess('Order marked as Completed.');
            if (onSuccess) onSuccess();
        } catch (err) { showError('Failed to complete order.'); }
    }, [user, updateOrderLocal, showSuccess, showError]);

    // 9. PRODUCT CORRECTION
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

    // 10. DELETE ORDERS
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
        handleSendQrLink,
        handleMarkShipped,
        handleMarkCompleted,
        handleProductCorrection,
        handleDeleteOrders
    };
};