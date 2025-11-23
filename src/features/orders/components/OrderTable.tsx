import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, Edit, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';
import { RiskBadge } from '../../../components/dashboard/RiskBadge';
import type { Order } from '../../../types/supabase';
import type { SimpleProduct } from '../../products/services/productsService';


interface OrderTableProps {
    orders: Order[]; // paginated orders for current page
    filteredOrders: Order[]; // all filtered orders for pagination info
    totalCount: number; // Real total count from server
    currentPage: number;
    pageSize: number;
    totalPages: number;
    selectedIds: Set<string>;
    onSelectAll: () => void;
    onToggleSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onRowClick: (order: Order) => void;
    products: SimpleProduct[];
    onProductCorrection: (order: Order, productId: string, productName: string) => void;
    onApprove: (orderId: string) => void;
    onReject: (orderId: string) => void;
    onEdit: (order: Order) => void;
    onDelete?: (orderIds: string[]) => void;
    loading: boolean;
}

export const OrderTable: React.FC<OrderTableProps> = ({
    orders,
    filteredOrders,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    selectedIds,
    onSelectAll,
    onToggleSelect,
    onPageChange,
    onRowClick,
    products,
    onProductCorrection,
    onApprove,
    onReject,
    onEdit,
    onDelete,
    loading,
}) => {
    const [productCorrections, setProductCorrections] = useState<Map<string, string>>(new Map());
    const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, placement: 'bottom' as 'bottom' | 'top' });

    const isInvalidProduct = (order: Order): boolean => {
        if (!order.product_id) return true;
        if (order.products === null) return true;
        return false;
    };

    const getProductName = (order: Order): string => {
        if (order.products?.name) return order.products.name;
        if (order.product) return order.product;
        return 'Unknown Product';
    };

    const toggleActionDropdown = (orderId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
        if (openActionDropdown === orderId) {
            setOpenActionDropdown(null);
        } else {
            if (event) {
                const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                const dropdownWidth = 192;
                const dropdownHeight = 144;
                const padding = 8;

                const spaceBelow = window.innerHeight - rect.bottom;
                const placement = spaceBelow < dropdownHeight + padding ? 'top' : 'bottom';

                const x = rect.right - dropdownWidth;
                const y =
                    placement === 'bottom' ? rect.bottom + padding : rect.top - dropdownHeight - padding;

                setDropdownPosition({
                    x: Math.max(8, Math.min(x, window.innerWidth - dropdownWidth - 8)),
                    y: Math.max(8, Math.min(y, window.innerHeight - dropdownHeight - 8)),
                    placement,
                });
            }
            setOpenActionDropdown(orderId);
        }
    };

    // Close dropdown on scroll
    useEffect(() => {
        const handleScroll = () => setOpenActionDropdown(null);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isOutsideButton = !target.closest('.action-dropdown-container');
            const isOutsideDropdown = !target.closest('[data-dropdown-menu]');
            if (isOutsideButton && isOutsideDropdown) {
                setOpenActionDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openActionDropdown]);

    return (
        <>
            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="!pt-4 !pb-1 !px-6 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onSelectAll}
                                disabled={loading}
                                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
                            >
                                {selectedIds.size === orders.length && orders.length > 0
                                    ? 'Deselect All'
                                    : 'Select All'}
                            </button>
                            {selectedIds.size > 0 && (
                                <span className="text-sm text-[var(--text-muted)]">
                                    {selectedIds.size} selected
                                </span>
                            )}
                        </div>
                        {selectedIds.size > 0 && onDelete && (
                            <button
                                onClick={() => onDelete(Array.from(selectedIds))}
                                className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0B0F28] flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Delete All
                            </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                            <colgroup>
                                <col style={{ width: '30px' }} />
                                <col style={{ width: '100px' }} />
                                <col style={{ width: '120px' }} />
                                <col style={{ width: '135px' }} />
                                <col style={{ width: '150px' }} />
                                <col style={{ width: '150px' }} />
                                <col style={{ width: '120px' }} />
                                <col style={{ width: '120px' }} />
                                <col style={{ width: '70px' }} />
                                <col style={{ width: '110px' }} />
                                <col style={{ width: '130px' }} />
                            </colgroup>
                            <thead>
                                <tr className="border-b border-[#1E223D]">
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={
                                                orders.length > 0 &&
                                                orders.every((order) => selectedIds.has(order.id))
                                            }
                                            onChange={onSelectAll}
                                            disabled={loading}
                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Order ID</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Customer</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Phone</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Address</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">Product</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Amount (VND)</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Payment</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Risk</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Status</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-[#1E223D] hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => onRowClick(order)}
                                    >
                                        {/* Checkbox */}
                                        <td
                                            className="px-6 py-4"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(order.id)}
                                                onChange={() => onToggleSelect(order.id)}
                                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                                            />
                                        </td>

                                        {/* Order ID */}
                                        <td className="px-6 py-4 text-sm text-[#E5E7EB] font-medium text-center">
                                            <div className="truncate" title={order.order_id || order.id}>
                                                {order.order_id || order.id}
                                            </div>
                                        </td>

                                        {/* Customer */}
                                        <td className="px-6 py-4 text-sm text-[#E5E7EB]">
                                            <div className="truncate" title={order.customer_name}>
                                                {order.customer_name}
                                            </div>
                                        </td>

                                        {/* Phone */}
                                        <td className="px-6 py-4 text-sm text-[#E5E7EB] text-center">
                                            <div className="truncate">
                                                {order.phone || '-'}
                                            </div>
                                        </td>

                                        {/* Address - Allow wrapping */}
                                        <td className="px-6 py-4 text-sm text-[#E5E7EB]">
                                            <div className="break-words line-clamp-2" title={order.address || '-'}>
                                                {order.address || '-'}
                                            </div>
                                        </td>

                                        {/* Product */}
                                        <td
                                            className="px-6 py-4 text-sm text-[#E5E7EB] align-top"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {isInvalidProduct(order) ? (
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 border border-red-600 text-red-300 text-xs break-words"
                                                            title={getProductName(order)}
                                                        >
                                                            <AlertTriangle size={12} className="flex-shrink-0" />
                                                            <span className="break-words">{getProductName(order)}</span>
                                                        </span>
                                                    </div>
                                                    <div className="relative">
                                                        <select
                                                            value={productCorrections.get(order.id) || ''}
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    const productId = e.target.value;
                                                                    const product = products.find((p) => p.id === productId);
                                                                    const productName = product?.name || 'Unknown';

                                                                    setProductCorrections((prev) => {
                                                                        const next = new Map(prev);
                                                                        next.set(order.id, productId);
                                                                        return next;
                                                                    });
                                                                    onProductCorrection(order, productId, productName);
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
                                                        <svg
                                                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70"
                                                            aria-hidden="true"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M19 9l-7 7-7-7"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <p className="text-xs text-red-400">
                                                        Invalid product. Please select from the list.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div
                                                    className="text-sm text-[#E5E7EB] break-words"
                                                    title={getProductName(order)}
                                                >
                                                    {getProductName(order)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Amount */}
                                        <td className="px-6 py-4 text-sm text-[#E5E7EB] text-center">
                                            <div className="truncate">
                                                {order.amount.toLocaleString('vi-VN')}
                                            </div>
                                        </td>

                                        {/* Payment Method */}
                                        <td className="px-6 py-4 text-sm text-[#E5E7EB] text-center">
                                            <div className="truncate" title={order.payment_method || 'COD'}>
                                                {order.payment_method || 'COD'}
                                            </div>
                                        </td>

                                        {/* Risk Score */}
                                        <td className="px-6 py-4 text-sm text-center">
                                            <div className="flex justify-center">
                                                <RiskBadge score={order.risk_score} />
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 text-sm">
                                            <StatusBadge status={order.status} />
                                        </td>

                                        {/* Actions */}
                                        <td
                                            className="px-6 py-4 text-sm text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="relative action-dropdown-container inline-flex justify-end">
                                                <Button
                                                    onClick={(e) => toggleActionDropdown(order.id, e)}
                                                    size="sm"
                                                    className="!px-3 !py-1.5 !text-xs"
                                                >
                                                    <span>Action</span>
                                                    <ChevronDown
                                                        size={14}
                                                        className={`ml-1.5 transition-transform duration-200 ${openActionDropdown === order.id ? 'rotate-180' : ''
                                                            }`}
                                                    />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="mt-4 flex items-center justify-between text-xs text-white/60 px-4 pb-4">
                        <div>
                            Showing{" "}
                            {totalCount === 0
                                ? 0
                                : (currentPage - 1) * pageSize + 1}{" "}
                            –{" "}
                            {Math.min(currentPage * pageSize, totalCount)}{" "}
                            of {totalCount} orders
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                className="px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors"
                                disabled={currentPage === 1}
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            >
                                Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .slice(
                                    Math.max(0, currentPage - 3),
                                    Math.min(totalPages, currentPage + 2)
                                )
                                .map((page) => (
                                    <button
                                        key={page}
                                        className={`px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors ${page === currentPage ? "bg-[#4C1D95] border-[#7C3AED] text-white" : ""
                                            }`}
                                        onClick={() => onPageChange(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                            <button
                                className="px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors"
                                disabled={currentPage === totalPages}
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {openActionDropdown &&
                createPortal(
                    <div
                        data-dropdown-menu
                        className="fixed z-[9999] w-48 bg-[#1E223D] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            left: dropdownPosition.x,
                            top: dropdownPosition.y,
                        }}
                    >
                        <div className="p-1">
                            <button
                                onClick={() => {
                                    setOpenActionDropdown(null);
                                    onApprove(openActionDropdown);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <CheckCircle size={14} className="text-green-400" />
                                Approve
                            </button>
                            <button
                                onClick={() => {
                                    setOpenActionDropdown(null);
                                    onReject(openActionDropdown);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <XCircle size={14} className="text-red-400" />
                                Reject
                            </button>
                            <button
                                onClick={() => {
                                    const order = orders.find((o) => o.id === openActionDropdown);
                                    setOpenActionDropdown(null);
                                    if (order) onEdit(order);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <Edit size={14} className="text-blue-400" />
                                Edit Order
                            </button>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};
