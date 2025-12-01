import type { Order } from "../../../types/supabase";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { zaloGateway } from "../../zalo";
import { logUserAction } from "../../../utils/logUserAction";
import { generateChanges } from "../../../utils/generateChanges";
import { logOrderEvent } from "../services/orderEventsService";
import { deleteOrders, updateOrder } from "../services/ordersService";
import { ensurePendingInvoiceForOrder } from "../../invoices/services/invoiceService";
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
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
            }
        });
    },

    async rejectOrder(order: Order, reason: string, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.ORDER_REJECTED,
            reject_reason: reason
        });

        await logOrderEvent(order.id, 'ORDER_REJECTED', { reason }, 'manual_action');

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.ORDER_REJECTED,
                reason: reason,
            }
        });
    },

    async flagVerification(order: Order, reason: string, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.VERIFICATION_REQUIRED,
            verification_reason: reason
        });

        await logOrderEvent(order.id, 'VERIFICATION_REQUIRED', { reason }, 'manual_action');

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.VERIFICATION_REQUIRED,
                reason: reason,
            }
        });
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

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.CUSTOMER_CONFIRMED,
            }
        });
    },

    async simulateCancelled(order: Order, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.CUSTOMER_CANCELLED,
            cancelled_at: new Date().toISOString(),
            cancel_reason: 'Simulated: Customer changed mind'
        });
        await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { reason: 'Customer clicked Cancel on Zalo' }, 'simulation');

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.CUSTOMER_CANCELLED,
                reason: 'Simulated: Customer changed mind',
            }
        });
    },

    async simulatePaid(order: Order, userId: string) {
        // Xác định status sau khi đã thu tiền
        // Nếu đang Delivering/Completed thì giữ nguyên,
        // ngược lại set ORDER_PAID
        let nextStatus = order.status;
        if (
            order.status !== ORDER_STATUS.DELIVERING &&
            order.status !== ORDER_STATUS.COMPLETED
        ) {
            nextStatus = ORDER_STATUS.ORDER_PAID;
        }

        // Cập nhật Order: status + paid_at
        await updateOrder(order.id, userId, {
            status: nextStatus,
            paid_at: new Date().toISOString(),
        });

        // Ghi nhận Payment vào Ledger (vẫn giữ behavior cũ)
        if (order.amount) {
            await LedgerService.recordPayment(userId, order.id, order.amount, {
                method: "simulation", // Simulate QR Paid / Payment Received
            });
        }

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: nextStatus,
                payment_status: nextStatus === ORDER_STATUS.ORDER_PAID ? 'UNPAID → PAID' : undefined,
                payment_method: 'simulation',
            }
        });
    },

    async markShipped(order: Order, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.DELIVERING,
            shipped_at: new Date().toISOString(),
        });
        await logOrderEvent(order.id, 'ORDER_SHIPPED', {}, 'fulfillment');

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.DELIVERING,
            }
        });
    },

    async markCompleted(order: Order, userId: string) {
        await updateOrder(order.id, userId, {
            status: ORDER_STATUS.COMPLETED,
            completed_at: new Date().toISOString(),
        });
        await logOrderEvent(order.id, 'ORDER_COMPLETED', {}, 'fulfillment');

        await logUserAction({
            userId: userId,
            action: 'Update Order Status',
            status: 'success',
            orderId: order.order_id ?? "",
            details: {
                status_from: order.status,
                status_to: ORDER_STATUS.COMPLETED,
            }
        });
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
                details: {
                    status_from: order.status,
                    status_to: 'DELETED',
                }
            })
        );
        await Promise.all(logPromises);
    }
};
