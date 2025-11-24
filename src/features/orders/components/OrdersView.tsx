import React, { useState, useEffect, useMemo } from 'react';
import { useOrdersData } from '../hooks/useOrdersData';
import { useOrderActions } from '../hooks/useOrderActions';
import { useOrderFilters } from '../hooks/useOrderFilters';
import { useOrderSelection } from '../hooks/useOrderSelection';
import { OrderFilters } from './OrderFilters';
import { OrderTable } from './OrderTable';
import { OrderSidePanel } from './OrderSidePanel';
import { AddOrderModal } from '../../../components/dashboard/AddOrderModal';
import RejectOrderModal from '../../../components/orders/RejectOrderModal';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { CustomerConfirmationModal } from '../../../components/orders/CustomerConfirmationModal';
import { CancellationReasonModal } from '../../../components/orders/CancellationReasonModal';
import { useToast } from '../../../components/ui/Toast';
import { fetchOrderEvents } from '../services/orderEventsService';
import { fetchCustomerBlacklist } from '../../customers/services/customersService';
import { useAuth } from '../../auth';
import {
    simulateCustomerConfirmed,
    simulateCustomerCancelled,
    simulateCustomerPaid,
    zaloGateway,
} from '../../zalo';
import { insertOrderEvent } from '../services/orderEventsService';
import { ORDER_STATUS } from '../../../constants/orderStatus';
import { PAYMENT_METHODS } from '../../../constants/paymentMethods';
import type { Order, OrderEvent } from '../../../types/supabase';
import { logUserAction } from '../../../utils/logUserAction';



export const OrdersView: React.FC = () => {
    const { user } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const { orders, products, loading, error, refreshOrders, updateOrderLocal, totalCount, page, pageSize } = useOrdersData();
    const {
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        riskScoreFilter,
        setRiskScoreFilter,
        paymentMethodFilter,
        setPaymentMethodFilter,
        filteredOrders,
        statusOptions,
        paymentMethodOptions,
        clearAllFilters,
    } = useOrderFilters(orders);
    const {
        selectedIds,
        handleSelectAll,
        handleToggleSelect,
        clearSelection,
    } = useOrderSelection(filteredOrders);

    // Pagination state is now managed by useOrdersData
    // const PAGE_SIZE = 200;
    // const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Server-side pagination: 'filteredOrders' is already the current page data
    // (filtered by server, then passed through useOrderFilters which is redundant but safe)
    const paginatedOrders = filteredOrders;

    // Reset to page 1 when filters change
    // Fetch orders when filters change (reset to page 1)
    useEffect(() => {
        refreshOrders(1, {
            searchQuery,
            status: statusFilter,
            riskScore: riskScoreFilter,
            paymentMethod: paymentMethodFilter
        });
    }, [searchQuery, statusFilter, riskScoreFilter, paymentMethodFilter, refreshOrders]);

    const handlePageChange = (newPage: number) => {
        refreshOrders(newPage, {
            searchQuery,
            status: statusFilter,
            riskScore: riskScoreFilter,
            paymentMethod: paymentMethodFilter
        });
    };
    const {
        handleApprove,
        handleConfirmReject,
        handleMarkShipped,
        handleMarkCompleted,
        handleProductCorrection,
        handleDeleteOrders,
    } = useOrderActions(updateOrderLocal, refreshOrders);

    // UI State
    const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    // Side Panel State
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
    const [blacklistedPhones, setBlacklistedPhones] = useState<Set<string>>(new Set());

    // Address Editing State
    const [addressForm, setAddressForm] = useState({
        address_detail: '',
        ward: '',
        district: '',
        province: '',
    });
    const [isAddressModified, setIsAddressModified] = useState(false);

    // Reject Modal State
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectTargetOrder, setRejectTargetOrder] = useState<Order | null>(null);
    const [rejectMode, setRejectMode] = useState<'VERIFICATION_REQUIRED' | 'ORDER_REJECTED'>('VERIFICATION_REQUIRED');
    const [rejectReason, setRejectReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    // Delete All Modal State
    const [deleteAllModal, setDeleteAllModal] = useState({ isOpen: false, selectedCount: 0 });
    const [deleteAllLoading, setDeleteAllLoading] = useState(false);

    // New Modal States
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
    const [pendingConfirmOrder, setPendingConfirmOrder] = useState<Order | null>(null);

    // Load Blacklist
    useEffect(() => {
        const loadBlacklist = async () => {
            if (!user) return;
            try {
                const { data } = await fetchCustomerBlacklist(user.id);
                setBlacklistedPhones(new Set((data ?? []).map((entry) => entry.phone)));
            } catch (err) {
                console.error('Error loading blacklist:', err);
            }
        };
        loadBlacklist();
    }, [user]);

    // Load Order Events
    const loadOrderEvents = async (orderId: string) => {
        const { data, error } = await fetchOrderEvents(orderId);
        if (!error && data) {
            setOrderEvents(data);
        }
    };

    // Handlers
    const handleRowClick = async (order: Order) => {
        setSelectedOrder(order);
        setAddressForm({
            address_detail: order.address_detail || order.address || '',
            ward: order.ward || '',
            district: order.district || '',
            province: order.province || '',
        });
        setIsAddressModified(false);
        setIsSidePanelOpen(true);
        await loadOrderEvents(order.id);
    };

    const handleAddressChange = (field: string, value: string) => {
        setAddressForm((prev) => {
            const next = { ...prev, [field]: value };
            setIsAddressModified(true);
            return next;
        });
    };

    const handleSaveAddress = async () => {
        if (!selectedOrder || !user) return;

        const { address_detail, ward, district, province } = addressForm;
        const fullAddress = [address_detail, ward, district, province]
            .filter(Boolean)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .join(', ');

        try {
            await updateOrderLocal(selectedOrder.id, {
                address_detail,
                ward,
                district,
                province,
                address: fullAddress,
            });
            showSuccess('Address updated successfully');
            setIsAddressModified(false);
        } catch (err) {
            showError('Failed to update address');
        }
    };

    // ========= Refresh Helper =========
    const refreshAfterAction = async (orderId: string) => {
        await refreshOrders();
        const { data } = await fetchOrderEvents(orderId);
        if (data) {
            setOrderEvents(data);
        }
        setSelectedOrder(null);
        setIsSidePanelOpen(false);
    };

    // ========= COD Approve with One-Time Guard =========
    const handleApproveOrder = async (order: Order) => {
        if (!user) return;

        const rawMethod = order.payment_method || 'COD';
        const method = rawMethod.toUpperCase();

        if (method !== 'COD') {
            showInfo('Non-COD orders are already paid. No approval needed.');
            return;
        }

        const canApproveFromStatus =
            order.status === ORDER_STATUS.PENDING_REVIEW ||
            order.status === ORDER_STATUS.VERIFICATION_REQUIRED;
        if (!canApproveFromStatus) {
            showInfo('This order has already been processed.');
            return;
        }

        try {
            // Different behavior for Pending Review vs Verification Required
            if (order.status === ORDER_STATUS.VERIFICATION_REQUIRED) {
                // Direct transition to Customer Confirmed (no modal, no Zalo)
                const success = await updateOrderLocal(order.id, {
                    status: ORDER_STATUS.CUSTOMER_CONFIRMED,
                } as Partial<Order>);

                if (!success) {
                    showError('Failed to approve order');
                    return;
                }

                await insertOrderEvent({
                    order_id: order.id,
                    event_type: 'ORDER_APPROVED',
                    payload_json: { user_id: user.id, from_verification: true },
                });

                showSuccess('Order approved → Customer Confirmed');

                await logUserAction({
                    userId: user.id,
                    action: 'Approve Order (Verification)',
                    status: 'success',
                    orderId: order.order_id || order.id,
                    details: {
                        status_from: order.status,
                        status_to: ORDER_STATUS.CUSTOMER_CONFIRMED,
                    },
                });
            } else {
                // Pending Review: Send confirmation via Zalo
                const success = await updateOrderLocal(order.id, {
                    status: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                } as Partial<Order>);

                if (!success) {
                    showError('Failed to approve order');
                    return;
                }

                await zaloGateway.sendConfirmation(order);

                await insertOrderEvent({
                    order_id: order.id,
                    event_type: 'ORDER_APPROVED',
                    payload_json: { user_id: user.id },
                });
                await insertOrderEvent({
                    order_id: order.id,
                    event_type: 'ZALO_CONFIRMATION_SENT',
                    payload_json: { source: 'zalo_gateway' },
                });

                showSuccess('Order approved and confirmation sent');

                await logUserAction({
                    userId: user.id,
                    action: 'Approve Order',
                    status: 'success',
                    orderId: order.order_id || order.id,
                    details: {
                        status_from: order.status,
                        status_to: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                    },
                });
            }

            // Close side panel if it is open
            setIsSidePanelOpen(false);
            setSelectedOrder(null);
        } catch (error) {
            showError('Failed to approve order');
            console.error('Error approving order:', error);
        }
    };

    // ========= COD Reject with One-Time Guard =========
    const handleRejectOrder = async (order: Order) => {
        if (!user) return;

        const canRejectFromStatus =
            order.status === ORDER_STATUS.PENDING_REVIEW ||
            order.status === ORDER_STATUS.VERIFICATION_REQUIRED;

        if (!canRejectFromStatus) {
            showInfo('This order has already been processed.');
            return;
        }

        // Different behavior for Verification Required
        if (order.status === ORDER_STATUS.VERIFICATION_REQUIRED) {
            // Direct transition to Order Rejected (no modal)
            try {
                const success = await updateOrderLocal(order.id, {
                    status: ORDER_STATUS.ORDER_REJECTED,
                } as Partial<Order>);

                if (!success) {
                    showError('Failed to reject order');
                    return;
                }

                await insertOrderEvent({
                    order_id: order.id,
                    event_type: 'ORDER_REJECTED',
                    payload_json: { user_id: user.id, from_verification: true, reason: 'Rejected during verification' },
                });

                showSuccess('Order rejected');

                await logUserAction({
                    userId: user.id,
                    action: 'Reject Order (Verification)',
                    status: 'success',
                    orderId: order.order_id || order.id,
                    details: {
                        status_from: order.status,
                        status_to: ORDER_STATUS.ORDER_REJECTED,
                    },
                });

                // Close side panel
                setIsSidePanelOpen(false);
                setSelectedOrder(null);
            } catch (error) {
                showError('Failed to reject order');
                console.error('Error rejecting order:', error);
            }
        } else {
            // Pending Review: Open modal for reason
            setRejectTargetOrder(order);
            setRejectMode('ORDER_REJECTED');
            setRejectReason('');
            setIsRejectModalOpen(true);
        }
    };

    // ========= Simulate Confirmed =========
    const handleSimulateConfirmedClick = async (order: Order) => {
        if (!user) return;
        try {
            await simulateCustomerConfirmed(order);

            await insertOrderEvent({
                order_id: order.id,
                event_type: 'CUSTOMER_CONFIRMED',
                payload_json: { source: 'mock_zalo' },
            });

            setPendingConfirmOrder(order);
            setIsConfirmationModalOpen(true);
            setIsSidePanelOpen(false);

            await logUserAction({
                userId: user.id,
                action: 'Customer Confirmed Order',
                status: 'success',
                orderId: order.order_id || order.id,
                details: {
                    status_from: ORDER_STATUS.ORDER_CONFIRMATION_SENT,
                    status_to: ORDER_STATUS.CUSTOMER_CONFIRMED, // Simulated transition
                },
            });
        } catch (error) {
            showError('Failed to simulate confirmation');
            console.error('Error simulating confirmed:', error);
        }
    };

    const handleConfirmationModalClose = async () => {
        setIsConfirmationModalOpen(false);
        if (pendingConfirmOrder) {
            await refreshAfterAction(pendingConfirmOrder.id);
            setPendingConfirmOrder(null);
        }
    };

    // ========= Simulate Cancelled =========
    const handleSimulateCancelledClick = (order: Order) => {
        if (!user) return;
        setPendingConfirmOrder(order);
        setIsCancellationModalOpen(true);
    };

    const handleCancellationConfirm = async (reason: string) => {
        if (!user || !pendingConfirmOrder) return;

        try {
            await simulateCustomerCancelled(pendingConfirmOrder, reason);

            await insertOrderEvent({
                order_id: pendingConfirmOrder.id,
                event_type: 'CUSTOMER_CANCELLED',
                payload_json: { source: 'mock_zalo', reason },
            });

            showSuccess('Customer cancelled via mock Zalo OA');
            setIsCancellationModalOpen(false);
            await refreshAfterAction(pendingConfirmOrder.id);
            setPendingConfirmOrder(null);

            await logUserAction({
                userId: user.id,
                action: 'Customer Cancelled Order',
                status: 'success',
                orderId: pendingConfirmOrder.order_id || pendingConfirmOrder.id,
                details: {
                    status_from: pendingConfirmOrder.status,
                    status_to: ORDER_STATUS.CUSTOMER_CANCELLED,
                    reason,
                },
            });
        } catch (error) {
            showError('Failed to simulate cancellation');
            console.error('Error simulating cancelled:', error);
        }
    };

    const handleCancellationModalClose = () => {
        setIsCancellationModalOpen(false);
        setPendingConfirmOrder(null);
    };

    // ========= Simulate Paid =========
    const handleSimulatePaidClick = async (order: Order) => {
        if (!user) return;
        const currentStatus = order.status;

        try {
            // 1. Always mark invoice as Paid (idempotent) and log payment event
            await simulateCustomerPaid(order);

            // REMOVED: insertOrderEvent is now handled inside markInvoicePaidForOrder (called by simulateCustomerPaid)
            /*
            await insertOrderEvent({
                order_id: order.id,
                event_type: 'CUSTOMER_PAID',
                payload_json: { source: 'mock_zalo' },
            });
            */

            // 2. Log the user action
            await logUserAction({
                userId: user.id,
                action: 'Simulate Paid',
                status: 'success',
                orderId: order.order_id || order.id,
                details: {
                    payment_status_from: 'unpaid',
                    payment_status_to: 'paid',
                    status_from: currentStatus,
                    status_to:
                        currentStatus === ORDER_STATUS.DELIVERING || currentStatus === ORDER_STATUS.COMPLETED
                            ? currentStatus
                            : ORDER_STATUS.ORDER_PAID,
                },
            });

            // 3. Restore status if simulateCustomerPaid changed it but we want to keep it as Delivering/Completed
            if (currentStatus === ORDER_STATUS.DELIVERING || currentStatus === ORDER_STATUS.COMPLETED) {
                await updateOrderLocal(order.id, { status: currentStatus });
            }

            showSuccess('Customer paid via mock Zalo OA');
            await refreshAfterAction(order.id);
        } catch (error) {
            showError('Failed to simulate payment');
            console.error('Error simulating paid:', error);
        }
    };

    // ========= Mark as Delivered =========
    const handleMarkDelivered = async (order: Order) => {
        if (!user) return;

        try {
            const success = await updateOrderLocal(order.id, {
                status: ORDER_STATUS.DELIVERING,
            } as Partial<Order>);

            if (!success) {
                showError('Failed to mark as delivered');
                return;
            }

            await insertOrderEvent({
                order_id: order.id,
                event_type: 'ORDER_MARKED_DELIVERING',
                payload_json: { user_id: user.id },
            });

            showSuccess('Order marked as delivering');
            await refreshAfterAction(order.id);

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Delivered',
                status: 'success',
                orderId: order.order_id || order.id,
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.DELIVERING,
                },
            });
        } catch (error) {
            showError('Failed to mark as delivered');
            console.error('Error marking delivered:', error);
        }
    };

    // ========= Mark as Completed =========
    const handleMarkCompletedClick = async (order: Order) => {
        if (!user) return;

        try {
            const success = await updateOrderLocal(order.id, {
                status: ORDER_STATUS.COMPLETED,
            } as Partial<Order>);

            if (!success) {
                showError('Failed to mark as completed');
                return;
            }

            await insertOrderEvent({
                order_id: order.id,
                event_type: 'ORDER_COMPLETED',
                payload_json: { user_id: user.id },
            });

            showSuccess('Order marked as completed');
            await refreshAfterAction(order.id);

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Completed',
                status: 'success',
                orderId: order.order_id || order.id,
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.COMPLETED,
                },
            });
        } catch (error) {
            showError('Failed to mark as completed');
            console.error('Error marking completed:', error);
        }
    };

    // ========= Mark as Missed (Verification Required → Customer Unreachable) =========
    const handleMarkMissed = async (order: Order) => {
        if (!user) return;

        if (order.status !== ORDER_STATUS.VERIFICATION_REQUIRED) {
            showInfo('Only Verification Required orders can be marked as missed');
            return;
        }

        try {
            const success = await updateOrderLocal(order.id, {
                status: ORDER_STATUS.CUSTOMER_UNREACHABLE,
            } as Partial<Order>);

            if (!success) {
                showError('Failed to mark as missed');
                return;
            }

            await insertOrderEvent({
                order_id: order.id,
                event_type: 'CUSTOMER_UNREACHABLE',
                payload_json: { user_id: user.id, reason: 'Customer did not respond to verification' },
            });

            showSuccess('Order marked as Customer Unreachable');
            await refreshAfterAction(order.id);

            await logUserAction({
                userId: user.id,
                action: 'Mark Order as Missed',
                status: 'success',
                orderId: order.order_id || order.id,
                details: {
                    status_from: order.status,
                    status_to: ORDER_STATUS.CUSTOMER_UNREACHABLE,
                },
            });
        } catch (error) {
            showError('Failed to mark as missed');
            console.error('Error marking missed:', error);
        }
    };

    const openRejectModal = (order: Order) => {
        setRejectTargetOrder(order);
        setRejectMode('VERIFICATION_REQUIRED');
        setRejectReason('');
        setIsRejectModalOpen(true);
    };

    const onConfirmReject = async () => {
        if (!rejectTargetOrder) return;
        if (!rejectReason.trim()) {
            showError('Please enter a reason');
            return;
        }
        setRejectLoading(true);
        try {
            await handleConfirmReject(rejectTargetOrder, rejectReason, rejectMode);
            setIsRejectModalOpen(false);

            // Close side panel
            setIsSidePanelOpen(false);
            setSelectedOrder(null);
        } catch (error) {
            // handled in hook
        } finally {
            setRejectLoading(false);
        }
    };

    const handleDeleteAllClick = () => {
        if (selectedIds.size === 0) return;
        setDeleteAllModal({
            isOpen: true,
            selectedCount: selectedIds.size,
        });
    };

    const handleDeleteAllConfirm = async () => {
        if (selectedIds.size === 0) return;
        setDeleteAllLoading(true);
        const idsToDelete = Array.from(selectedIds);
        const ordersToDelete = orders.filter((o) => idsToDelete.includes(o.id));

        try {
            await handleDeleteOrders(idsToDelete, ordersToDelete);
            setDeleteAllModal({ isOpen: false, selectedCount: 0 });
            clearSelection();
        } catch (error) {
            // handled in hook
        } finally {
            setDeleteAllLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 p-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                    {error}
                </div>
            )}

            <OrderFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                riskScoreFilter={riskScoreFilter}
                setRiskScoreFilter={setRiskScoreFilter}
                paymentMethodFilter={paymentMethodFilter}
                setPaymentMethodFilter={setPaymentMethodFilter}
                statusOptions={statusOptions}
                paymentOptions={paymentMethodOptions}
                onClearFilters={clearAllFilters}
                onAddOrder={() => {
                    setEditingOrder(null);
                    setIsAddOrderModalOpen(true);
                }}
            />

            <div className="flex-1 min-h-0 mt-6">
                <OrderTable
                    orders={paginatedOrders}
                    filteredOrders={filteredOrders}
                    totalCount={totalCount}
                    currentPage={page}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                    onToggleSelect={handleToggleSelect}
                    onPageChange={handlePageChange}
                    onRowClick={handleRowClick}
                    products={products}
                    onProductCorrection={handleProductCorrection}
                    onApprove={(orderId) => {
                        const order = orders.find((o) => o.id === orderId);
                        if (order) handleApproveOrder(order);
                    }}
                    onReject={(orderId) => {
                        const order = orders.find((o) => o.id === orderId);
                        if (order) openRejectModal(order);
                    }}
                    onEdit={(order) => {
                        setEditingOrder(order);
                        setIsAddOrderModalOpen(true);
                    }}
                    onDelete={() => handleDeleteAllClick()}
                    loading={loading}
                />
            </div>

            <OrderSidePanel
                isOpen={isSidePanelOpen}
                onClose={() => setIsSidePanelOpen(false)}
                order={selectedOrder}
                orderEvents={orderEvents}
                addressForm={addressForm}
                isAddressModified={isAddressModified}
                onAddressChange={handleAddressChange}
                onSaveAddress={handleSaveAddress}
                blacklistedPhones={blacklistedPhones}
                onApprove={handleApproveOrder}
                onReject={handleRejectOrder}
                onMarkDelivered={handleMarkDelivered}
                onMarkCompleted={handleMarkCompletedClick}
                onMarkMissed={handleMarkMissed}
                onSimulateConfirmed={handleSimulateConfirmedClick}
                onSimulateCancelled={handleSimulateCancelledClick}
                onSimulatePaid={handleSimulatePaidClick}
            />

            <AddOrderModal
                isOpen={isAddOrderModalOpen}
                onClose={() => setIsAddOrderModalOpen(false)}
                onSuccess={() => refreshOrders()}
                editingOrder={editingOrder}
            />

            <RejectOrderModal
                isOpen={isRejectModalOpen}
                mode={rejectMode}
                reason={rejectReason}
                onModeChange={setRejectMode}
                onReasonChange={setRejectReason}
                onConfirm={onConfirmReject}
                onCancel={() => setIsRejectModalOpen(false)}
                loading={rejectLoading}
            />

            <ConfirmModal
                isOpen={deleteAllModal.isOpen}
                message={`Are you sure you want to delete ${deleteAllModal.selectedCount} selected orders? This action cannot be undone.`}
                confirmText={deleteAllLoading ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDeleteAllConfirm}
                onCancel={() => setDeleteAllModal({ isOpen: false, selectedCount: 0 })}
                loading={deleteAllLoading}
            />

            <CustomerConfirmationModal
                isOpen={isConfirmationModalOpen}
                onClose={handleConfirmationModalClose}
                order={pendingConfirmOrder || selectedOrder!}
            />

            <CancellationReasonModal
                isOpen={isCancellationModalOpen}
                onClose={handleCancellationModalClose}
                onConfirm={handleCancellationConfirm}
                order={pendingConfirmOrder || selectedOrder!}
            />
        </div>
    );
};
