import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { Invoice, Order } from '../../types/supabase';
import { ensureInvoicePdfStored } from '../../features/invoices/services/invoiceStorage';
import { fetchInvoicesByUser, markInvoiceAsPaid } from '../../features/invoices/services/invoiceService';
import { markOrderAsPaid } from '../../features/orders/services/ordersService';
import { logOrderPaidEvent } from '../../features/orders/services/orderEventsService';
import { Pagination } from '../../components/ui/Pagination';
import { downloadFileDirectly } from '../../features/invoices/utils/invoiceDownload';

interface InvoiceWithCustomer extends Invoice {
  customer_name?: string;
}

export const InvoicePage: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoicesWithCustomers, setInvoicesWithCustomers] = useState<InvoiceWithCustomer[]>([]);
  const [ordersMap, setOrdersMap] = useState<Map<string, Order>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isMarkingMap, setIsMarkingMap] = useState<Record<string, boolean>>({});

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('');
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 200;

  // Fetch invoices when page or filters change
  useEffect(() => {
    if (!user) return;

    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const { invoices: invoicesData, totalCount: count, error: invoicesError } = await fetchInvoicesByUser(
          user.id,
          page,
          PAGE_SIZE,
          {
            searchQuery,
            status: statusFilter,
            date: dateFilter
          }
        );

        if (invoicesError) throw invoicesError;

        setTotalCount(count);

        if (!invoicesData || invoicesData.length === 0) {
          setInvoices([]);
          setLoading(false);
          return;
        }

        // Fetch related orders for the current page of invoices
        const orderIds = invoicesData.map(inv => inv.order_id).filter(Boolean);

        let ordersMapLocal = new Map<string, { order_id: string | null; customer_name: string | null }>();
        let fullOrdersMap = new Map<string, Order>();

        if (orderIds.length > 0) {
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('id, order_id, customer_name, phone, address, product, amount, discount_amount, shipping_fee')
            .eq('user_id', user.id)
            .in('id', orderIds);

          if (!ordersError && ordersData) {
            ordersData.forEach(order => {
              ordersMapLocal.set(order.id, {
                order_id: order.order_id || null,
                customer_name: order.customer_name || null,
              });
              fullOrdersMap.set(order.id, order as Order);
            });
          }
        }

        // Merge invoices with order data
        const invoicesWithOrders = invoicesData.map(invoice => ({
          ...invoice,
          orders: ordersMapLocal.get(invoice.order_id) || null,
        }));

        setInvoices(invoicesWithOrders as Invoice[]);
        setOrdersMap(fullOrdersMap);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user, page, searchQuery, statusFilter, dateFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  // Real-time subscription (simplified to just refetch current page)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` },
        () => {
          // For now, we rely on manual refresh or navigation.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Merge invoices with customer names from joined orders
  useEffect(() => {
    const merged = invoices.map(invoice => ({
      ...invoice,
      customer_name: invoice.orders?.customer_name || 'Unknown Customer',
    }));
    setInvoicesWithCustomers(merged);
  }, [invoices]);

  // Helper to check if invoice can be downloaded
  const canDownloadInvoice = (invoice: Invoice) => {
    return invoice.status === 'Paid' || invoice.status === 'Refunded';
  };

  const formatVnd = (n: any) => {
    const num = Number(n || 0);
    return num.toLocaleString('vi-VN');
  };

  const getInvoiceDisplayAmount = (inv: Invoice & { orders?: any }) => {
    const order = ordersMap.get(inv.order_id);

    if (order) {
      const subtotal =
        (order as any).subtotal ??
        order.amount ??
        0;

      const discount =
        order.discount_amount ??
        (inv as any).discount_amount ??
        0;

      const shipping =
        order.shipping_fee ??
        (inv as any).shipping_fee ??
        0;

      return subtotal + shipping - discount;
    }

    // Fallback: use invoice fields only
    const subtotal =
      (inv as any).subtotal ??
      inv.amount ??
      0;

    const discount =
      (inv as any).discount_amount ??
      0;

    const shipping =
      (inv as any).shipping_fee ??
      0;

    return subtotal + shipping - discount;
  };

  const handleDownload = async (invoice: InvoiceWithCustomer) => {
    if (!canDownloadInvoice(invoice)) {
      alert('Only Paid or Refunded invoices can be downloaded.');
      return;
    }

    try {
      // Fetch fresh order data from Supabase for accurate invoice generation
      const { data: freshOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', invoice.order_id)
        .eq('user_id', user?.id)
        .single();

      if (orderError || !freshOrder) {
        console.error('Failed to fetch fresh order data for invoice', invoice.id, orderError);
        alert('Order not found for this invoice.');
        return;
      }

      // Fetch current user's profile for seller info
      // Use profile from hook if available, otherwise fetch directly
      let sellerProfile = {
        company_name: profile?.company_name || undefined,
        email: profile?.email || undefined,
        phone: profile?.phone || undefined,
        website: undefined,
        address: undefined,
      };

      // If profile not loaded yet, fetch it directly
      if (!profile && user) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
          const { data: profileData } = await supabase
            .from("users_profile")
            .select("company_name, email, phone, website, address")
            .eq("id", userId)
            .maybeSingle();

          if (profileData) {
            sellerProfile = {
              company_name: profileData.company_name || undefined,
              email: profileData.email || undefined,
              phone: profileData.phone || undefined,
              website: (profileData as any).website || undefined,
              address: (profileData as any).address || undefined,
            };
          }
        }
      }

      // 🚨 Quan trọng: bỏ cache pdf_url cũ, ép generate lại
      const invoiceWithoutCache: Invoice = {
        ...(invoice as Invoice),
        pdf_url: null,
      };

      // Always use ensureInvoicePdfStored - it handles caching and invalidation
      const pdfUrl = await ensureInvoicePdfStored(
        invoiceWithoutCache,
        freshOrder as Order,
        sellerProfile
      );

      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      } else {
        alert('Failed to generate invoice PDF. Please try again.');
      }
    } catch (err) {
      console.error('Failed to download invoice PDF', err);
      alert('Failed to download invoice PDF. Please try again.');
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!invoice.order_id) return;

    try {
      setIsMarkingMap((prev) => ({ ...prev, [invoice.id]: true }));

      // 1) Mark invoice paid
      const updatedInvoice = await markInvoiceAsPaid(invoice.id);

      // 2) Mark related order paid
      await markOrderAsPaid(invoice.order_id);

      // 3) Log order event
      await logOrderPaidEvent(invoice.order_id);

      // 4) Optimistic UI update
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, status: 'Paid', paid_at: updatedInvoice.paid_at, date: updatedInvoice.date }
            : inv
        )
      );

      // Also update the filtered list if needed (it's derived from invoices state so useEffect handles it, 
      // but invoicesWithCustomers is a separate state that needs update or it will be stale until effect runs)
      // Actually invoicesWithCustomers is updated via useEffect [invoices], so just updating invoices is enough.

    } catch (error) {
      console.error('Failed to mark invoice as paid', error);
      alert('Failed to mark invoice as paid. Please try again.');
    } finally {
      setIsMarkingMap((prev) => ({ ...prev, [invoice.id]: false }));
    }
  };

  const handleDownloadAll = async () => {
    const selectedDownloadable = invoicesWithCustomers.filter(
      (inv) => selectedIds.has(inv.id) && canDownloadInvoice(inv)
    );

    if (selectedDownloadable.length === 0) {
      alert('No downloadable invoices selected. Only Paid or Refunded invoices can be downloaded.');
      return;
    }

    // Prepare seller profile once
    let sellerProfile = {
      company_name: profile?.company_name || undefined,
      email: profile?.email || undefined,
      phone: profile?.phone || undefined,
      website: undefined,
      address: undefined,
    };

    // If profile not loaded yet, fetch it directly (same logic as handleDownload)
    if (!profile && user) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
          const { data: profileData } = await supabase
            .from("users_profile")
            .select("company_name, email, phone, website, address")
            .eq("id", userId)
            .maybeSingle();

          if (profileData) {
            sellerProfile = {
              company_name: profileData.company_name || undefined,
              email: profileData.email || undefined,
              phone: profileData.phone || undefined,
              website: (profileData as any).website || undefined,
              address: (profileData as any).address || undefined,
            };
          }
        }
      } catch (err) {
        console.error('Error fetching profile for bulk download:', err);
      }
    }

    // Download each invoice PDF sequentially
    for (const inv of selectedDownloadable) {
      try {
        // Fetch fresh order data from Supabase for accurate invoice generation
        const { data: freshOrder, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', inv.order_id)
          .eq('user_id', user?.id)
          .single();

        if (orderError || !freshOrder) {
          console.warn(`Failed to fetch fresh order data for invoice ${inv.id}`, orderError);
          continue;
        }

        // 🚨 Bỏ cache pdf_url cũ cho từng invoice
        const invoiceWithoutCache: Invoice = {
          ...(inv as Invoice),
          pdf_url: null,
        };

        // Ensure PDF exists and get URL
        const pdfUrl = await ensureInvoicePdfStored(
          invoiceWithoutCache,
          freshOrder as Order,
          sellerProfile
        );

        if (pdfUrl) {
          const filename = `invoice-${inv.invoice_code || inv.id}.pdf`;
          await downloadFileDirectly(pdfUrl, filename);
        } else {
          console.error(`Failed to generate PDF for invoice ${inv.id}`);
        }
      } catch (err) {
        console.error(`Failed to download invoice ${inv.id}`, err);
      }

      // Small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const getStatusBadge = (status: string) => {
    // Normalize to handle both old lowercase and new capitalized values
    const normalizedStatus = status === 'Paid' || status === 'paid' ? 'Paid' :
      status === 'Cancelled' || status === 'cancelled' ? 'Cancelled' :
        'Pending';

    switch (normalizedStatus) {
      case 'Paid':
        return { className: 'bg-green-500/20 text-green-400', label: 'Paid' };
      case 'Cancelled':
        return { className: 'bg-gray-500/20 text-gray-400', label: 'Cancelled' };
      default:
        return { className: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' };
    }
  };

  // Filtered invoices are now handled server-side, so we just use the current page's invoices
  // But we still need to map customer names
  const filteredInvoices = invoicesWithCustomers;

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
    <div className="flex flex-col h-full min-h-0 p-6">
      {/* Filters */}
      <Card className="shrink-0">
        <CardHeader className="!pt-3 !pb-2 !px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter size={18} />
            Filters
          </CardTitle>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs sm:text-sm text-white/60 hover:text-white underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
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
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
                <option value="Cancelled">Cancelled</option>
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

      <Card className="flex-1 flex flex-col min-h-0 mt-6">
        <CardHeader className="!pt-4 !pb-1 !px-6 flex-shrink-0">
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
            {selectedIds.size > 0 && (() => {
              const selectedDownloadable = invoicesWithCustomers.filter(
                (inv) => selectedIds.has(inv.id) && canDownloadInvoice(inv)
              );
              const selectedDownloadableCount = selectedDownloadable.length;

              return (
                <Button
                  onClick={handleDownloadAll}
                  size="sm"
                  disabled={selectedDownloadableCount === 0}
                >
                  <Download size={16} className="mr-2" />
                  Download All ({selectedDownloadableCount})
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent">
            <table className="min-w-[1100px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-[#1E223D]">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Invoice ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Order ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Amount (VND)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Actions</th>
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
                        {invoice.invoice_code
                          ? invoice.invoice_code
                          : invoice.orders?.order_id
                            ? `INV-${invoice.orders.order_id}`
                            : `INV-${invoice.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                        {invoice.orders?.order_id ?? '—'}
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
                        {formatVnd(getInvoiceDisplayAmount(invoice))}
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
                        {canDownloadInvoice(invoice) ? (
                          <button
                            onClick={() => handleDownload(invoice)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#E5E7EB] transition"
                          >
                            <Download size={16} />
                            <span className="text-sm">Download</span>
                          </button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarkAsPaid(invoice)}
                            disabled={isMarkingMap[invoice.id]}
                            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-none"
                          >
                            {isMarkingMap[invoice.id] ? 'Updating…' : 'Mark as Paid'}
                          </Button>
                        )}
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
        <Pagination
          currentPage={page}
          totalItems={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
};
