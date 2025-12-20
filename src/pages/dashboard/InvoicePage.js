import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FilterBar } from '../../components/ui/FilterBar';
import { MultiSelectFilter } from '../../components/filters/MultiSelectFilter';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ensureInvoicePdfStored } from '../../features/invoices/services/invoiceStorage';
import { fetchInvoicesByUser, markInvoiceAsPaid } from '../../features/invoices/services/invoiceService';
import { markOrderAsPaid } from '../../features/orders/services/ordersService';
import { logOrderPaidEvent, fetchOrderEvents } from '../../features/orders/services/orderEventsService';
import { Pagination } from '../../components/ui/Pagination';
import { downloadFileDirectly } from '../../features/invoices/utils/invoiceDownload';
import { OrderSidePanel } from '../../features/orders/components/OrderSidePanel';
import { fetchCustomerBlacklist } from '../../features/customers/services/customersService';
import { useToast } from '../../components/ui/Toast';
import { generateChanges } from '../../utils/generateChanges';
import { logOrderEvent } from '../../features/orders/services/orderEventsService';
import { logUserAction } from '../../utils/logUserAction';
export const InvoicePage = () => {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const { showSuccess, showError } = useToast();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoicesWithCustomers, setInvoicesWithCustomers] = useState([]);
    const [ordersMap, setOrdersMap] = useState(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [statusFilter, setStatusFilter] = useState([]);
    const [dateFilter, setDateFilter] = useState('');
    const [isMarkingMap, setIsMarkingMap] = useState({});
    // Side Panel
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderEvents, setOrderEvents] = useState([]);
    const [blacklistedPhones, setBlacklistedPhones] = useState(new Set());
    const [addressForm, setAddressForm] = useState({
        address_detail: '',
        ward: '',
        district: '',
        province: '',
    });
    const [isAddressModified, setIsAddressModified] = useState(false);
    // Pagination
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 200;
    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter([]);
        setDateFilter('');
    };
    // Load blacklist
    useEffect(() => {
        const loadBlacklist = async () => {
            if (!user)
                return;
            try {
                const { data } = await fetchCustomerBlacklist(user.id);
                setBlacklistedPhones(new Set((data ?? []).map((entry) => entry.phone)));
            }
            catch (err) {
                console.error('Error loading blacklist:', err);
            }
        };
        loadBlacklist();
    }, [user]);
    // Fetch invoices + orders
    useEffect(() => {
        if (!user)
            return;
        const fetchInvoices = async () => {
            setLoading(true);
            setError(null);
            try {
                const { invoices: invoicesData, totalCount: count, error: invoicesError, } = await fetchInvoicesByUser(user.id, page, PAGE_SIZE, {
                    searchQuery,
                    status: statusFilter,
                    date: dateFilter
                });
                if (invoicesError)
                    throw invoicesError;
                setTotalCount(count);
                if (!invoicesData || invoicesData.length === 0) {
                    setInvoices([]);
                    setOrdersMap(new Map());
                    setLoading(false);
                    return;
                }
                const orderIds = invoicesData
                    .map(inv => inv.order_id)
                    .filter((id) => Boolean(id));
                let ordersMapLocal = new Map();
                let fullOrdersMap = new Map();
                if (orderIds.length > 0) {
                    const { data: ordersData, error: ordersError } = await supabase
                        .from('orders')
                        .select('id, order_id, customer_name, phone, address, product, amount, discount_amount, shipping_fee, status, payment_method, risk_score, risk_level, created_at, updated_at, paid_at, customer_confirmed_at, confirmation_sent_at, cancelled_at, shipped_at, completed_at, product_id, address_detail, ward, district, province')
                        .eq('user_id', user.id)
                        .in('id', orderIds);
                    if (!ordersError && ordersData) {
                        ordersData.forEach((order) => {
                            ordersMapLocal.set(order.id, {
                                order_id: order.order_id || null,
                                customer_name: order.customer_name || null,
                            });
                            fullOrdersMap.set(order.id, order);
                        });
                    }
                }
                const invoicesWithOrders = invoicesData.map((invoice) => ({
                    ...invoice,
                    orders: ordersMapLocal.get(invoice.order_id) || null,
                }));
                setInvoices(invoicesWithOrders);
                setOrdersMap(fullOrdersMap);
            }
            catch (err) {
                console.error('Error fetching invoices:', err);
                setError(err instanceof Error ? err.message : 'Failed to load invoices');
            }
            finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, [user, page, searchQuery, statusFilter, dateFilter]);
    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, dateFilter]);
    // Realtime (hiện để đó)
    useEffect(() => {
        if (!user)
            return;
        const channel = supabase
            .channel('invoices-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, () => { })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);
    // Merge customer_name cho tiện
    useEffect(() => {
        const merged = invoices.map(invoice => ({
            ...invoice,
            customer_name: invoice.orders?.customer_name || 'Unknown Customer',
        }));
        setInvoicesWithCustomers(merged);
    }, [invoices]);
    const canDownloadInvoice = (invoice) => {
        return invoice.status === 'Paid';
    };
    const formatVnd = (n) => {
        const num = Number(n || 0);
        return num.toLocaleString('vi-VN');
    };
    const getInvoiceDisplayAmount = (inv) => {
        const order = ordersMap.get(inv.order_id);
        if (order) {
            const subtotal = order.subtotal ??
                order.amount ??
                0;
            const discount = order.discount_amount ??
                inv.discount_amount ??
                0;
            const shipping = order.shipping_fee ??
                inv.shipping_fee ??
                0;
            return subtotal + shipping - discount;
        }
        const subtotal = inv.subtotal ??
            inv.amount ??
            0;
        const discount = inv.discount_amount ??
            0;
        const shipping = inv.shipping_fee ??
            0;
        return subtotal + shipping - discount;
    };
    const handleDownload = async (invoice) => {
        if (!canDownloadInvoice(invoice)) {
            alert('Only Paid invoices can be downloaded.');
            return;
        }
        try {
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
            let sellerProfile = {
                company_name: profile?.company_name || undefined,
                email: profile?.email || undefined,
                phone: profile?.phone || undefined,
                website: undefined,
                address: undefined,
            };
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
                            website: profileData.website || undefined,
                            address: profileData.address || undefined,
                        };
                    }
                }
            }
            const invoiceWithoutCache = {
                ...invoice,
                pdf_url: null,
            };
            const pdfUrl = await ensureInvoicePdfStored(invoiceWithoutCache, freshOrder, sellerProfile);
            if (pdfUrl) {
                window.open(pdfUrl, '_blank');
            }
            else {
                alert('Failed to generate invoice PDF. Please try again.');
            }
        }
        catch (err) {
            console.error('Failed to download invoice PDF', err);
            alert('Failed to download invoice PDF. Please try again.');
        }
    };
    // ... (imports)
    // ... inside InvoicePage component ...
    const handleMarkAsPaid = async (invoice, e) => {
        e.stopPropagation();
        if (!invoice.order_id || !user)
            return;
        try {
            setIsMarkingMap((prev) => ({ ...prev, [invoice.id]: true }));
            const updatedInvoice = await markInvoiceAsPaid(invoice.id);
            await markOrderAsPaid(invoice.order_id);
            await logOrderPaidEvent(invoice.order_id);
            const currentOrder = ordersMap.get(invoice.order_id);
            // Log User Action for History
            await logUserAction({
                userId: user.id,
                action: 'Update Order Status', // Using generic action as per spec for payment updates
                status: 'success',
                orderId: currentOrder?.order_id ?? '',
                details: {
                    payment_status: 'UNPAID → PAID',
                    payment_method: currentOrder?.payment_method || 'Unknown',
                    source: 'InvoicePage',
                    // We don't log status_from/to here because markOrderAsPaid doesn't necessarily change order status (e.g. if Delivering)
                    // If applyInvoiceRules changes it, it might be logged elsewhere or we miss it here. 
                    // But primarily this is a Payment update.
                }
            });
            setInvoices((prev) => prev.map((inv) => inv.id === invoice.id
                ? { ...inv, status: 'Paid', paid_at: updatedInvoice.paid_at, date: updatedInvoice.date }
                : inv));
            if (currentOrder) {
                setOrdersMap(prev => new Map(prev).set(invoice.order_id, { ...currentOrder, paid_at: updatedInvoice.paid_at || new Date().toISOString() }));
            }
        }
        catch (error) {
            console.error('Failed to mark invoice as paid', error);
            alert('Failed to mark invoice as paid. Please try again.');
        }
        finally {
            setIsMarkingMap((prev) => ({ ...prev, [invoice.id]: false }));
        }
    };
    const handleDownloadAll = async () => {
        const selectedDownloadable = invoicesWithCustomers.filter((inv) => selectedIds.has(inv.id) && canDownloadInvoice(inv));
        if (selectedDownloadable.length === 0) {
            alert('No downloadable invoices selected. Only Paid invoices can be downloaded.');
            return;
        }
        let sellerProfile = {
            company_name: profile?.company_name || undefined,
            email: profile?.email || undefined,
            phone: profile?.phone || undefined,
            website: undefined,
            address: undefined,
            user_id: user?.id
        };
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
                            website: profileData.website || undefined,
                            address: profileData.address || undefined,
                            user_id: userId
                        };
                    }
                }
            }
            catch (err) {
                console.error('Error fetching profile for bulk download:', err);
            }
        }
        for (const inv of selectedDownloadable) {
            try {
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
                const invoiceWithoutCache = {
                    ...inv,
                    pdf_url: null,
                };
                const pdfUrl = await ensureInvoicePdfStored(invoiceWithoutCache, freshOrder, sellerProfile);
                if (pdfUrl) {
                    const filename = `invoice-${inv.invoice_code || inv.id}.pdf`;
                    await downloadFileDirectly(pdfUrl, filename);
                }
                else {
                    console.error(`Failed to generate PDF for invoice ${inv.id}`);
                }
            }
            catch (err) {
                console.error(`Failed to download invoice ${inv.id}`, err);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    };
    const filteredInvoices = invoicesWithCustomers;
    const handleSelectAll = () => {
        if (selectedIds.size === filteredInvoices.length) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
        }
    };
    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    };
    // SidePanel handlers
    const handleRowClick = async (invoice) => {
        const order = ordersMap.get(invoice.order_id);
        if (!order) {
            showError('Order details not found');
            return;
        }
        setSelectedOrder(order);
        setAddressForm({
            address_detail: order.address_detail || order.address || '',
            ward: order.ward || '',
            district: order.district || '',
            province: order.province || '',
        });
        setIsAddressModified(false);
        setIsSidePanelOpen(true);
        const { data, error } = await fetchOrderEvents(order.id);
        if (!error && data) {
            setOrderEvents(data);
        }
    };
    const handleAddressChange = (field, value) => {
        setAddressForm((prev) => {
            const next = { ...prev, [field]: value };
            setIsAddressModified(true);
            return next;
        });
    };
    const handleSaveAddress = async () => {
        if (!selectedOrder || !user)
            return;
        const { address_detail, ward, district, province } = addressForm;
        const fullAddress = [address_detail, ward, district, province]
            .filter(Boolean)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .join(", ");
        // Previous snapshot
        const previous = {
            address_detail: selectedOrder.address_detail,
            ward: selectedOrder.ward,
            district: selectedOrder.district,
            province: selectedOrder.province,
            address: selectedOrder.address,
        };
        const next = {
            address_detail,
            ward,
            district,
            province,
            address: fullAddress,
        };
        try {
            const { error } = await supabase
                .from("orders")
                .update(next)
                .eq("id", selectedOrder.id);
            if (error)
                throw error;
            const changes = generateChanges(previous, next);
            // Log order_events (để mở từ Invoices vẫn thấy trong SidePanel)
            await logOrderEvent(selectedOrder.id, "ADDRESS_UPDATED", changes, "invoices_page_sidepanel");
            // Log History page
            await logUserAction({
                userId: user.id,
                action: "Update Order Address (Invoices)",
                status: "success",
                orderId: selectedOrder.order_id ?? "",
                details: changes,
            });
            showSuccess("Address updated successfully");
            setIsAddressModified(false);
            setSelectedOrder((prev) => prev ? { ...prev, ...next } : null);
            setOrdersMap((prev) => new Map(prev).set(selectedOrder.id, { ...selectedOrder, ...next }));
        }
        catch (err) {
            showError("Failed to update address");
        }
    };
    const refreshOrder = async (orderId) => {
        const { data } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (data) {
            setSelectedOrder(data);
            setOrdersMap(prev => new Map(prev).set(orderId, data));
            const { data: events } = await fetchOrderEvents(orderId);
            if (events)
                setOrderEvents(events);
        }
    };
    const handleApprove = async (order) => {
        try {
            await supabase.from('orders').update({ status: 'Order Confirmation Sent' }).eq('id', order.id);
            showSuccess('Order approved');
            refreshOrder(order.id);
        }
        catch (e) {
            showError('Failed');
        }
    };
    if (loading && invoices.length === 0) {
        return (_jsx("div", { className: "flex flex-col h-full min-h-0", children: _jsx(Card, { className: "flex-1 flex flex-col min-h-0", children: _jsx(CardContent, { className: "flex-1 flex items-center justify-center", children: _jsx("p", { className: "text-[var(--text-muted)]", children: "Loading invoices..." }) }) }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex flex-col h-full min-h-0", children: _jsx(Card, { className: "flex-1 flex flex-col min-h-0", children: _jsxs(CardContent, { className: "flex-1 flex flex-col items-center justify-center", children: [_jsxs("p", { className: "text-red-400 mb-4", children: ["Error: ", error] }), _jsx(Button, { onClick: () => window.location.reload(), children: "Retry" })] }) }) }));
    }
    return (_jsxs("div", { className: "space-y-6 p-6 h-full flex flex-col min-h-0", children: [_jsxs(FilterBar, { searchValue: searchQuery, onSearch: setSearchQuery, searchPlaceholder: "Search by Invoice ID, Order ID, or Customer...", children: [_jsx(MultiSelectFilter, { label: "Status", options: [
                            { value: 'Paid', label: 'Paid' },
                            { value: 'Pending', label: 'Pending' },
                            { value: 'Cancelled', label: 'Cancelled' },
                        ], selectedValues: Array.isArray(statusFilter) ? statusFilter : statusFilter === 'all' ? [] : [statusFilter], onChange: (values) => setStatusFilter(values) }), _jsx("input", { type: "date", value: dateFilter, onChange: (e) => setDateFilter(e.target.value), className: "h-10 w-auto min-w-[180px] whitespace-nowrap px-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)]" }), _jsx("button", { type: "button", onClick: clearAllFilters, className: "text-sm text-[var(--text-muted)] whitespace-nowrap hover:text-white transition", children: "Clear filters" })] }), _jsxs(Card, { className: "flex-1 flex flex-col min-h-0 relative z-0", children: [_jsx(CardHeader, { className: "!pt-4 !pb-1 !px-6 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: handleSelectAll, className: "text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition", children: selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0
                                                ? 'Deselect All'
                                                : 'Select All' }), selectedIds.size > 0 && (_jsxs("span", { className: "text-sm text-[var(--text-muted)]", children: [selectedIds.size, " selected"] }))] }), selectedIds.size > 0 && (() => {
                                    const selectedDownloadable = invoicesWithCustomers.filter((inv) => selectedIds.has(inv.id) && canDownloadInvoice(inv));
                                    const selectedDownloadableCount = selectedDownloadable.length;
                                    return (_jsxs(Button, { onClick: handleDownloadAll, size: "sm", disabled: selectedDownloadableCount === 0, children: [_jsx(Download, { size: 16, className: "mr-2" }), "Download All (", selectedDownloadableCount, ")"] }));
                                })()] }) }), _jsx(CardContent, { className: "flex-1 min-h-0 overflow-y-auto p-0", children: _jsxs("div", { className: "w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent", children: [_jsxs("table", { className: "min-w-[1100px] w-full border-separate border-spacing-0", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[#1E223D]", children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap w-12", children: _jsx("input", { type: "checkbox", checked: selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0, onChange: handleSelectAll, className: "w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer" }) }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Invoice ID" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Order ID" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Customer" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Amount (VND)" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Actions" })] }) }), _jsx("tbody", { children: filteredInvoices.map((invoice) => {
                                                return (_jsxs("tr", { className: "border-b border-[#1E223D] hover:bg-white/5 transition cursor-pointer", onClick: () => handleRowClick(invoice), children: [_jsx("td", { className: "px-6 py-4 align-middle", onClick: (e) => e.stopPropagation(), children: _jsx("input", { type: "checkbox", checked: selectedIds.has(invoice.id), onChange: () => handleToggleSelect(invoice.id), className: "w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer" }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] font-medium whitespace-nowrap align-middle", children: invoice.invoice_code
                                                                ? invoice.invoice_code
                                                                : invoice.orders?.order_id
                                                                    ? `INV-${invoice.orders.order_id}`
                                                                    : `INV-${invoice.id.slice(0, 8).toUpperCase()}` }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle", children: invoice.orders?.order_id ?? '—' }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] align-middle", title: invoice.customer_name || undefined, children: _jsx("span", { className: "block truncate whitespace-nowrap max-w-[200px]", children: invoice.customer_name || 'Unknown' }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle", children: formatVnd(getInvoiceDisplayAmount(invoice)) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle", children: invoice.date }), _jsx("td", { className: "px-6 py-4 align-middle", children: _jsx(StatusBadge, { status: invoice.status }) }), _jsx("td", { className: "px-6 py-4 align-middle", onClick: (e) => e.stopPropagation(), children: canDownloadInvoice(invoice) ? (_jsxs(Button, { onClick: () => handleDownload(invoice), className: "\n                              flex items-center gap-2\n                              bg-gradient-to-r from-[#4E9EF4] to-[#8B5CF6]\n                              hover:opacity-90\n                              text-white border-none\n                              px-1 py-0.5 \n                              text-xs \n                              rounded-md\n                            ", children: [_jsx(Download, { size: 14 }), "Download"] })) : (_jsx(Button, { onClick: (e) => handleMarkAsPaid(invoice, e), disabled: isMarkingMap[invoice.id], className: "\n                              bg-gradient-to-r from-[#4E9EF4] to-[#8B5CF6]\n                              hover:opacity-90\n                              text-white border-none\n                              px-1 py-0.5\n                              text-xs\n                              rounded-md\n      ", children: isMarkingMap[invoice.id] ? "Updating…" : "Mark as Paid" })) })] }, invoice.id));
                                            }) })] }), filteredInvoices.length === 0 && (_jsx("div", { className: "p-12 text-center text-[var(--text-muted)]", children: invoices.length === 0
                                        ? 'No invoices found.'
                                        : 'No invoices match your filters.' }))] }) }), _jsx(Pagination, { currentPage: page, totalItems: totalCount, pageSize: PAGE_SIZE, onPageChange: setPage })] }), _jsx(OrderSidePanel, { isOpen: isSidePanelOpen, onClose: () => setIsSidePanelOpen(false), order: selectedOrder, orderEvents: orderEvents, addressForm: addressForm, isAddressModified: isAddressModified, onAddressChange: handleAddressChange, onSaveAddress: handleSaveAddress, blacklistedPhones: blacklistedPhones, onApprove: handleApprove, onReject: () => { }, onMarkDelivered: () => { }, onMarkCompleted: () => { }, onOrderUpdated: () => {
                    if (selectedOrder) {
                        refreshOrder(selectedOrder.id);
                    }
                }, onMarkMissed: () => { }, onSimulateConfirmed: () => { }, onSimulateCancelled: () => { }, onSimulatePaid: () => { }, onSendQrPaymentLink: () => { } })] }));
};
