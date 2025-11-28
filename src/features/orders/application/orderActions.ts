import type { Order } from "../../../types/supabase";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { zaloGateway } from "../../zalo";
import { logUserAction } from "../../../utils/logUserAction";
import { generateChanges } from "../../../utils/generateChanges";
import { logOrderEvent } from "../services/orderEventsService";
import { deleteOrders, updateOrder } from "../services/ordersService";
import { ensurePendingInvoiceForOrder, markInvoicePaidForOrder } from "../../invoices/services/invoiceService";
import { LedgerService } from "../../ledger/services/ledgerService";

export const OrderActions = {
    async approveOrder(order: Order, userId: string) {
        await zaloGateway.sendConfirmation(order); // Mock call

        // Update status
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
            confirmation_sent_at: new Date().toISOString()
        });

        await logUserAction({
            userId: userId,
            action: 'Approve Order',
            status: 'success',
            orderId: order.order_id ?? "",
        });
    },

    async rejectOrder(order: Order, reason: string, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.ORDER_REJECTED,
            reject_reason: reason
        });

        await logOrderEvent(order.id, 'ORDER_REJECTED', { reason }, 'manual_action');
    },

    async flagVerification(order: Order, reason: string, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.VERIFICATION_REQUIRED,
            verification_reason: reason
        });

        await logOrderEvent(order.id, 'VERIFICATION_REQUIRED', { reason }, 'manual_action');
    },

    async simulateConfirmed(order: Order, userId: string) {
        const now = new Date().toISOString();
        // Update Order Status
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.CUSTOMER_CONFIRMED,
            customer_confirmed_at: now
        });

        // Automatically create Pending Invoice
        await ensurePendingInvoiceForOrder({ ...order, status: ORDER_STATUS.CUSTOMER_CONFIRMED });

        // Log event
        await logOrderEvent(order.id, 'QR_SENT', { desc: 'Sent after confirmation' }, 'simulation');
    },

    async simulateCancelled(order: Order, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.CUSTOMER_CANCELLED,
            cancelled_at: new Date().toISOString(),
            cancel_reason: 'Simulated: Customer changed mind'
        });
        await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { reason: 'Customer clicked Cancel on Zalo' }, 'simulation');
    },

    async simulatePaid(order: Order, userId: string) {
        // Update Invoice -> Paid. 
        // Also updates Order -> Paid_at. 
        // If Order is Delivering/Completed, status remains. If not, status -> ORDER_PAID.
        await markInvoicePaidForOrder(order);

        // Optimistic UI Update
        let nextStatus = order.status;
        if (order.status !== ORDER_STATUS.DELIVERING && order.status !== ORDER_STATUS.COMPLETED) {
            nextStatus = ORDER_STATUS.ORDER_PAID;
        }

        await updateOrder(order.id, userId, {
            status: nextStatus,
            paid_at: new Date().toISOString()
        });

        // P2: Record Payment in Ledger
        // We assume the payment amount is the full order amount for now.
        if (order.amount) {
            await LedgerService.recordPayment(userId, order.id, order.amount, { method: 'simulation' });
        }
    },

    async markShipped(order: Order, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.DELIVERING,
            shipped_at: new Date().toISOString(),
        });
        await logOrderEvent(order.id, 'ORDER_SHIPPED', {}, 'fulfillment');
    },

    async markCompleted(order: Order, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.COMPLETED,
            completed_at: new Date().toISOString(),
        });
        await logOrderEvent(order.id, 'ORDER_COMPLETED', {}, 'fulfillment');
    },

    async updateProduct(order: Order, productId: string, productName: string, userId: string) {
        const previousData = { product: order.product || 'N/A' };
        const updateData = { product: productName };
        const changes = generateChanges(previousData, updateData);

        await updateOrder(order.id, userId, { product_id: productId });

        await logUserAction({
            userId: userId,
            action: 'Update Order Product',
            status: 'success',
            orderId: order.order_id ?? "",
            details: Object.keys(changes).length > 0 ? changes : null,
        });
    },

    async deleteOrdersAction(orderIds: string[], ordersToDelete: Order[], userId: string) {
        const { error: deleteError } = await deleteOrders(userId, orderIds);
        if (deleteError) throw deleteError;

        // Note: Invoice deletion is now handled inside deleteOrders via repository/service layer
        // So we don't need to call deleteInvoicesByOrderIds here explicitly anymore.

        const logPromises = ordersToDelete.map(order =>
            logUserAction({
                userId: userId,
                action: 'Delete Order',
                status: 'success',
                orderId: order.order_id ?? "",
            })
        );
        await Promise.all(logPromises);
    }
};
