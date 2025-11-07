import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, Filter } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import type { Invoice, Order } from '../../types/supabase';

interface InvoiceWithCustomer extends Invoice {
  customer_name?: string;
}

export const InvoicePage: React.FC = () => {
  const { user } = useAuth();
  const {
    data: invoices,
    loading,
    error,
    updateItem,
  } = useSupabaseTable<Invoice>({ tableName: 'invoices', enableRealtime: true });
  const [invoicesWithCustomers, setInvoicesWithCustomers] = useState<InvoiceWithCustomer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Fetch orders to get customer names
  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, customer_name')
        .eq('user_id', user.id);
      if (data) setOrders(data as Order[]);
    };
    fetchOrders();
  }, [user]);

  // Merge invoices with customer names
  useEffect(() => {
    const merged = invoices.map(invoice => {
      const order = orders.find(o => o.id === invoice.order_id);
      return { ...invoice, customer_name: order?.customer_name || 'Unknown Customer' };
    });
    setInvoicesWithCustomers(merged);
  }, [invoices, orders]);

  const handleDownload = (invoice: InvoiceWithCustomer) => {
    // In a real app, this would generate/download a PDF
    alert(`Downloading invoice ${invoice.id}`);
  };

  const handleDownloadAll = () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one invoice to download');
      return;
    }
    const selectedInvoices = invoicesWithCustomers.filter(inv => selectedIds.has(inv.id));
    // In a real app, this would generate/download multiple PDFs or a zip file
    alert(`Downloading ${selectedIds.size} invoice(s): ${selectedInvoices.map(inv => inv.id).join(', ')}`);
  };

  const handleStatusUpdate = async (id: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    try {
      await updateItem(id, { status: newStatus });
    } catch (err) {
      console.error('Error updating invoice status:', err);
      alert('Failed to update invoice status. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { className: 'bg-green-500/20 text-green-400', label: 'Paid' };
      case 'overdue':
        return { className: 'bg-red-500/20 text-red-400', label: 'Overdue' };
      default:
        return { className: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' };
    }
  };

  const filteredInvoices = invoicesWithCustomers.filter(invoice => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesDate = !dateFilter || invoice.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
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

  if (loading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Invoice</h1>
          <p className="text-[#E5E7EB]/70 text-lg">Manage and download invoices</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Loading invoices...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Invoice</h1>
          <p className="text-[#E5E7EB]/70 text-lg">Manage and download invoices</p>
        </div>
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
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Invoice</h1>
        <p className="text-[#E5E7EB]/70 text-lg">Manage and download invoices</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="!pt-4 !pb-3 !px-6">
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search by Invoice ID, Order ID, or Customer"
              placeholder="Enter Invoice ID, Order ID, or Customer name..."
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
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
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
                {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0
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
              <Button onClick={handleDownloadAll} size="sm">
                <Download size={16} className="mr-2" />
                Download All ({selectedIds.size})
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E223D]">
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB] w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Invoice ID</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Order ID</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Customer</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Amount</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Date</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  return (
                    <tr key={invoice.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(invoice.id)}
                          onChange={() => handleToggleSelect(invoice.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB] font-medium">{invoice.id}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{invoice.order_id}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{invoice.customer_name || 'Unknown'}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                        {invoice.amount.toLocaleString('vi-VN')} VND
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{invoice.date}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload(invoice)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#E5E7EB] transition"
                          >
                            <Download size={16} />
                            <span className="text-sm">Download</span>
                          </button>
                          {invoice.status !== 'paid' && (
                            <button
                              onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                              className="px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition text-sm"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredInvoices.length === 0 && (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                {invoices.length === 0
                  ? 'No invoices found.'
                  : 'No invoices match your filters.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

