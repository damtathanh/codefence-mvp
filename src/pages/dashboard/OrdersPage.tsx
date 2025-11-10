import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CheckCircle, XCircle, Filter, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { AddOrderModal } from '../../components/dashboard/AddOrderModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
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
  const [deleteAllModal, setDeleteAllModal] = useState<{
    isOpen: boolean;
    selectedCount: number;
  }>({
    isOpen: false,
    selectedCount: 0,
  });
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

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
    try {
      await updateOrder(orderId, {
        status: 'Approved',
      });
      showSuccess('Order approved successfully!');
    } catch (err) {
      console.error('Error approving order:', err);
      showError('Failed to approve order. Please try again.');
    }
  };

  const handleReject = async (orderId: string) => {
    // TODO: Implement rejection logic
    try {
      await updateOrder(orderId, {
        status: 'Rejected',
      });
      showSuccess('Order rejected successfully!');
    } catch (err) {
      console.error('Error rejecting order:', err);
      showError('Failed to reject order. Please try again.');
    }
  };

  // Handle product correction
  const handleProductCorrection = async (orderId: string, productId: string) => {
    try {
      await updateOrder(orderId, {
        product_id: productId,
      });
      setProductCorrections(prev => {
        const next = new Map(prev);
        next.delete(orderId);
        return next;
      });
      showSuccess('Product updated successfully!');
    } catch (err) {
      console.error('Error updating product:', err);
      showError('Failed to update product. Please try again.');
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
    return matchesSearch && matchesStatus;
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
    try {
      const idsToDelete = Array.from(selectedIds);
      
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

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Loading orders...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-400">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Search by Order ID or Customer"
              placeholder="Enter Order ID or Customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-6 pb-3 pt-0 border-b border-[#1E223D] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E223D]">
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB] w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Order ID</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Customer</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Phone</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Address</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Product</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Amount</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Risk Score</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => handleToggleSelect(order.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB] font-medium">{order.order_id || order.id}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{order.customer_name}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{order.phone || '-'}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{order.address || '-'}</td>
                      <td className="px-6 py-5">
                        {isInvalidProduct(order) ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 border border-red-600 text-red-300 text-xs">
                                <AlertTriangle size={12} />
                                {getProductName(order)}
                              </span>
                            </div>
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
                              className="w-full px-2 py-1.5 text-xs bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50"
                            >
                              <option value="">Select product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-red-400">Invalid product. Please select from the list.</p>
                          </div>
                        ) : (
                          <span className="text-sm text-[#E5E7EB]">{getProductName(order)}</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                        {order.amount.toLocaleString('vi-VN')} VND
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                        {order.risk_score || 'N/A'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApprove(order.id)}
                            className="!px-3 !py-1.5"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReject(order.id)}
                            className="!px-3 !py-1.5"
                          >
                            <XCircle size={14} className="mr-1" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                {orders.length === 0
                  ? 'No orders found.'
                  : 'No orders match your filters.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Order Modal */}
      <AddOrderModal
        isOpen={isAddOrderModalOpen}
        onClose={() => setIsAddOrderModalOpen(false)}
        onSuccess={() => {
          fetchOrders();
          setIsAddOrderModalOpen(false);
        }}
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

