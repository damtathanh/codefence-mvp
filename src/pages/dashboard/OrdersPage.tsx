import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CheckCircle, XCircle, Filter, Plus, AlertTriangle, Trash2, MoreVertical, ChevronDown, Edit } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { AddOrderModal } from '../../components/dashboard/AddOrderModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { logUserAction } from '../../utils/logUserAction';
import type { Order, Product } from '../../types/supabase';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCorrections, setProductCorrections] = useState<Map<string, string>>(new Map()); // orderId -> product_id
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);

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
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          products:product_id (
            id,
            name,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
        console.error('Error fetching products:', productsError);
      } else {
        setProducts((productsData as Product[]) || []);
      }

      setOrders((ordersData as Order[]) || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
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
  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .eq('user_id', user.id);

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
    // TODO: Implement Zalo OA message flow
    const order = orders.find(o => o.id === orderId);
    const orderIdentifier = order?.order_id || orderId;
    
    try {
      await updateOrder(orderId, {
        status: 'Approved',
      });
      
      // Log user action
      if (user && order) {
        await logUserAction({
          userId: user.id,
          action: 'Approve Order',
          status: 'success',
          orderId: orderId,
        });
      }
      
      showSuccess('Order approved successfully!');
    } catch (err) {
      console.error('Error approving order:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve order. Please try again.';
      showError(errorMessage);
      
      // Log failed action
      if (user && order) {
        await logUserAction({
          userId: user.id,
          action: 'Approve Order',
          status: 'failed',
          orderId: orderId,
        });
      }
    }
  };

  const handleReject = async (orderId: string) => {
    // TODO: Implement rejection logic
    const order = orders.find(o => o.id === orderId);
    const orderIdentifier = order?.order_id || orderId;
    
    try {
      await updateOrder(orderId, {
        status: 'Rejected',
      });
      
      // Log user action
      if (user && order) {
        await logUserAction({
          userId: user.id,
          action: 'Reject Order',
          status: 'success',
          orderId: orderId,
        });
      }
      
      showSuccess('Order rejected successfully!');
    } catch (err) {
      console.error('Error rejecting order:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject order. Please try again.';
      showError(errorMessage);
      
      // Log failed action
      if (user && order) {
        await logUserAction({
          userId: user.id,
          action: 'Reject Order',
          status: 'failed',
          orderId: orderId,
        });
      }
    }
  };

  // Handle product correction
  const handleProductCorrection = async (orderId: string, productId: string) => {
    const order = orders.find(o => o.id === orderId);
    const product = products.find(p => p.id === productId);
    const orderIdentifier = order?.order_id || orderId;
    
    try {
      await updateOrder(orderId, {
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
          orderId: orderId,
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
          orderId: orderId,
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

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved' || statusLower === 'verified') {
      return { className: 'bg-green-500/20 text-green-400', label: status };
    }
    if (statusLower === 'rejected') {
      return { className: 'bg-red-500/20 text-red-400', label: status };
    }
    return { className: 'bg-yellow-500/20 text-yellow-400', label: status || 'Pending' };
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
      // Delete all selected orders in parallel
      const deletePromises = idsToDelete.map(id =>
        supabase
          .from('orders')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
      );
      
      const results = await Promise.all(deletePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} order(s).`);
      }
      
      // Log user actions for each deleted order
      const logPromises = ordersToDelete.map(order =>
        logUserAction({
          userId: user.id,
          action: 'Delete Order',
          status: 'success',
          orderId: order.id,
        })
      );
      await Promise.all(logPromises);
      
      // Clear selected IDs
      setSelectedIds(new Set());
      
      // Refresh orders list
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
          orderId: order.id,
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
    setEditingOrder(order);
    setIsEditOrderModalOpen(true);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setIsEditOrderModalOpen(false);
    setEditingOrder(null);
  };

  // Handle edit modal success
  const handleEditModalSuccess = () => {
    fetchOrders();
    handleEditModalClose();
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
    <div className="w-full max-w-full space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="!pt-4 !pb-3 !px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter size={20} />
              Filters
            </CardTitle>
            <Button onClick={() => setIsAddOrderModalOpen(true)} className="w-full sm:w-auto">
              <Plus size={20} className="mr-2" />
              Add Order
            </Button>
          </div>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search by Order ID or Customer"
              placeholder="Enter Order ID or Customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pr-10 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Risk Score</label>
              <div className="relative">
                <select
                  value={riskScoreFilter}
                  onChange={(e) => setRiskScoreFilter(e.target.value)}
                  className="w-full pr-10 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
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
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardContent className="p-0">
          <div className="px-6 pb-3 pt-4 border-b border-[#1E223D] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition"
                disabled={loading}
              >
                {selectedIds.size === filteredOrders.length && filteredOrders.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-[#E5E7EB]/70">
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
          <div className="w-full overflow-visible">
            {error ? (
              <div className="p-12 text-center">
                <p className="text-red-400 mb-4">Error: {error}</p>
                <Button onClick={() => fetchOrders()} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : loading && orders.length === 0 ? (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                Loading orders...
              </div>
            ) : (
              <>
                <table className="w-full border-separate border-spacing-0 table-fixed">
                  <thead>
                    <tr className="border-b border-[#1E223D]">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                          onChange={handleSelectAll}
                          disabled={loading}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Order ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Customer</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Phone</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Address</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Amount (VND)</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-[#E5E7EB]">Risk Score</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const statusBadge = getStatusBadge(order.status);
                      return (
                        <tr key={order.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                          <td className="px-6 py-4 align-middle">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(order.id)}
                              onChange={() => handleToggleSelect(order.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                          <td 
                            className="px-6 py-4 text-sm text-[#E5E7EB] font-medium align-middle truncate whitespace-nowrap overflow-hidden max-w-[120px]"
                            title={order.order_id || order.id}
                          >
                            {order.order_id || order.id}
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-[#E5E7EB] align-middle truncate whitespace-nowrap overflow-hidden max-w-[200px]"
                            title={order.customer_name}
                          >
                            {order.customer_name}
                          </td>
                          <td 
                            className="px-6 py-4 text-sm text-[#E5E7EB] align-middle truncate whitespace-nowrap overflow-hidden max-w-[150px]"
                            title={order.phone || undefined}
                          >
                            {order.phone || '-'}
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-[#E5E7EB] align-middle truncate whitespace-nowrap overflow-hidden max-w-[150px]"
                            title={order.address || undefined}
                          >
                            {order.address || '-'}
                          </td>
                          <td className="px-6 py-4 align-middle break-words overflow-hidden">
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
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] align-middle break-words overflow-hidden">
                            {order.amount.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] text-center align-middle break-words overflow-hidden">
                            {order.risk_score !== null && order.risk_score !== undefined ? order.risk_score : 'N/A'}
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <div className="relative action-dropdown-container">
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
                  <div className="p-12 text-center text-[#E5E7EB]/70">
                    {orders.length === 0
                      ? 'No orders found.'
                      : 'No orders match your filters.'}
                  </div>
                )}
              </>
            )}
          </div>
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

      {/* Add Order Modal */}
      <AddOrderModal
        isOpen={isAddOrderModalOpen}
        onClose={() => setIsAddOrderModalOpen(false)}
        onSuccess={() => {
          fetchOrders();
          setIsAddOrderModalOpen(false);
        }}
      />

      {/* Edit Order Modal */}
      <AddOrderModal
        isOpen={isEditOrderModalOpen}
        onClose={handleEditModalClose}
        onSuccess={handleEditModalSuccess}
        editingOrder={editingOrder}
      />

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
    </div>
  );
};

