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
      <div className="flex flex-col h-full min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 flex items-center justify-center">
            <p className="text-[var(--text-muted)]">Loading invoices...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <p className="text-red-400 mb-4">Error: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      {/* Filters */}
      <Card className="flex-shrink-0">
        <CardHeader className="!pt-3 !pb-2 !px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter size={18} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="!pt-0 !px-4 !pb-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Search by Invoice ID, Order ID, or Customer…"
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
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 !py-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="!pt-4 !pb-3 !px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
              >
                {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0
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
              <Button onClick={handleDownloadAll} size="sm">
                <Download size={16} className="mr-2" />
                Download All ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent">
            <table className="min-w-[1100px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-[#1E223D]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Invoice ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Order ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Amount (VND)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  return (
                    <tr key={invoice.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                      <td className="px-6 py-4 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(invoice.id)}
                          onChange={() => handleToggleSelect(invoice.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E5E7EB] font-medium whitespace-nowrap align-middle">
                        {invoice.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                        {invoice.order_id}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-[#E5E7EB] align-middle"
                        title={invoice.customer_name || undefined}
                      >
                        <span className="block truncate whitespace-nowrap max-w-[200px]">
                          {invoice.customer_name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                        {invoice.amount.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                        {invoice.date}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
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
              <div className="p-12 text-center text-[var(--text-muted)]">
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

