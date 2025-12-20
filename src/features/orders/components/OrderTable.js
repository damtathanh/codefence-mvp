import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, Edit, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';
import { RiskBadge } from '../../../components/dashboard/RiskBadge';
export const OrderTable = ({ orders, filteredOrders, totalCount, currentPage, pageSize, totalPages, selectedIds, onSelectAll, onToggleSelect, onPageChange, onRowClick, products, onProductCorrection, onApprove, onReject, onEdit, onDelete, loading, }) => {
    const [productCorrections, setProductCorrections] = useState(new Map());
    const [openActionDropdown, setOpenActionDropdown] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, placement: 'bottom' });
    const isInvalidProduct = (order) => {
        // Nếu đã có product_id thì coi như hợp lệ
        if (order.product_id)
            return false;
        // Lấy tên product đang có trên order
        const rawName = (order.products?.name || order.product || '')
            .trim()
            .toLowerCase();
        if (!rawName)
            return true;
        // Nếu tên này trùng với bất kỳ product nào trong ProductsPage thì cũng coi là hợp lệ
        const hasMatch = products.some((p) => p.name.trim().toLowerCase() === rawName);
        // Chỉ báo Invalid khi KHÔNG tìm thấy match
        return !hasMatch;
    };
    const getProductName = (order) => {
        if (order.products?.name)
            return order.products.name;
        if (order.product)
            return order.product;
        return 'Unknown Product';
    };
    const toggleActionDropdown = (orderId, event) => {
        if (openActionDropdown === orderId) {
            setOpenActionDropdown(null);
        }
        else {
            if (event) {
                const rect = event.currentTarget.getBoundingClientRect();
                const dropdownWidth = 192;
                const dropdownHeight = 144;
                const padding = 8;
                const spaceBelow = window.innerHeight - rect.bottom;
                const placement = spaceBelow < dropdownHeight + padding ? 'top' : 'bottom';
                const x = rect.right - dropdownWidth;
                const y = placement === 'bottom' ? rect.bottom + padding : rect.top - dropdownHeight - padding;
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
        const handleClickOutside = (event) => {
            const target = event.target;
            const isOutsideButton = !target.closest('.action-dropdown-container');
            const isOutsideDropdown = !target.closest('[data-dropdown-menu]');
            if (isOutsideButton && isOutsideDropdown) {
                setOpenActionDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openActionDropdown]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex-1 flex flex-col min-h-0 bg-[var(--bg-card)] backdrop-blur-sm rounded-lg border border-[var(--border-subtle)] shadow-lg relative z-0", children: [_jsx("div", { className: "px-6 pt-4 pb-1 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: onSelectAll, disabled: loading, className: "text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition", children: selectedIds.size === orders.length && orders.length > 0
                                                ? 'Deselect All'
                                                : 'Select All' }), selectedIds.size > 0 && (_jsxs("span", { className: "text-sm text-[var(--text-muted)]", children: [selectedIds.size, " selected"] }))] }), selectedIds.size > 0 && onDelete && (_jsxs("button", { onClick: () => onDelete(Array.from(selectedIds)), className: "px-4 py-2 text-sm font-semibold rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0B0F28] flex items-center gap-2", children: [_jsx(Trash2, { size: 16 }), "Delete All"] }))] }) }), _jsxs("div", { className: "flex-1 min-h-0 overflow-y-auto p-0", children: [_jsx("div", { className: "w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent", children: _jsxs("table", { className: "w-full border-separate border-spacing-0", style: { tableLayout: 'fixed', minWidth: '100%' }, children: [_jsxs("colgroup", { children: [_jsx("col", { style: { width: '30px' } }), _jsx("col", { style: { width: '100px' } }), _jsx("col", { style: { width: '120px' } }), _jsx("col", { style: { width: '135px' } }), _jsx("col", { style: { width: '150px' } }), _jsx("col", { style: { width: '150px' } }), _jsx("col", { style: { width: '120px' } }), _jsx("col", { style: { width: '120px' } }), _jsx("col", { style: { width: '70px' } }), _jsx("col", { style: { width: '110px' } }), _jsx("col", { style: { width: '130px' } })] }), _jsx("thead", { children: _jsxs("tr", { className: "border-b border-[#1E223D]", children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: _jsx("input", { type: "checkbox", checked: orders.length > 0 &&
                                                                orders.every((order) => selectedIds.has(order.id)), onChange: onSelectAll, disabled: loading, className: "w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" }) }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Order ID" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Customer" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]", children: "Address" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]", children: "Product" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Amount (VND)" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Payment" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Risk" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Actions" })] }) }), _jsx("tbody", { children: orders.map((order) => {
                                                // 1. Build parts from specific fields
                                                const parts = [
                                                    order.address_detail,
                                                    order.ward,
                                                    order.district,
                                                    order.province,
                                                ];
                                                // 2. Filter out empty/null/undefined/whitespace-only strings
                                                const validParts = parts
                                                    .filter((p) => typeof p === 'string' && p.trim().length > 0)
                                                    .map(p => p.trim());
                                                // 3. Construct full address or use fallback
                                                let fullAddress = '';
                                                if (validParts.length > 0) {
                                                    fullAddress = validParts.join(', ');
                                                }
                                                else {
                                                    // Fallback to order.address if no specific parts are available
                                                    fullAddress = order.address || '-';
                                                }
                                                return (_jsxs("tr", { className: "border-b border-[#1E223D] hover:bg-white/5 transition-colors cursor-pointer", onClick: () => onRowClick(order), children: [_jsx("td", { className: "px-6 py-4", onClick: (e) => {
                                                                e.stopPropagation();
                                                            }, children: _jsx("input", { type: "checkbox", checked: selectedIds.has(order.id), onChange: () => onToggleSelect(order.id), className: "w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer" }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] font-medium text-center", children: _jsx("div", { className: "truncate", title: order.order_id || order.id, children: order.order_id || order.id }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB]", children: _jsx("div", { className: "break-words line-clamp-2", title: order.customer_name, children: order.customer_name }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] text-center", children: _jsx("div", { className: "truncate", children: order.phone || '-' }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB]", children: _jsx("div", { className: "break-words line-clamp-2", title: fullAddress, children: fullAddress }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] align-top", onClick: (e) => e.stopPropagation(), children: isInvalidProduct(order) ? (_jsxs("div", { className: "space-y-2 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 min-w-0", children: _jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 border border-red-600 text-red-300 text-xs break-words", title: getProductName(order), children: [_jsx(AlertTriangle, { size: 12, className: "flex-shrink-0" }), _jsx("span", { className: "break-words", children: getProductName(order) })] }) }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: productCorrections.get(order.id) || '', onChange: (e) => {
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
                                                                                }, className: "w-full pr-10 px-2 py-1.5 text-xs bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50", children: [_jsx("option", { value: "", children: "Select product" }), products.map((product) => (_jsx("option", { value: product.id, children: product.name }, product.id)))] }), _jsx("svg", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 9l-7 7-7-7" }) })] }), _jsx("p", { className: "text-xs text-red-400", children: "Invalid product. Please select from the list." })] })) : (_jsx("div", { className: "text-sm text-[#E5E7EB] break-words", title: getProductName(order), children: getProductName(order) })) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] text-center", children: _jsx("div", { className: "truncate", children: order.amount.toLocaleString('vi-VN') }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] text-center", children: _jsx("div", { className: "truncate", title: order.payment_method || 'COD', children: order.payment_method || 'COD' }) }), _jsx("td", { className: "px-6 py-4 text-sm text-center", children: _jsx("div", { className: "flex justify-center", children: _jsx(RiskBadge, { score: order.risk_score }) }) }), _jsx("td", { className: "px-6 py-4 text-sm", children: _jsx(StatusBadge, { status: order.status }) }), _jsx("td", { className: "px-6 py-4 text-sm text-right", onClick: (e) => e.stopPropagation(), children: _jsx("div", { className: "relative action-dropdown-container inline-flex justify-end", children: _jsxs(Button, { onClick: (e) => toggleActionDropdown(order.id, e), size: "sm", className: "!px-3 !py-1.5 !text-xs", children: [_jsx("span", { children: "Action" }), _jsx(ChevronDown, { size: 14, className: `ml-1.5 transition-transform duration-200 ${openActionDropdown === order.id ? 'rotate-180' : ''}` })] }) }) })] }, order.id));
                                            }) })] }) }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-xs text-white/60 px-4 pb-4", children: [_jsxs("div", { children: ["Showing", " ", totalCount === 0
                                                ? 0
                                                : (currentPage - 1) * pageSize + 1, " ", "\u2013", " ", Math.min(currentPage * pageSize, totalCount), " ", "of ", totalCount, " orders"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { className: "px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors", disabled: currentPage === 1, onClick: () => onPageChange(Math.max(1, currentPage - 1)), children: "Prev" }), Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                                                .map((page) => (_jsx("button", { className: `px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors ${page === currentPage ? "bg-[#4C1D95] border-[#7C3AED] text-white" : ""}`, onClick: () => onPageChange(page), children: page }, page))), _jsx("button", { className: "px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors", disabled: currentPage === totalPages, onClick: () => onPageChange(Math.min(totalPages, currentPage + 1)), children: "Next" })] })] })] })] }), openActionDropdown &&
                createPortal(_jsx("div", { "data-dropdown-menu": true, className: "fixed z-[9999] w-48 bg-[#1E223D] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100", style: {
                        left: dropdownPosition.x,
                        top: dropdownPosition.y,
                    }, children: _jsxs("div", { className: "p-1", children: [_jsxs("button", { onClick: () => {
                                    setOpenActionDropdown(null);
                                    onApprove(openActionDropdown);
                                }, className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left", children: [_jsx(CheckCircle, { size: 14, className: "text-green-400" }), "Approve"] }), _jsxs("button", { onClick: () => {
                                    setOpenActionDropdown(null);
                                    onReject(openActionDropdown);
                                }, className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left", children: [_jsx(XCircle, { size: 14, className: "text-red-400" }), "Reject"] }), _jsxs("button", { onClick: () => {
                                    const order = orders.find((o) => o.id === openActionDropdown);
                                    setOpenActionDropdown(null);
                                    if (order)
                                        onEdit(order);
                                }, className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left", children: [_jsx(Edit, { size: 14, className: "text-blue-400" }), "Edit Order"] })] }) }), document.body)] }));
};
