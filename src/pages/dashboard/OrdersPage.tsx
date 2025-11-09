import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ShieldCheck, X, Filter } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import type { Order, Product } from '../../types/supabase';

interface OrderWithProduct extends Order {
  product_name?: string;
}

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const {
    data: orders,
    loading,
    error,
    updateItem,
  } = useSupabaseTable<Order>({ tableName: 'orders', enableRealtime: true });
  const [ordersWithProducts, setOrdersWithProducts] = useState<OrderWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Fetch products to get product names
  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id);
      if (data) setProducts(data as Product[]);
    };
    fetchProducts();
  }, [user]);

  // Merge orders with product names
  useEffect(() => {
    const merged = orders.map(order => {
      const product = products.find(p => p.id === order.product_id);
      return { ...order, product_name: product?.name || 'Unknown Product' };
    });
    setOrdersWithProducts(merged);
  }, [orders, products]);

  const handleVerify = (order: OrderWithProduct) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const confirmVerification = async (approved: boolean) => {
    if (selectedOrder) {
      try {
        await updateItem(selectedOrder.id, {
          status: approved ? 'verified' : 'rejected',
        });
        // Create history entry
        if (user) {
          await supabase.from('history').insert({
            user_id: user.id,
            order_id: selectedOrder.id,
            action: approved ? 'Order Verified' : 'Order Rejected',
            status: approved ? 'verified' : 'rejected',
          });
        }
      } catch (err) {
        console.error('Error updating order:', err);
        alert('Failed to update order. Please try again.');
        return;
      }
    }
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const getRiskBadge = (score: number, level?: string) => {
    const riskLevel = level || (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');
    if (riskLevel === 'high') return { variant: 'danger' as const, label: 'High Risk' };
    if (riskLevel === 'medium') return { variant: 'warning' as const, label: 'Medium Risk' };
    return { variant: 'success' as const, label: 'Low Risk' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { className: 'bg-green-500/20 text-green-400', label: 'Verified' };
      case 'rejected':
        return { className: 'bg-red-500/20 text-red-400', label: 'Rejected' };
      default:
        return { className: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' };
    }
  };

  const filteredOrders = ordersWithProducts.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesRisk = riskFilter === 'all' ||
      (riskFilter === 'high' && order.risk_score >= 70) ||
      (riskFilter === 'medium' && order.risk_score >= 40 && order.risk_score < 70) ||
      (riskFilter === 'low' && order.risk_score < 40);
    const matchesDate = !dateFilter || order.date === dateFilter;
    return matchesSearch && matchesStatus && matchesRisk && matchesDate;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
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
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Risk Score</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk (≥70)</option>
                <option value="medium">Medium Risk (40-69)</option>
                <option value="low">Low Risk (&lt;40)</option>
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-[#1E223D] flex items-center justify-between">
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
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Date</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Product</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Amount</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Risk Score</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const riskBadge = getRiskBadge(order.risk_score, order.risk_level);
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
                      <td className="px-6 py-5 text-sm text-[#E5E7EB] font-medium">{order.id}</td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-[#E5E7EB]">{order.customer_name}</div>
                        <div className="text-xs text-[#E5E7EB]/70 mt-1">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{order.date}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{order.product_name || 'Unknown'}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                        {order.amount.toLocaleString('vi-VN')} VND
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant={riskBadge.variant}>{riskBadge.label}</Badge>
                        <div className="text-xs text-[#E5E7EB]/70 mt-2">Score: {order.risk_score}/100</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {order.status === 'pending' && (
                          <Button size="sm" onClick={() => handleVerify(order)}>
                            <ShieldCheck size={16} className="mr-1" />
                            Verify
                          </Button>
                        )}
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

      {/* Verification Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#E5E7EB]">Verify Order</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#E5E7EB]/70 hover:text-[#E5E7EB]">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-sm text-[#E5E7EB]/70">Order ID</label>
                <p className="text-[#E5E7EB] font-medium">{selectedOrder.id}</p>
              </div>
              <div>
                <label className="text-sm text-[#E5E7EB]/70">Customer</label>
                <p className="text-[#E5E7EB]">{selectedOrder.customer_name}</p>
                <p className="text-sm text-[#E5E7EB]/70">{selectedOrder.customer_phone}</p>
              </div>
              <div>
                <label className="text-sm text-[#E5E7EB]/70">Product</label>
                <p className="text-[#E5E7EB]">{selectedOrder.product_name || 'Unknown'}</p>
              </div>
              <div>
                <label className="text-sm text-[#E5E7EB]/70">Amount</label>
                <p className="text-[#E5E7EB] font-medium">
                  {selectedOrder.amount.toLocaleString('vi-VN')} VND
                </p>
              </div>
              <div>
                <label className="text-sm text-[#E5E7EB]/70">Risk Score</label>
                <Badge variant={getRiskBadge(selectedOrder.risk_score, selectedOrder.risk_level).variant}>
                  {getRiskBadge(selectedOrder.risk_score, selectedOrder.risk_level).label} ({selectedOrder.risk_score}/100)
                </Badge>
              </div>
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#1E223D]">
                <Button variant="outline" onClick={() => confirmVerification(false)}>
                  Reject
                </Button>
                <Button onClick={() => confirmVerification(true)}>
                  Approve & Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

