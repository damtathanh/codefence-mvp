import React, { useState, useEffect } from 'react';
import { useOrdersData } from '../hooks/useOrdersData';
import { useOrderActions } from '../hooks/useOrderActions';
import { useOrderSelection } from '../hooks/useOrderSelection';
import { OrderTable } from './OrderTable';
import { OrderSidePanel } from './OrderSidePanel';
import { FilterBar } from '../../../components/ui/FilterBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { MultiSelectFilter } from '../../../components/filters/MultiSelectFilter';
import { Plus } from 'lucide-react';
import { AddOrderModal } from '../../../components/dashboard/AddOrderModal';
import RejectOrderModal from '../../../components/orders/RejectOrderModal';
import { CustomerConfirmationModal } from '../../../components/orders/CustomerConfirmationModal';
import { CancellationReasonModal } from '../../../components/orders/CancellationReasonModal';
import { useToast } from '../../../components/ui/Toast';
import { fetchOrderEvents } from '../services/orderEventsService';
import { fetchCustomerBlacklist } from '../../customers/services/customersService';
import { useAuth } from '../../auth';
import {
    simulateCustomerConfirmed,
    simulateCustomerCancelled,
} from '../../zalo';
import { logOrderEvent } from '../services/orderEventsService';
import { ORDER_STATUS } from '../../../constants/orderStatus';
import type { Order, OrderEvent } from '../../../types/supabase';
import { logUserAction } from '../../../utils/logUserAction';
import { supabase } from '../../../lib/supabaseClient';

export const OrdersView: React.FC = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

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

    const filteredOrders = orders;

    const {
        selectedIds,
        handleSelectAll,
        handleToggleSelect,
        clearSelection,
    } = useOrderSelection(filteredOrders);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const {
        handleApprove,
        handleConfirmReject,
        handleMarkShipped, // aka Start Delivery
        handleMarkCompleted,
        handleProductCorrection,
        handleDeleteOrders,
        handleSimulatePaid,
        handleSendQrLink,
    } = useOrderActions(updateOrderLocal, refreshOrders);

    const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
    const [blacklistedPhones, setBlacklistedPhones] = useState<Set<string>>(new Set());
    const [addressForm, setAddressForm] = useState({
        address_detail: '', ward: '', district: '', province: '',
    });
    const [isAddressModified, setIsAddressModified] = useState(false);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectTargetOrder, setRejectTargetOrder] = useState<Order | null>(null);
    const [rejectMode, setRejectMode] = useState<'VERIFICATION_REQUIRED' | 'ORDER_REJECTED'>('VERIFICATION_REQUIRED');
    const [rejectReason, setRejectReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    const [deleteAllModal, setDeleteAllModal] = useState({ isOpen: false, selectedCount: 0 });
    const [deleteAllLoading, setDeleteAllLoading] = useState(false);

    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
    const [pendingConfirmOrder, setPendingConfirmOrder] = useState<Order | null>(null);

    // Helper: close SidePanel
    const closeSidePanel = () => {
        setIsSidePanelOpen(false);
        setSelectedOrder(null);
    };

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

    const loadOrderEvents = async (orderId: string) => {
        const { data, error } = await fetchOrderEvents(orderId);
        if (!error && data) {
            setOrderEvents(data);
        }
    };

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

        try {
            await updateOrderLocal(selectedOrder.id, {
                address_detail, ward, district, province,
            });
            showSuccess('Address updated successfully');
            setIsAddressModified(false);
        } catch (err) {
            showError('Failed to update address');
        }
    };

    // ========= Handlers (đóng SidePanel sau khi action thành công) =========

    const handleApproveOrder = async (order: Order) => {
        if (!user) return;
        try {
            const { error } = await supabase.rpc('approve_medium_risk_order', {
                p_order_id: order.id
            });
            if (error) throw error;
            showSuccess('Order approved successfully');
            await refreshOrders();
            closeSidePanel();
        } catch (error) {
            showError('Failed to approve order');
        }
    };

    const handleRejectOrder = async (order: Order, reason: string) => {
        if (!user) return;

        // Nếu đang ở VERIFICATION_REQUIRED => reject trực tiếp
        if (order.status === ORDER_STATUS.VERIFICATION_REQUIRED) {
            try {
                const success = await updateOrderLocal(order.id, {
                    status: ORDER_STATUS.ORDER_REJECTED,
                    cancel_reason: reason || 'Rejected during verification',
                } as Partial<Order>);

                if (!success) {
                    showError('Failed to reject order');
                    return;
                }

                await logOrderEvent(
                    order.id,
                    'REJECTED',
                    { reason: reason || 'Rejected during verification' },
                    'orders_view'
                );

                showSuccess('Order rejected');

                await logUserAction({
                    userId: user.id,
                    action: 'Reject Order',
                    status: 'success',
                    orderId: order.order_id || order.id
                });

                await refreshOrders();
                closeSidePanel();
            } catch (error) {
                showError('Failed to reject order');
            }
        } else {
            // Pending Review -> mở modal hỏi lý do, vẫn đóng SidePanel cho sạch
            setRejectTargetOrder(order);
            setRejectMode('ORDER_REJECTED');
            setRejectReason(reason);
            setIsRejectModalOpen(true);
            closeSidePanel();
        }
    };

    const handleSimulateConfirmedClick = async (order: Order) => {
        if (!user) return;
        try {
            await simulateCustomerConfirmed(order);
            setPendingConfirmOrder(order);
            setIsConfirmationModalOpen(true);
            closeSidePanel();

            await logUserAction({
                userId: user.id,
                action: 'Customer Confirmed Order',
                status: 'success',
                orderId: order.order_id || order.id
            });
        } catch (error) {
            showError('Failed to simulate confirmation');
        }
    };

    const handleSimulateCancelledClick = (order: Order) => {
        if (!user) return;
        setPendingConfirmOrder(order);
        setIsCancellationModalOpen(true);
        closeSidePanel();
    };

    const handleSendQrPaymentLinkClick = async (order: Order) => {
        // Không đóng SidePanel, m muốn vẫn xem được
        await handleSendQrLink(order);
        closeSidePanel();

    };

    // Wrappers cho hook actions để dùng trong SidePanel
    const handleStartDeliveryFromPanel = async (order: Order) => {
        await handleMarkShipped(order);
        closeSidePanel();
    };

    const handleMarkCompletedFromPanel = async (order: Order) => {
        await handleMarkCompleted(order);
        closeSidePanel();
    };

    const handleSimulatePaidFromPanel = async (order: Order) => {
        await handleSimulatePaid(order);
        closeSidePanel();
    };

    // Modal Close Handlers
    const handleConfirmationModalClose = async () => {
        setIsConfirmationModalOpen(false);
        if (pendingConfirmOrder && pendingConfirmOrder.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT) {
            await updateOrderLocal(pendingConfirmOrder.id, { status: ORDER_STATUS.CUSTOMER_CONFIRMED });
            await refreshOrders();
        }
        setPendingConfirmOrder(null);
    };

    const handleCancellationConfirm = async (reason: string) => {
        if (!user || !pendingConfirmOrder) return;
        try {
            await simulateCustomerCancelled(pendingConfirmOrder, reason);
            showSuccess('Customer cancelled via mock Zalo OA');
            setIsCancellationModalOpen(false);

            await updateOrderLocal(pendingConfirmOrder.id, {
                status: ORDER_STATUS.CUSTOMER_CANCELLED,
                cancel_reason: reason
            });

            await logUserAction({
                userId: user.id,
                action: 'Customer Cancelled Order',
                status: 'success',
                orderId: pendingConfirmOrder.order_id || pendingConfirmOrder.id
            });

            await refreshOrders();
            setPendingConfirmOrder(null);
        } catch (error) {
            showError('Failed to simulate cancellation');
        }
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
            closeSidePanel();
            await refreshOrders();
        } catch (error) {
        } finally {
            setRejectLoading(false);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter([]);
        setRiskScoreFilter([]);
        setPaymentMethodFilter([]);
    };

    const handleDeleteAllClick = () => {
        if (selectedIds.size === 0) return;
        setDeleteAllModal({ isOpen: true, selectedCount: selectedIds.size });
    };

    const handleDeleteAllConfirm = async () => {
        if (selectedIds.size === 0) return;
        setDeleteAllLoading(true);
        try {
            const orderIds = Array.from(selectedIds);
            const ordersToDelete = orders.filter(o => selectedIds.has(o.id));

            await handleDeleteOrders(orderIds, ordersToDelete);

            clearSelection();
            setDeleteAllModal({ isOpen: false, selectedCount: 0 });
        } finally {
            setDeleteAllLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 h-full flex flex-col min-h-0">
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
                        { value: 'low', label: 'Low Risk' },
                        { value: 'medium', label: 'Medium Risk' },
                        { value: 'high', label: 'High Risk' },
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
                <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-10 px-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)]"
                />
                <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-sm text-[var(--text-muted)] hover:text-white"
                >
                    Clear filters
                </button>
                <Button
                    onClick={() => {
                        setEditingOrder(null);
                        setIsAddOrderModalOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Order
                </Button>
            </FilterBar>

            <Card className="flex-1 flex flex-col min-h-0">
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
                        const o = orders.find(x => x.id === orderId);
                        if (o) handleApproveOrder(o);
                    }}
                    onReject={(orderId) => {
                        const o = orders.find(x => x.id === orderId);
                        if (o) {
                            setRejectTargetOrder(o);
                            setRejectMode('ORDER_REJECTED');
                            setRejectReason('');
                            setIsRejectModalOpen(true);
                        }
                    }}
                    onEdit={(order) => {
                        setEditingOrder(order);
                        setIsAddOrderModalOpen(true);
                    }}
                    onDelete={handleDeleteAllClick}
                    loading={loading}
                />
            </Card>

            <OrderSidePanel
                isOpen={isSidePanelOpen}
                onClose={closeSidePanel}
                order={selectedOrder}
                orderEvents={orderEvents}
                addressForm={addressForm}
                isAddressModified={isAddressModified}
                onAddressChange={handleAddressChange}
                onSaveAddress={handleSaveAddress}
                blacklistedPhones={blacklistedPhones}
                // Handlers dùng cho SidePanel
                onApprove={handleApproveOrder}
                onReject={handleRejectOrder}
                onMarkDelivered={handleStartDeliveryFromPanel}
                onMarkCompleted={handleMarkCompletedFromPanel}
                onSimulateConfirmed={handleSimulateConfirmedClick}
                onSimulateCancelled={handleSimulateCancelledClick}
                onSimulatePaid={handleSimulatePaidFromPanel}
                onSendQrPaymentLink={handleSendQrPaymentLinkClick}
                onOrderUpdated={refreshOrders}
            />

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

            {pendingConfirmOrder && (
                <>
                    <CustomerConfirmationModal
                        isOpen={isConfirmationModalOpen}
                        onClose={handleConfirmationModalClose}
                        order={pendingConfirmOrder}
                    />
                    <CancellationReasonModal
                        isOpen={isCancellationModalOpen}
                        onClose={() => setIsCancellationModalOpen(false)}
                        onConfirm={handleCancellationConfirm}
                        order={pendingConfirmOrder}
                    />
                </>
            )}
        </div>
    );
};
