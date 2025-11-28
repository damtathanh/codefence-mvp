import { useCallback } from 'react';
import { useAuth } from '../../auth';
import { useToast } from '../../../components/ui/Toast';
import type { Order } from '../../../types/supabase';
import { OrderActions } from '../application/orderActions';

export const useOrderActions = (
    updateOrderLocal: (orderId: string, updates: Partial<Order>) => Promise<boolean>,
    refreshOrders: () => Promise<void>
) => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    // 1. SHOP ACTION: Approve (Send Zalo Confirmation)
    const handleApprove = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await OrderActions.approveOrder(order, user.id);
            // We still need to update local state to reflect changes immediately if possible, 
            // but updateOrderLocal is passed in.
            // OrderActions calls updateOrder service which updates DB.
            // updateOrderLocal updates UI state.
            // We should probably call updateOrderLocal with the changes we expect.
            // Or rely on refreshOrders.
            // The original code called updateOrderLocal.
            // Let's keep calling updateOrderLocal for optimistic/immediate feedback if the hook consumer expects it.
            // However, OrderActions doesn't return the updated order.
            // But we know what we changed.

            // Actually, updateOrderLocal in the original code called the service AND updated local state?
            // Let's check the signature. It returns Promise<boolean>.
            // Usually passed from OrdersView -> useOrders -> updateOrder (which calls service).
            // If we move service calls to OrderActions, then updateOrderLocal might be redundant for the DB call part,
            // but we still need it for local state update.

            // Wait, if `updateOrderLocal` calls the service, and `OrderActions` ALSO calls the service, we have a double call.
            // The goal is: "Move business logic out of UI hooks/components into these application functions".
            // So `useOrderActions` should call `OrderActions`.
            // `OrderActions` calls `ordersService`.
            // So `updateOrderLocal` should ONLY update local state?
            // Or `useOrderActions` should NOT use `updateOrderLocal` for DB calls anymore.

            // But `updateOrderLocal` is passed as an argument.
            // If the caller (OrdersView) expects `updateOrderLocal` to persist data, then we have a conflict if we also persist in `OrderActions`.

            // Let's look at how `updateOrderLocal` is implemented in `OrdersView` or `useOrders`.
            // Typically `const { updateOrder } = useOrders()`.
            // `updateOrder` in `useOrders` calls `ordersService.updateOrder` AND updates local state.

            // If we switch to `OrderActions`, we are bypassing `useOrders.updateOrder`.
            // So we need to refresh data or manually update local state.
            // `refreshOrders` is passed in.

            // Strategy: Call `OrderActions` (DB update), then `refreshOrders` (or `updateOrderLocal` if it supports optimistic only).
            // But `updateOrderLocal` likely does DB update.

            // Let's assume for this refactor that we should use `OrderActions` for the logic.
            // And we might need to trigger a refresh.
            // The original code used `updateOrderLocal` which likely did both.

            // If I change `handleApprove` to use `OrderActions.approveOrder`, I am doing the DB update there.
            // I should NOT call `updateOrderLocal` if it also does DB update.
            // Instead, I should call `refreshOrders()` to get the latest state.
            // OR, if I want to keep optimistic updates, I need a way to update local state without DB call.

            // Given the constraints "The app should behave identically", removing optimistic updates might be a regression if `refreshOrders` is slow.
            // However, `updateOrderLocal` was passed in.

            // Let's check `useOrders.ts` (I have it open).
            // `updateOrder` in `useOrders` calls `ordersService.updateOrder`.

            // So yes, `OrderActions` replaces the need to call `updateOrderLocal` for DB updates.
            // But we lose the local state update that `useOrders` might be doing (if it manages state).
            // `useOrders` usually manages `orders` state.

            // If `OrderActions` is the new way, `useOrderActions` should probably take a `onSuccess` callback or similar,
            // or we just use `refreshOrders`.

            // Let's use `refreshOrders` for correctness.
            // If the user notices a slowdown, we can optimize later.
            // But wait, `updateOrderLocal` is passed in.
            // Maybe we can pass `updateOrderLocal` to `OrderActions`? No, `OrderActions` is pure logic.

            // Let's look at `OrderActions` again. It calls `updateOrder` service.
            // So `OrderActions` persists.

            // I will replace `updateOrderLocal` calls with `OrderActions` calls, and then `refreshOrders()`.
            // This ensures data consistency.

            // Exception: `handleProductCorrection` used `updateOrderLocal`.

            await refreshOrders();
            showSuccess('Order approved. Confirmation sent via Zalo (Simulated).');
        } catch (err) {
            showError('Failed to approve order.');
        }
    }, [user, refreshOrders, showSuccess, showError]);

    // 2. SHOP ACTION: Reject / Verification Required
    const handleConfirmReject = useCallback(async (order: Order, reason: string, mode: 'VERIFICATION_REQUIRED' | 'ORDER_REJECTED') => {
        if (!user) return;
        try {
            if (mode === 'VERIFICATION_REQUIRED') {
                await OrderActions.flagVerification(order, reason, user.id);
                showSuccess('Order flagged for verification.');
            } else {
                await OrderActions.rejectOrder(order, reason, user.id);
                showSuccess('Order rejected.');
            }
            await refreshOrders();
        } catch (err) { showError('Failed to update order.'); }
    }, [user, refreshOrders, showSuccess, showError]);

    // 3. SIMULATION: Customer Confirms
    const handleSimulateConfirmed = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await OrderActions.simulateConfirmed(order, user.id);
            await refreshOrders();
            showSuccess('Simulated: Customer confirmed. Invoice created & QR Code sent.');
        } catch (e) { showError('Simulation failed.'); }
    }, [user, refreshOrders, showSuccess, showError]);

    // 4. SIMULATION: Customer Cancels
    const handleSimulateCancelled = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await OrderActions.simulateCancelled(order, user.id);
            await refreshOrders();
            showSuccess('Simulated: Customer cancelled order.');
        } catch (e) { showError('Simulation failed.'); }
    }, [user, refreshOrders, showSuccess, showError]);

    // 5. SIMULATION: Customer Pays
    const handleSimulatePaid = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await OrderActions.simulatePaid(order, user.id);
            await refreshOrders();
            showSuccess('Payment received! Invoice marked as Paid.');
        } catch (e) { showError('Payment simulation failed.'); }
    }, [user, refreshOrders, showSuccess, showError]);

    // 6. FULFILLMENT: Delivering
    const handleMarkShipped = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await OrderActions.markShipped(order, user.id);
            await refreshOrders();
            showSuccess('Order marked as Delivering.');
        } catch (err) { showError('Failed to update status.'); }
    }, [user, refreshOrders, showSuccess, showError]);

    // 7. FULFILLMENT: Completed
    const handleMarkCompleted = useCallback(async (order: Order) => {
        if (!user) return;
        try {
            await OrderActions.markCompleted(order, user.id);
            await refreshOrders();
            showSuccess('Order marked as Completed.');
        } catch (err) { showError('Failed to complete order.'); }
    }, [user, refreshOrders, showSuccess, showError]);

    // 8. PRODUCT CORRECTION
    const handleProductCorrection = useCallback(async (order: Order, productId: string, productName: string) => {
        if (!user) return;
        try {
            await OrderActions.updateProduct(order, productId, productName, user.id);
            await refreshOrders();
            showSuccess('Product updated successfully!');
        } catch (err) {
            showError('Failed to update product.');
        }
    }, [user, refreshOrders, showSuccess, showError]);

    // 9. DELETE ORDERS
    const handleDeleteOrders = useCallback(async (orderIds: string[], ordersToDelete: Order[]) => {
        if (!user || orderIds.length === 0) return;
        try {
            await OrderActions.deleteOrdersAction(orderIds, ordersToDelete, user.id);
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