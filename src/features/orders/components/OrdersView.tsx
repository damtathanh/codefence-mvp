import React, { useState, useEffect, useMemo } from 'react';
import { useOrdersData } from '../hooks/useOrdersData';
import { useOrderActions } from '../hooks/useOrderActions';
import { useOrderSelection } from '../hooks/useOrderSelection';
import { OrderTable } from './OrderTable';
import { OrderSidePanel } from './OrderSidePanel';
import { FilterBar } from '../../../components/ui/FilterBar';
import { Button } from '../../../components/ui/Button';
import { MultiSelectFilter } from '../../../components/filters/MultiSelectFilter';
import { Plus, Search } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
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
import { logOrderEvent } from '../services/orderEventsService';
import { ORDER_STATUS } from '../../../constants/orderStatus';
import { PAYMENT_METHODS } from '../../../constants/paymentMethods';
import type { Order, OrderEvent } from '../../../types/supabase';
import { logUserAction } from '../../../utils/logUserAction';
import { supabase } from '../../../lib/supabaseClient';

export const OrdersView: React.FC = () => {
    const { user } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();

    // Use centralized state from useOrdersData
    const {
        orders,
        products,
        loading,
        error,
        refreshOrders,
        updateOrderLocal,
        totalCount,
        page,
        setPage,
        pageSize,
        statusOptions,
        paymentMethodOptions,
        // Filters
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        riskScoreFilter,
        setRiskScoreFilter,
        paymentMethodFilter,
        setPaymentMethodFilter,
        dateFilter,
        setDateFilter,
    } = useOrdersData();

    // Derived state for selection (filteredOrders is just orders now because filtering is server-side + optimistic local)
    // Note: useOrderSelection expects 'filteredOrders' to know what to select all from.
    // Since 'orders' contains the current page's data which matches filters, we use that.
    const filteredOrders = orders;

    const {
        selectedIds,
        handleSelectAll,
        handleToggleSelect,
        clearSelection,
    } = useOrderSelection(filteredOrders);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Handlers from useOrderActions (ensure they use the new updateOrderLocal)
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

    // ========= COD Approve with One-Time Guard =========
    // ========= COD Approve with One-Time Guard =========
    const handleApproveOrder = async (order: Order) => {
        if (!user) return;

        try {
            // Call the new RPC
            const { error } = await supabase.rpc('approve_medium_risk_order', {
                p_order_id: order.id
            });

            if (error) throw error;

            showSuccess('Order approved successfully');

            // Refresh data
            refreshOrders();

            // Close side panel
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

                await logOrderEvent(
                    order.id,
                    'REJECTED',
                    {
                        reason: 'Rejected during verification',
                    },
                    'orders_view'
                );

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
            // simulateCustomerConfirmed already logs CUSTOMER_CONFIRMED and QR_SENT events
            await simulateCustomerConfirmed(order);

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
            // No need to refresh, simulateCustomerConfirmed should have updated backend
            // But we need to update local state. simulateCustomerConfirmed calls updateOrder internally?
            // Actually simulateCustomerConfirmed calls services directly.
            // We should probably update local state here manually or rely on realtime (but realtime is disabled for auto-update).
            // Ideally simulateCustomerConfirmed should be refactored to use updateOrderLocal, but it's imported.
            // For now, let's just do a quick local update to reflect the change if we know what happened.
            // Or better: call updateOrderLocal with the expected status change.
            // Since simulateCustomerConfirmed does complex logic, we might need to refresh OR trust that it worked and just update status.

            // Let's try to just update status locally to avoid full refresh
            await updateOrderLocal(pendingConfirmOrder.id, { status: ORDER_STATUS.CUSTOMER_CONFIRMED });

            // Also fetch events to update side panel if open? Side panel is closed above.
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
            // simulateCustomerCancelled already logs CUSTOMER_CANCELLED event
            await simulateCustomerCancelled(pendingConfirmOrder, reason);

            showSuccess('Customer cancelled via mock Zalo OA');
            setIsCancellationModalOpen(false);

            // Update local state
            await updateOrderLocal(pendingConfirmOrder.id, {
                status: ORDER_STATUS.CUSTOMER_CANCELLED,
                cancel_reason: reason
            });

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
            // simulateCustomerPaid updates status to PAID. If it was Delivering/Completed, we want to keep it.
            // But updateOrderLocal will handle the UI update.
            // If we want to force it back:
            if (currentStatus === ORDER_STATUS.DELIVERING || currentStatus === ORDER_STATUS.COMPLETED) {
                await updateOrderLocal(order.id, { status: currentStatus });
            } else {
                await updateOrderLocal(order.id, { status: ORDER_STATUS.ORDER_PAID });
            }

            showSuccess('Customer paid via mock Zalo OA');
        } catch (error) {
            showError('Failed to simulate payment');
            console.error('Error simulating paid:', error);
        }
    };

    // ========= Mark as Delivered =========
    const handleMarkDelivered = async (order: Order) => {
        if (!user) return;

        try {
            // Update local state immediately for instant UI feedback
            const now = new Date().toISOString();
            const success = await updateOrderLocal(order.id, {
                status: ORDER_STATUS.DELIVERING,
                shipped_at: now,
            } as Partial<Order>);

            if (!success) {
                showError('Failed to mark as delivered');
                return;
            }

            await logOrderEvent(
                order.id,
                'ORDER_MARKED_DELIVERING',
                {},
                'orders_view'
            );

            showSuccess('Order marked as delivering');

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
            // Update local state immediately for instant UI feedback
            const now = new Date().toISOString();
            const success = await updateOrderLocal(order.id, {
                status: ORDER_STATUS.COMPLETED,
                completed_at: now,
            } as Partial<Order>);

            if (!success) {
                showError('Failed to mark as completed');
                return;
            }

            await logOrderEvent(
                order.id,
                'ORDER_COMPLETED',
                {},
                'orders_view'
            );

            showSuccess('Order marked as completed');
            setIsSidePanelOpen(false);
            setSelectedOrder(null);

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

            await logOrderEvent(
                order.id,
                'CUSTOMER_UNREACHABLE',
                {
                    reason: 'Customer did not respond to verification',
                },
                'orders_view'
            );

            showSuccess('Order marked as Customer Unreachable');

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

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter([]);
        setRiskScoreFilter([]);
        setPaymentMethodFilter([]);
    };

    return (
        <div className="space-y-6 p-6 h-full flex flex-col min-h-0">

            {/* Filters & Actions */}
            {/* Filters & Actions */}
            <FilterBar
                searchValue={searchQuery}
                onSearch={setSearchQuery}
                searchPlaceholder="Search orders..."
            >
                <MultiSelectFilter
                    label="Statuses"
                    options={statusOptions.map(s => ({ value: s, label: s }))}
                    selectedValues={statusFilter}
                    onChange={setStatusFilter}
                />
                <MultiSelectFilter
                    label="Risk Levels"
                    options={[
                        { value: 'low', label: 'Low Risk (0–30)' },
                        { value: 'medium', label: 'Medium Risk (31–70)' },
                        { value: 'high', label: 'High Risk (70+)' },
                    ]}
                    selectedValues={riskScoreFilter}
                    onChange={setRiskScoreFilter}
                />
                <MultiSelectFilter
                    label="Payment Methods"
                    options={paymentMethodOptions.map(m => ({ value: m, label: m }))}
                    selectedValues={paymentMethodFilter}
                    onChange={setPaymentMethodFilter}
                />

                {/* Date Filter */}
                <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-10 w-auto min-w-[180px] whitespace-nowrap px-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)]"
                />

                {/* Clear filters */}
                <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-sm text-[var(--text-muted)] whitespace-nowrap hover:text-white transition"
                >
                    Clear filters
                </button>

                {/* Action Button */}
                <Button
                    className="whitespace-nowrap"
                    onClick={() => {
                        setEditingOrder(null);
                        setIsAddOrderModalOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Order
                </Button>
            </FilterBar>

            {/* Table occupies full remaining space */}
            <div className="flex-1 min-h-0">
                <OrderTable
                    orders={orders}
                    filteredOrders={filteredOrders}
                    totalCount={totalCount}
                    currentPage={page}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                    onToggleSelect={handleToggleSelect}
                    onPageChange={setPage}
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


            {/* Side Panel */}
            <OrderSidePanel
                isOpen={isSidePanelOpen}
                onClose={() => {
                    setIsSidePanelOpen(false);
                    setSelectedOrder(null);
                }}
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
                onOrderUpdated={refreshOrders}
            />

            {/* Add/Edit Order Modal */}
            <AddOrderModal
                isOpen={isAddOrderModalOpen}
                onClose={() => {
                    setIsAddOrderModalOpen(false);
                    setEditingOrder(null);
                }}
                onSuccess={() => {
                    refreshOrders();
                    setIsAddOrderModalOpen(false);
                    setEditingOrder(null);
                }}
                editingOrder={editingOrder}
            />

            {/* Reject Modal */}
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

            {/* Delete All Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteAllModal.isOpen}
                onCancel={() => setDeleteAllModal({ ...deleteAllModal, isOpen: false })}
                onConfirm={handleDeleteAllConfirm}
                message={`Are you sure you want to delete ${deleteAllModal.selectedCount} selected orders? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                loading={deleteAllLoading}
                variant="danger"
            />

            {/* Customer Confirmation Modal */}
            {
                pendingConfirmOrder && (
                    <>
                        <CustomerConfirmationModal
                            isOpen={isConfirmationModalOpen}
                            onClose={handleConfirmationModalClose}
                            order={pendingConfirmOrder}
                        />

                        <CancellationReasonModal
                            isOpen={isCancellationModalOpen}
                            onClose={handleCancellationModalClose}
                            onConfirm={handleCancellationConfirm}
                            order={pendingConfirmOrder}
                        />
                    </>
                )
            }
        </div >
    );
};
