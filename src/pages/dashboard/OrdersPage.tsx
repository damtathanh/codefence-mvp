import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CheckCircle, XCircle, Filter, Plus, AlertTriangle, Trash2, MoreVertical, ChevronDown, Edit } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useAuth } from '../../features/auth';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { logUserAction } from '../../utils/logUserAction';
import { generateChanges } from '../../utils/generateChanges';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import {
  zaloGateway,
  simulateCustomerConfirmed,
  simulateCustomerCancelled,
  simulateCustomerPaid,
} from '../../features/zalo';
import RejectOrderModal from '../../components/orders/RejectOrderModal';
import { supabase } from '../../lib/supabaseClient';
import { fetchOrdersByUser, updateOrder as updateOrderService, deleteOrders } from '../../features/orders/services/ordersService';
import { fetchOrderEvents, insertOrderEvent } from '../../features/orders/services/orderEventsService';
import { ORDER_STATUS } from '../../constants/orderStatus';
import { deleteInvoicesByOrderIds } from '../../features/invoices/invoiceService';

type RejectMode = 'VERIFICATION_REQUIRED' | 'ORDER_REJECTED';
import type { Order, OrderEvent, Product } from '../../types/supabase';
import type { DashboardOutletContext } from '../../components/dashboard/DashboardLayout';

interface SimpleProduct {
  id: string;
  name: string;
  status: string;
}

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive available status options from current orders
  const availableStatusOptions = useMemo(() => {
    const used = new Set(orders.map(o => o.status).filter(Boolean));
    return Object.values(ORDER_STATUS).filter(
      (status) => used.has(status)
    );
  }, [orders]);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [productCorrections, setProductCorrections] = useState<Map<string, string>>(new Map()); // orderId -> product_id
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskScoreFilter, setRiskScoreFilter] = useState('all');
  const [deleteAllModal, setDeleteAllModal] = useState<{
    isOpen: boolean;
    selectedCount: number;
  }>({
    isOpen: false,
    selectedCount: 0,
  });
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number; placement: 'bottom' | 'top' }>({ x: 0, y: 0, placement: 'bottom' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetOrder, setRejectTargetOrder] = useState<Order | null>(null);
  const [rejectMode, setRejectMode] = useState<RejectMode>('VERIFICATION_REQUIRED');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const { openAddOrderModal } = useOutletContext<DashboardOutletContext>();

  // Load order events for a specific order
  const loadOrderEvents = async (orderId: string) => {
    const { data, error } = await fetchOrderEvents(orderId);

    if (!error && data) {
      setOrderEvents(data);
    }
  };

  // Helper to format event display
  const getEventDisplay = (evt: OrderEvent) => {
    const type = evt.event_type;
    const payload = (evt.payload_json || {}) as any;

    switch (type) {
      case 'VERIFICATION_REQUIRED':
        return {
          title: 'Verification required',
          subtitle: payload.reason || '',
        };
      case 'ORDER_REJECTED':
        return {
          title: 'Order rejected',
          subtitle: payload.reason || '',
        };
      case 'ORDER_SHIPPED':
        return {
          title: 'Order shipped (Delivering)',
          subtitle: payload.shipped_at || '',
        };
      case 'ORDER_COMPLETED':
        return {
          title: 'Order completed',
          subtitle: payload.completed_at || '',
        };
      case 'RISK_EVALUATED':
        return {
          title: 'Risk evaluated',
          subtitle: payload.level && payload.score != null
            ? `${payload.level} (${payload.score})`
            : '',
        };
      default:
        return {
          title: type,
          subtitle: '',
        };
    }
  };

  // Handle row click to open side panel
  const handleRowClick = async (order: Order) => {
    setSelectedOrder(order);
    setIsSidePanelOpen(true);
    await loadOrderEvents(order.id);
  };

  // Helper to close side panel
  const closeSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedOrder(null);
    setOrderEvents([]);
  };

  // Fetch orders with product joins
  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch orders with product join
      const { data: ordersData, error: ordersError } = await fetchOrdersByUser(user.id);

      if (ordersError) {
        throw ordersError;
      }

      // Fetch all products for correction dropdowns
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (productsError) {
        throw productsError;
      }

      setOrders(ordersData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = (order?: Order | null) => {
    openAddOrderModal({
      order: order ?? null,
      onSuccess: () => {
        fetchOrders();
      },
    });
  };

  // Fetch orders on mount and when user changes
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Close dropdown on outside click and scroll
  useEffect(() => {
    if (!openActionDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-dropdown-container') && !target.closest('[data-dropdown-menu]')) {
        setOpenActionDropdown(null);
      }
    };

    const handleScroll = () => {
      setOpenActionDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [openActionDropdown]);

  // Update order (for status changes and product corrections)
  const updateOrderLocal = async (orderId: string, updates: Partial<Order>) => {
    if (!user) return;
    
    try {
      const { error } = await updateOrderService(orderId, user.id, updates as any);

      if (error) throw error;
      
      // Refresh orders
      await fetchOrders();
      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      throw err;
    }
  };

  const handleApprove = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      showError('Order not found');
      return;
    }

    const rawMethod = order.payment_method || 'COD';
    const method = rawMethod.toUpperCase();

    if (method !== 'COD') {
      showInfo('Non-COD order is already paid. No confirmation needed.');
      return;
    }

    try {
      await zaloGateway.sendConfirmation(order);

      // Log user action
      if (user) {
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
      }

      // Update status -> "Confirmation Sent" and refresh orders
      await updateOrderLocal(orderId, { status: ORDER_STATUS.ORDER_CONFIRMATION_SENT } as Partial<Order>);

      showSuccess('Confirmation sent via mock Zalo OA');
    } catch (err) {
      console.error('Error sending confirmation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send confirmation';
      showError(errorMessage);

      // Log failed action
      if (user) {
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
    }
  };

  const handleReject = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      showError('Order not found');
      return;
    }

    const rawMethod = order.payment_method || 'COD';
    const method = rawMethod.toUpperCase();

    if (method !== 'COD') {
      showInfo('Non-COD order is already paid. No rejection needed in this flow.');
      return;
    }
    
    setRejectTargetOrder(order);
    setRejectMode('VERIFICATION_REQUIRED');
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetOrder || !user) return;

    if (!rejectReason.trim()) {
      showError('Please enter a reason');
      return;
    }

    setRejectLoading(true);

    const order = rejectTargetOrder;
    const orderId = order.id;
    const orderIdentifier = order.order_id ?? order.id;

    try {
      const nextStatus =
        rejectMode === 'VERIFICATION_REQUIRED'
          ? ORDER_STATUS.VERIFICATION_REQUIRED
          : ORDER_STATUS.ORDER_REJECTED;

      const updateData: any = {
        status: nextStatus,
      };

      if (rejectMode === 'VERIFICATION_REQUIRED') {
        updateData.verification_reason = rejectReason;
      } else {
        updateData.reject_reason = rejectReason;
      }

      const previousData = {
        status: order.status,
      };

      const changes = generateChanges(previousData, updateData);

      // Update order
      const { error: updateError } = await updateOrderService(orderId, user.id, updateData);

      if (updateError) {
        throw updateError;
      }

      // Insert order_events
      const eventType =
        rejectMode === 'VERIFICATION_REQUIRED'
          ? 'VERIFICATION_REQUIRED'
          : 'ORDER_REJECTED';

      const { error: eventError } = await insertOrderEvent({
        order_id: orderId,
        event_type: eventType,
        payload_json: {
          reason: rejectReason,
          mode: rejectMode,
          source: 'ui',
        },
      });

      if (eventError) {
        throw eventError;
      }

      // Log user action
      await logUserAction({
        userId: user.id,
        action: rejectMode === 'VERIFICATION_REQUIRED' ? 'Mark Order as Verification Required' : 'Reject Order',
        status: 'success',
        orderId: orderIdentifier,
        details: Object.keys(changes).length > 0 ? changes : null,
      });

      showSuccess(
        rejectMode === 'VERIFICATION_REQUIRED'
          ? 'Order marked as Verification Required'
          : 'Order rejected successfully!'
      );

      setIsRejectModalOpen(false);
      setRejectTargetOrder(null);
      setRejectReason('');

      // Refresh orders and, if the side panel is open on this order, refresh its events/status
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        await loadOrderEvents(orderId);
      }
    } catch (err) {
      console.error('Error handling reject/verification:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update order. Please try again.';
      showError(errorMessage);

      if (user && rejectTargetOrder) {
        await logUserAction({
          userId: user.id,
          action: 'Reject Order',
          status: 'failed',
          orderId: rejectTargetOrder.order_id ?? '',
        });
      }
    } finally {
      setRejectLoading(false);
    }
  };

  const handleMarkShipped = async (order: Order) => {
    if (!user) return;

    const now = new Date().toISOString();

    try {
      const { error: updateError } = await updateOrderService(order.id, user.id, {
        status: ORDER_STATUS.DELIVERING,
        shipped_at: now,
      });

      if (updateError) throw updateError;

      const { error: eventError } = await insertOrderEvent({
        order_id: order.id,
        event_type: 'ORDER_SHIPPED',
        payload_json: {
          shipped_at: now,
          source: 'ui',
        },
      });

      if (eventError) throw eventError;

      await logUserAction({
        userId: user.id,
        action: 'Mark Order as Delivering',
        status: 'success',
        orderId: order.order_id ?? '',
      });

      showSuccess('Order marked as Delivering');
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === order.id) {
        await loadOrderEvents(order.id);
      }
    } catch (err) {
      console.error('Error marking order as delivering:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update order status.';
      showError(errorMessage);

      await logUserAction({
        userId: user.id,
        action: 'Mark Order as Delivering',
        status: 'failed',
        orderId: order.order_id ?? '',
      });
    }
  };

  const handleMarkCompleted = async (order: Order) => {
    if (!user) return;

    const now = new Date().toISOString();

    try {
      const { error: updateError } = await updateOrderService(order.id, user.id, {
        status: ORDER_STATUS.COMPLETED,
        completed_at: now,
      });

      if (updateError) throw updateError;

      const { error: eventError } = await insertOrderEvent({
        order_id: order.id,
        event_type: 'ORDER_COMPLETED',
        payload_json: {
          completed_at: now,
          source: 'ui',
        },
      });

      if (eventError) throw eventError;

      await logUserAction({
        userId: user.id,
        action: 'Mark Order as Completed',
        status: 'success',
        orderId: order.order_id ?? '',
      });

      showSuccess('Order marked as Completed');
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === order.id) {
        await loadOrderEvents(order.id);
      }
    } catch (err) {
      console.error('Error marking order as completed:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update order status.';
      showError(errorMessage);

      await logUserAction({
        userId: user.id,
        action: 'Mark Order as Completed',
        status: 'failed',
        orderId: order.order_id ?? '',
      });
    }
  };

  // Helper to get latest risk evaluation event
  const getLatestRiskEvent = (): { score: number | null; level: string | null; reasons: string[] } => {
    const riskEvents = orderEvents.filter(evt => evt.event_type === 'RISK_EVALUATED');
    if (riskEvents.length === 0) {
      return { score: selectedOrder?.risk_score ?? null, level: selectedOrder?.risk_level ?? null, reasons: [] };
    }
    const latest = riskEvents[riskEvents.length - 1];
    const payload = (latest.payload_json || {}) as any;
    return {
      score: payload.score ?? selectedOrder?.risk_score ?? null,
      level: payload.level ?? selectedOrder?.risk_level ?? null,
      reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
    };
  };

  // Handle product correction
  const handleProductCorrection = async (orderId: string, productId: string) => {
    const order = orders.find(o => o.id === orderId);
    const product = products.find(p => p.id === productId);
    const orderIdentifier = order?.order_id || orderId;
    
    try {
      // Capture previous data for change tracking
      const previousProduct = order?.products || null;
      const previousProductName = previousProduct?.name || order?.product || 'N/A';
      const newProductName = product?.name || 'N/A';
      
      const previousData = {
        product: previousProductName,
      };
      
      const updateData = {
        product: newProductName,
      };
      
      // Generate changes
      const changes = generateChanges(previousData, updateData);
      
      if (!user) return;
      await updateOrderService(orderId, user.id, {
        product_id: productId,
      });
      setProductCorrections(prev => {
        const next = new Map(prev);
        next.delete(orderId);
        return next;
      });
      
      // Log user action
      if (user && order) {
        await logUserAction({
          userId: user.id,
          action: 'Update Order Product',
          status: 'success',
          orderId: order.order_id ?? "",
          details: Object.keys(changes).length > 0 ? changes : null,
        });
      }
      
      showSuccess('Product updated successfully!');
    } catch (err) {
      console.error('Error updating product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product. Please try again.';
      showError(errorMessage);
      
      // Log failed action
      if (user && order) {
        await logUserAction({
          userId: user.id,
          action: 'Update Order Product',
          status: 'failed',
          orderId: order.order_id ?? "",
        });
      }
    }
  };

  // Check if order has invalid product
  const isInvalidProduct = (order: Order): boolean => {
    // Invalid if product_id is null/empty OR if product name exists but doesn't match joined product
    if (!order.product_id) {
      return true; // No product_id set
    }
    // If we have joined product data, check if it exists
    if (order.products === null) {
      return true; // product_id exists but product not found (deleted or invalid)
    }
    return false;
  };

  // Get product name for display
  const getProductName = (order: Order): string => {
    if (order.products?.name) {
      return order.products.name;
    }
    if (order.product) {
      return order.product; // Legacy product name
    }
    return 'Unknown Product';
  };


  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Risk Score filtering
    const matchesRiskScore = (() => {
      if (riskScoreFilter === 'all') return true;
      if (order.risk_score === null || order.risk_score === undefined) {
        // If risk_score is null/undefined, only show if "all" is selected
        return riskScoreFilter === 'all';
      }
      const score = order.risk_score;
      switch (riskScoreFilter) {
        case 'low':
          return score <= 30;
        case 'medium':
          return score > 30 && score <= 70;
        case 'high':
          return score > 70;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesRiskScore;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteAllClick = () => {
    if (selectedIds.size === 0) return;
    setDeleteAllModal({
      isOpen: true,
      selectedCount: selectedIds.size,
    });
  };

  const handleDeleteAllConfirm = async () => {
    if (selectedIds.size === 0 || !user) return;

    setDeleteAllLoading(true);
    const idsToDelete = Array.from(selectedIds);
    const ordersToDelete = orders.filter(o => idsToDelete.includes(o.id));
    
    try {
      // 1) Delete orders
      const { error: deleteError } = await deleteOrders(user.id, idsToDelete);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // 2) Delete related invoices
      try {
        await deleteInvoicesByOrderIds(user.id, idsToDelete);
      } catch (invoiceError) {
        console.error("Failed to delete related invoices", invoiceError);
        // Do not rethrow here to avoid breaking the whole flow,
        // but keep the error logged for debugging.
      }
      
      // 3) Log user actions for each order
      const logPromises = ordersToDelete.map(order =>
        logUserAction({
          userId: user.id,
          action: 'Delete Order',
          status: 'success',
          orderId: order.order_id ?? "",
        })
      );
      await Promise.all(logPromises);
      
      // 4) Clear selected IDs
      setSelectedIds(new Set());
      
      // 5) Refresh orders list
      await fetchOrders();
      
      showSuccess(`Successfully deleted ${idsToDelete.length} order${idsToDelete.length > 1 ? 's' : ''}!`);
      setDeleteAllModal({ isOpen: false, selectedCount: 0 });
    } catch (err) {
      console.error('Error deleting orders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete orders. Please try again.';
      showError(errorMessage);
      
      // Log failed actions
      const logPromises = ordersToDelete.map(order =>
        logUserAction({
          userId: user.id,
          action: 'Delete Order',
          status: 'failed',
          orderId: order.order_id ?? "",
        })
      );
      await Promise.all(logPromises);
      
      // Refetch on error to ensure UI reflects current database state
      try {
        await fetchOrders();
      } catch (fetchErr) {
        console.error('Error refetching orders after delete all error:', fetchErr);
      }
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleDeleteAllCancel = () => {
    setDeleteAllModal({ isOpen: false, selectedCount: 0 });
  };

  // Handle action dropdown toggle with auto-flip positioning
  const toggleActionDropdown = (orderId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (openActionDropdown === orderId) {
      setOpenActionDropdown(null);
    } else {
      if (event) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const dropdownWidth = 192; // w-48 = 192px
        const dropdownHeight = 144; // Approximate height of 3 menu items (48px each)
        const padding = 8; // Space between button and dropdown
        
        // Calculate available space below and above
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Determine placement: show below if enough space, otherwise show above
        const placement: 'bottom' | 'top' = spaceBelow >= dropdownHeight + padding ? 'bottom' : 'top';
        
        // Calculate x position (align to right edge of button)
        const x = rect.right - dropdownWidth;
        
        // Calculate y position based on placement
        const y = placement === 'bottom' 
          ? rect.bottom + padding 
          : rect.top - dropdownHeight - padding;
        
        setDropdownPosition({ 
          x: Math.max(8, Math.min(x, window.innerWidth - dropdownWidth - 8)), // Keep within viewport with 8px margin
          y: Math.max(8, Math.min(y, window.innerHeight - dropdownHeight - 8)), // Keep within viewport with 8px margin
          placement
        });
      }
      setOpenActionDropdown(orderId);
    }
  };

  // Handle approve from dropdown
  const handleApproveFromDropdown = async (orderId: string) => {
    setOpenActionDropdown(null);
    await handleApprove(orderId);
  };

  // Handle reject from dropdown
  const handleRejectFromDropdown = async (orderId: string) => {
    setOpenActionDropdown(null);
    await handleReject(orderId);
  };

  // Handle edit from dropdown
  const handleEditFromDropdown = (order: Order) => {
    setOpenActionDropdown(null);
    openOrderModal(order);
  };

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both the button container and the dropdown menu
      const isOutsideButton = !target.closest('.action-dropdown-container');
      const isOutsideDropdown = !target.closest('[data-dropdown-menu]');
      
      if (isOutsideButton && isOutsideDropdown) {
        setOpenActionDropdown(null);
      }
    };

    const handleScroll = () => {
      // Close dropdown on scroll to prevent misalignment
      setOpenActionDropdown(null);
    };

    if (openActionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scrolls
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [openActionDropdown]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      {/* Filters */}
      <Card className="flex-shrink-0">
        <CardHeader className="!pt-3 !pb-2 !px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter size={18} />
              Filters
            </CardTitle>
            <Button onClick={() => openOrderModal(null)} size="sm" className="w-full sm:w-auto">
              <Plus size={16} className="mr-2" />
              Add Order
            </Button>
          </div>
        </CardHeader>
        <CardContent className="!pt-0 !px-4 !pb-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Search by Order ID or Customer…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 !py-2"
            />
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Status</option>
                {availableStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="relative">
              <select
                value={riskScoreFilter}
                onChange={(e) => setRiskScoreFilter(e.target.value)}
                className="w-full h-10 pr-10 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Risk Scores</option>
                <option value="low">≤30</option>
                <option value="medium">30-70</option>
                <option value="high">&gt;70</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="!pt-4 !pb-1 !px-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
                  disabled={loading}
                >
                  {selectedIds.size === filteredOrders.length && filteredOrders.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-[var(--text-muted)]">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteAllClick}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0B0F28] flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete All
                </button>
              )}
            </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-400 mb-4">Error: {error}</p>
                <Button onClick={() => fetchOrders()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : loading && orders.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--text-muted)]">Loading orders...</p>
            </div>
          ) : (
            <>
              <table className="w-full border-separate border-spacing-0 table-fixed">
                  <thead>
                    <tr className="border-b border-[#1E223D]">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                          onChange={handleSelectAll}
                          disabled={loading}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Order ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Customer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Address</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Product</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Amount (VND)</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Payment Method</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Risk Score</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                      <th className="pl-6 pr-10 py-3 text-right text-sm font-semibold text-[#E5E7EB] w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      return (
                        <tr 
                          key={order.id} 
                          onClick={() => handleRowClick(order)}
                          className="border-b border-[#1E223D] hover:bg-white/5 transition cursor-pointer"
                        >
                          <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(order.id)}
                              onChange={() => handleToggleSelect(order.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                          <td 
                            className="px-6 py-4 text-sm text-[#E5E7EB] font-medium align-middle max-w-[140px] truncate whitespace-nowrap"
                            title={order.order_id || order.id}
                          >
                            {order.order_id || order.id}
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-[#E5E7EB] align-middle max-w-[200px] leading-snug whitespace-normal break-words overflow-hidden max-h-[3.2rem]"
                            title={order.customer_name}
                          >
                            {order.customer_name}
                          </td>
                          <td 
                            className="px-6 py-4 text-sm text-[#E5E7EB] align-middle whitespace-nowrap"
                            title={order.phone || undefined}
                          >
                            {order.phone || '-'}
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-[#E5E7EB] align-middle max-w-[220px] leading-snug whitespace-normal break-words overflow-hidden max-h-[3.2rem]"
                            title={order.address || undefined}
                          >
                            {order.address || '-'}
                          </td>
                          <td className="px-6 py-4 align-middle max-w-[260px] leading-snug whitespace-normal break-words overflow-hidden max-h-[3.2rem]" onClick={(e) => e.stopPropagation()}>
                            {isInvalidProduct(order) ? (
                              <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 border border-red-600 text-red-300 text-xs break-words overflow-hidden"
                                    title={getProductName(order)}
                                  >
                                    <AlertTriangle size={12} className="flex-shrink-0" />
                                    <span className="break-words overflow-hidden">{getProductName(order)}</span>
                                  </span>
                                </div>
                                <div className="relative">
                                  <select
                                    value={productCorrections.get(order.id) || ''}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        setProductCorrections(prev => {
                                          const next = new Map(prev);
                                          next.set(order.id, e.target.value);
                                          return next;
                                        });
                                        handleProductCorrection(order.id, e.target.value);
                                      }
                                    }}
                                    className="w-full pr-10 px-2 py-1.5 text-xs bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50"
                                  >
                                    <option value="">Select product</option>
                                    {products.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.name}
                                      </option>
                                    ))}
                                  </select>
                                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                <p className="text-xs text-red-400">Invalid product. Please select from the list.</p>
                              </div>
                            ) : (
                              <div 
                                className="text-sm text-[#E5E7EB] break-words overflow-hidden"
                                title={getProductName(order)}
                              >
                                {getProductName(order)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] align-middle whitespace-nowrap">
                            {order.amount.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] align-middle whitespace-nowrap">
                            {order.payment_method || 'COD'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] align-middle whitespace-nowrap">
                            {order.risk_score !== null && order.risk_score !== undefined ? order.risk_score : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] align-middle whitespace-nowrap">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative action-dropdown-container flex justify-end">
                              <Button
                                onClick={(e) => toggleActionDropdown(order.id, e)}
                                size="sm"
                                className="!px-3 !py-1.5 !text-xs"
                              >
                                <span>Action</span>
                                <ChevronDown 
                                  size={14} 
                                  className={`ml-1.5 transition-transform duration-200 ${openActionDropdown === order.id ? 'rotate-180' : ''}`}
                                />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              {filteredOrders.length === 0 && !loading && (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  {orders.length === 0
                    ? 'No orders found.'
                    : 'No orders match your filters.'}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dropdown Menu - Rendered via Portal */}
      {openActionDropdown && typeof document !== 'undefined' && (() => {
        const order = filteredOrders.find(o => o.id === openActionDropdown);
        if (!order) return null;
        
        const dropdownContent = (
          <div
            data-dropdown-menu
            className="fixed z-[9999] w-48 bg-[#1E223D] border border-white/20 rounded-lg shadow-xl overflow-hidden backdrop-blur-md"
            style={{ 
              top: `${dropdownPosition.y}px`, 
              left: `${dropdownPosition.x}px`,
              // Add animation based on placement
              transformOrigin: dropdownPosition.placement === 'top' ? 'bottom center' : 'top center',
            }}
          >
            <button
              onClick={() => handleEditFromDropdown(order)}
              className="w-full px-4 py-3 text-left text-sm text-[#E5E7EB] hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              <Edit size={16} className="text-blue-400 flex-shrink-0" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleApproveFromDropdown(order.id)}
              className="w-full px-4 py-3 text-left text-sm text-[#E5E7EB] hover:bg-green-500/20 hover:text-green-400 transition-colors flex items-center gap-2 border-t border-white/10"
            >
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => handleRejectFromDropdown(order.id)}
              className="w-full px-4 py-3 text-left text-sm text-[#E5E7EB] hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center gap-2 border-t border-white/10"
            >
              <XCircle size={16} className="text-red-400 flex-shrink-0" />
              <span>Reject</span>
            </button>
          </div>
        );
        
        // Render dropdown via Portal to document.body to escape parent containers
        return createPortal(dropdownContent, document.body);
      })()}

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={deleteAllModal.isOpen}
        message={`Are you sure you want to delete ${deleteAllModal.selectedCount} selected order${deleteAllModal.selectedCount > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={`Delete ${deleteAllModal.selectedCount} Order${deleteAllModal.selectedCount > 1 ? 's' : ''}`}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteAllConfirm}
        onCancel={handleDeleteAllCancel}
        loading={deleteAllLoading}
      />

      <RejectOrderModal
        isOpen={isRejectModalOpen}
        mode={rejectMode}
        reason={rejectReason}
        onModeChange={setRejectMode}
        onReasonChange={setRejectReason}
        onConfirm={handleConfirmReject}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectTargetOrder(null);
          setRejectReason('');
        }}
        loading={rejectLoading}
      />

      {/* Side Panel - Order Detail */}
      {isSidePanelOpen && selectedOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40"
            onClick={closeSidePanel}
          />

          {/* Side Panel */}
          <div className="w-full max-w-xl h-full bg-[#020617] border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Order Detail</h2>
                <p className="text-sm text-white/60">#{selectedOrder.order_id}</p>
              </div>
              <button
                onClick={closeSidePanel}
                className="text-white/60 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <section className="space-y-1">
                <div className="text-sm text-white/60">Customer</div>
                <div className="font-medium text-white">{selectedOrder.customer_name}</div>
                <div className="text-sm text-white/70">{selectedOrder.phone}</div>
                <div className="text-sm text-white/70">{selectedOrder.address || '-'}</div>
              </section>

              {/* Payment & Risk */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Payment Method</span>
                  <span className="text-sm text-white">{selectedOrder.payment_method || 'COD'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Risk</span>
                  <span className="text-sm text-white">
                    {selectedOrder.risk_level
                      ? `${selectedOrder.risk_level} (${selectedOrder.risk_score ?? 0})`
                      : selectedOrder.risk_score ?? 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Status</span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </section>

              {/* Risk Breakdown */}
              {(() => {
                const riskDetails = getLatestRiskEvent();
                return riskDetails.reasons.length > 0 && (
                  <section className="space-y-1">
                    <div className="text-sm text-white/60">Risk breakdown</div>
                    <ul className="list-disc list-inside text-xs text-white/70 space-y-0.5">
                      {riskDetails.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </section>
                );
              })()}

              {/* Timeline */}
              <section>
                <div className="text-sm font-medium text-white mb-2">Timeline</div>

                {orderEvents.length === 0 && (
                  <div className="text-white/60 text-sm">
                    No events yet.
                  </div>
                )}

                <div className="space-y-3">
                  {orderEvents.map(evt => {
                    const { title, subtitle } = getEventDisplay(evt);
                    return (
                      <div key={evt.id} className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-white/60 mt-1" />
                        <div>
                          <div className="text-white">{title}</div>
                          <div className="text-xs text-white/50">
                            {new Date(evt.created_at).toLocaleString()}
                          </div>
                          {subtitle && (
                            <div className="text-xs text-white/60 mt-0.5">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-white/10 flex flex-wrap gap-2">
              <button
                className="px-4 py-2 bg-blue-600 rounded text-white"
                onClick={async () => {
                  try {
                    await simulateCustomerConfirmed(selectedOrder);
                    await loadOrderEvents(selectedOrder.id);
                    await fetchOrders();
                    closeSidePanel();
                  } catch (err) {
                    console.error('Error simulating confirmed:', err);
                    // Panel stays open on error
                  }
                }}
              >
                Simulate Confirmed
              </button>

              <button
                className="px-4 py-2 bg-yellow-600 rounded text-white"
                onClick={async () => {
                  try {
                    await simulateCustomerCancelled(selectedOrder, 'Dev test');
                    await loadOrderEvents(selectedOrder.id);
                    await fetchOrders();
                    closeSidePanel();
                  } catch (err) {
                    console.error('Error simulating cancelled:', err);
                    // Panel stays open on error
                  }
                }}
              >
                Simulate Cancelled
              </button>

              <button
                className="px-4 py-2 bg-green-600 rounded text-white"
                onClick={async () => {
                  try {
                    await simulateCustomerPaid(selectedOrder);
                    await loadOrderEvents(selectedOrder.id);
                    await fetchOrders();
                    closeSidePanel();
                  } catch (err) {
                    console.error('Error simulating paid:', err);
                    // Panel stays open on error
                  }
                }}
              >
                Simulate Paid
              </button>

              {(() => {
                const rawMethod = selectedOrder?.payment_method || 'COD';
                const method = rawMethod.toUpperCase();
                const isCOD = method === 'COD';
                const canMarkAsDelivering =
                  selectedOrder?.status === ORDER_STATUS.ORDER_PAID ||
                  (selectedOrder?.status === ORDER_STATUS.CUSTOMER_CONFIRMED && isCOD);
                
                return canMarkAsDelivering && (
                  <button
                    className="px-4 py-2 bg-indigo-600 rounded text-white"
                    onClick={async () => {
                      await handleMarkShipped(selectedOrder);
                    }}
                  >
                    Mark as Delivering
                  </button>
                );
              })()}

              {selectedOrder.status === ORDER_STATUS.DELIVERING && (
                <button
                  className="px-4 py-2 bg-emerald-600 rounded text-white"
                  onClick={async () => {
                    await handleMarkCompleted(selectedOrder);
                  }}
                >
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

