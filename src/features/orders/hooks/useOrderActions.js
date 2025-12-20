import { useCallback } from 'react';
import { useAuth } from '../../auth';
import { useToast } from '../../../components/ui/Toast';
import { zaloGateway } from '../../zalo';
import { logUserAction } from '../../../utils/logUserAction';
import { generateChanges } from '../../../utils/generateChanges';
import { logOrderEvent } from '../services/orderEventsService';
import { deleteOrders } from '../services/ordersService';
import { ensurePendingInvoiceForOrder, markInvoicePaidForOrder } from '../../invoices/services/invoiceService';
import { ORDER_STATUS } from '../../../constants/orderStatus';
export const useOrderActions = (updateOrderLocal, refreshOrders) => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    // 1. SHOP ACTION: Approve (High/Medium Risk -> ONLY "Order Approved")
    const handleApprove = useCallback(async (order, onSuccess) => {
        if (!user)
            return;
        try {
            const previousStatus = order.status;
            const now = new Date().toISOString();
            // ❌ Không gửi QR ở đây nữa
            // await zaloGateway.sendConfirmation(order);
            // 1️⃣ Log event "ORDER_APPROVED"
            await logOrderEvent(order.id, 'ORDER_APPROVED', {}, 'manual_action');
            // 2️⃣ Cập nhật status -> ORDER_APPROVED
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.ORDER_APPROVED,
                approved_at: now, // nếu DB chưa có cột approved_at thì xoá dòng này
            });
            // 3️⃣ History log
            await logUserAction({
                userId: user.id,
                action: 'Approve Order',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: previousStatus,
                    status_to: ORDER_STATUS.ORDER_APPROVED,
                },
            });
            showSuccess('Order approved.');
            if (onSuccess)
                onSuccess();
        }
        catch (err) {
            showError('Failed to approve order.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 2. SHOP ACTION: Reject / Verification Required
    const handleConfirmReject = useCallback(async (order, reason, mode, onSuccess) => {
        if (!user)
            return;
        try {
            // Lý do lấy 100% từ modal
            const finalReason = (reason || "").trim();
            if (!finalReason) {
                // Phòng hờ nếu ai đó gọi hàm này mà quên truyền reason
                showError("Reason is required.");
                return;
            }
            const nextStatus = mode === "VERIFICATION_REQUIRED"
                ? ORDER_STATUS.VERIFICATION_REQUIRED
                : ORDER_STATUS.ORDER_REJECTED;
            const updateData = { status: nextStatus };
            if (mode === "VERIFICATION_REQUIRED") {
                updateData.verification_reason = finalReason;
            }
            else {
                updateData.reject_reason = finalReason;
            }
            await updateOrderLocal(order.id, updateData);
            await logOrderEvent(order.id, mode, { reason: finalReason }, "manual_action");
            await logUserAction({
                userId: user.id,
                action: mode === "VERIFICATION_REQUIRED" ? "Flag Verification" : "Reject Order",
                status: "success",
                orderId: order.order_id ?? "",
                details: {
                    status_from: order.status,
                    status_to: nextStatus,
                    reason: finalReason,
                },
            });
            showSuccess(mode === "VERIFICATION_REQUIRED"
                ? "Order flagged for verification."
                : "Order rejected.");
            if (onSuccess)
                onSuccess();
        }
        catch (err) {
            showError("Failed to update order.");
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 3. CUSTOMER CONFIRMED (Create Invoice + Send QR)
    const handleSimulateConfirmed = useCallback(async (order, onSuccess) => {
        if (!user)
            return;
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
            await logUserAction({
                userId: user.id,
                action: 'Update Order Status',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.CUSTOMER_CONFIRMED,
                },
            });
            showSuccess('Customer Confirmed. Invoice Created. QR Sent.');
            if (onSuccess)
                onSuccess();
        }
        catch (e) {
            showError('Simulation failed.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 4. CUSTOMER CANCELLED
    const handleSimulateCancelled = useCallback(async (order, reason, onSuccess) => {
        if (!user)
            return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.CUSTOMER_CANCELLED,
                cancelled_at: new Date().toISOString(),
                cancel_reason: reason || 'Simulated cancellation'
            });
            await logOrderEvent(order.id, 'CUSTOMER_CANCELLED', { reason }, 'simulation');
            const finalReason = reason || 'Simulated cancellation';
            await logUserAction({
                userId: user.id,
                action: 'Update Order Status',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.CUSTOMER_CANCELLED,
                    reason: finalReason,
                },
            });
            showSuccess('Order Cancelled by Customer.');
            if (onSuccess)
                onSuccess();
        }
        catch (e) {
            showError('Simulation failed.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 5. SIMULATE PAID (QR Scanned / COD Received)
    const handleSimulatePaid = useCallback(async (order, onSuccess) => {
        if (!user)
            return;
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
                details: {
                    status_from: currentStatus,
                    status_to: nextStatus,
                    payment_status: 'UNPAID → PAID',
                    payment_method: order.payment_method || 'COD',
                    source: 'OrdersPage',
                },
            });
            showSuccess('Payment Received. Invoice Updated.');
            if (onSuccess)
                onSuccess();
        }
        catch (e) {
            showError('Payment simulation failed.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 6. SEND QR LINK (Low risk + Medium/High after Approved) -> Confirmation Sent
    const handleSendQrLink = useCallback(async (order, onSuccess) => {
        if (!user)
            return;
        try {
            const previousStatus = order.status;
            const now = new Date().toISOString();
            // Xác định risk level từ order
            const riskLevel = order.risk_level;
            const riskScore = order.risk_score;
            const effectiveRiskLevel = riskLevel ||
                (riskScore !== undefined
                    ? riskScore <= 40
                        ? 'low'
                        : riskScore <= 70
                            ? 'medium'
                            : 'high'
                    : 'medium');
            // Gửi tin nhắn qua mock Zalo (không quan trọng là có QR hay không, chỉ để log)
            await zaloGateway.sendConfirmation(order);
            // 2️⃣ Nếu LOW RISK → gửi luôn QR + log QR_PAYMENT_LINK_SENT
            if (effectiveRiskLevel === 'low') {
                await logOrderEvent(order.id, 'QR_PAYMENT_LINK_SENT', { manual: true, risk_level: effectiveRiskLevel }, 'manual_action');
            }
            // 3️⃣ Cập nhật status -> ORDER_CONFIRMATION_SENT
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                qr_sent_at: effectiveRiskLevel === 'low' ? now : undefined,
                confirmation_sent_at: now,
            }); // nếu Order type chưa có các cột này thì cast as any cho nhanh
            // 4️⃣ History log
            await logUserAction({
                userId: user.id,
                action: 'Send QR Payment Link',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: previousStatus,
                    status_to: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                    risk_level: effectiveRiskLevel,
                    source: 'OrdersPage',
                },
            });
            showSuccess(effectiveRiskLevel === 'low'
                ? 'QR Payment Link sent to customer.'
                : 'Order confirmation sent via Zalo.');
            if (onSuccess)
                onSuccess();
        }
        catch (e) {
            showError('Failed to send QR link.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 7. FULFILLMENT: Delivering
    const handleMarkShipped = useCallback(async (order, onSuccess) => {
        if (!user)
            return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.DELIVERING,
                shipped_at: new Date().toISOString(),
            });
            await logOrderEvent(order.id, 'ORDER_SHIPPED', {}, 'fulfillment');
            await logUserAction({
                userId: user.id,
                action: 'Update Order Status',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.DELIVERING,
                },
            });
            showSuccess('Order marked as Delivering.');
            if (onSuccess)
                onSuccess();
        }
        catch (err) {
            showError('Failed to update status.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 8. FULFILLMENT: Completed
    const handleMarkCompleted = useCallback(async (order, onSuccess) => {
        if (!user)
            return;
        try {
            await updateOrderLocal(order.id, {
                status: ORDER_STATUS.COMPLETED,
                completed_at: new Date().toISOString(),
            });
            await logOrderEvent(order.id, 'ORDER_COMPLETED', {}, 'fulfillment');
            await logUserAction({
                userId: user.id,
                action: 'Update Order Status',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.COMPLETED,
                },
            });
            showSuccess('Order marked as Completed.');
            if (onSuccess)
                onSuccess();
        }
        catch (err) {
            showError('Failed to complete order.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 9. PRODUCT CORRECTION
    const handleProductCorrection = useCallback(async (order, productId, productName) => {
        if (!user)
            return;
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
        }
        catch (err) {
            showError('Failed to update product.');
        }
    }, [user, updateOrderLocal, showSuccess, showError]);
    // 10. DELETE ORDERS
    const handleDeleteOrders = useCallback(async (orderIds, ordersToDelete) => {
        if (!user || orderIds.length === 0)
            return;
        try {
            const { error: deleteError } = await deleteOrders(user.id, orderIds);
            if (deleteError)
                throw deleteError;
            // ❌ Không cần xoá invoices ở FE nữa – BE đã làm rồi
            // try {
            //     await deleteInvoicesByOrderIds(user.id, orderIds);
            // } catch (invoiceError) {
            //     console.error("Failed to delete related invoices", invoiceError);
            // }
            const logPromises = ordersToDelete.map(order => logUserAction({
                userId: user.id,
                action: 'Delete Order',
                status: 'success',
                orderId: order.order_id ?? "",
                details: {
                    status_from: order.status,
                    status_to: 'DELETED',
                },
            }));
            await Promise.all(logPromises);
            await refreshOrders();
            showSuccess(`Successfully deleted ${orderIds.length} order${orderIds.length > 1 ? 's' : ''}!`);
        }
        catch (err) {
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
