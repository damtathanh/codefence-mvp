import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FilterBar } from '../../components/ui/FilterBar';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { MultiSelectFilter } from '../../components/filters/MultiSelectFilter';
import { Pagination } from '../../features/products/components/Pagination';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AddProductModal } from '../../components/dashboard/AddProductModal';
import { Edit, Trash2, ChevronDown, X } from 'lucide-react';
import { useProductsData } from '../../features/products/hooks/useProductsData';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../features/auth';
import { logUserAction } from '../../utils/logUserAction';
import { generateChanges } from '../../utils/generateChanges';
import { PRODUCT_CATEGORIES, getCategoryDisplayName, getAllCategorySlugs } from '../../constants/productCategories';
const STATIC_STATUS_OPTIONS = ['active', 'inactive'];
export const ProductsPage = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    // Use new Products hook with pagination and filters
    const { products, totalCount, loading, error, page, totalPages, startIndex, endIndex, handlePageChange, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, handleClearFilters, refetch, availableCategories, availableStatuses, } = useProductsData();
    // Keep useSupabaseTable for CRUD operations (add/update/delete)
    const { addItem, updateItem, deleteItem, fetchAll: fetchAllLegacy, } = useSupabaseTable({ tableName: 'products', enableRealtime: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [formData, setFormData] = useState({
        product_id: '',
        name: '',
        category: '',
        price: '',
        stock: '',
        status: 'active',
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        productId: null,
        productName: '',
    });
    const [deleteAllModal, setDeleteAllModal] = useState({
        isOpen: false,
        selectedCount: 0,
    });
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteAllLoading, setDeleteAllLoading] = useState(false);
    const [openActionDropdown, setOpenActionDropdown] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, placement: 'bottom' });
    // Helper function to handle formatted number input for price
    const handleFormattedNumberChange = (field, e) => {
        if (field === 'price') {
            // For price: format with commas
            let value = e.target.value.replace(/[^\d]/g, ''); // remove non-digits
            const formatted = value ? Number(value).toLocaleString('en-US') : '';
            setFormData({ ...formData, [field]: formatted });
        }
        else {
            // For stock: keep as-is (no formatting needed)
            setFormData({ ...formData, [field]: e.target.value });
        }
    };
    const openAddModal = () => {
        setIsEditMode(false);
        setSelectedProduct(null);
        setFormData({ product_id: '', name: '', category: '', price: '', stock: '', status: 'active' });
        setIsModalOpen(true);
    };
    const openEditModal = (product) => {
        setIsEditMode(true);
        setSelectedProduct(product);
        // Use the category slug as stored (lowercase), or fallback to the stored value
        // Format price with commas for display
        const formattedPrice = product.price ? Number(product.price).toLocaleString('en-US') : '';
        setFormData({
            product_id: product.product_id || '',
            name: product.name,
            category: product.category.toLowerCase(),
            price: formattedPrice,
            stock: product.stock.toString(),
            status: product.status,
        });
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ product_id: '', name: '', category: '', price: '', stock: '', status: 'active' });
    };
    // Handle ESC key to close modal
    useEffect(() => {
        if (!isModalOpen)
            return;
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isModalOpen]);
    // Handle click outside to close modal
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validate Product ID is required
            if (!formData.product_id.trim()) {
                showError('Please enter a Product ID');
                return;
            }
            // Validate category is selected
            if (!formData.category) {
                showError('Please select a category');
                return;
            }
            // Convert formatted price string back to number (remove commas)
            const numericPrice = formData.price ? Number(formData.price.replace(/,/g, '')) : 0;
            const stock = parseInt(formData.stock);
            if (isNaN(numericPrice) || numericPrice < 0) {
                showError('Please enter a valid price');
                return;
            }
            if (isNaN(stock) || stock < 0) {
                showError('Please enter a valid stock quantity');
                return;
            }
            if (isEditMode && selectedProduct) {
                // Update existing product
                // Capture previous data for change tracking
                const previousData = {
                    product_id: selectedProduct.product_id || '',
                    name: selectedProduct.name,
                    category: getCategoryDisplayName(selectedProduct.category),
                    price: selectedProduct.price,
                    stock: selectedProduct.stock,
                    status: selectedProduct.status,
                };
                // Use UUID (product.id) for WHERE condition, update product_id field
                const updateData = {
                    product_id: formData.product_id.trim(),
                    name: formData.name.trim(),
                    category: formData.category.toLowerCase().trim(), // Store as slug in DB
                    price: numericPrice,
                    stock: stock,
                    status: formData.status,
                };
                // Generate changes before updating (use display names for better readability)
                const changes = generateChanges(previousData, {
                    ...updateData,
                    category: getCategoryDisplayName(formData.category), // Use display name for change tracking
                });
                // updateItem uses UUID (selectedProduct.id) for WHERE condition
                const updatedProduct = await updateItem(selectedProduct.id, updateData);
                // Explicitly refetch to ensure UI is in sync with database
                await refetch();
                // Log user action (use product_id for logging)
                if (user) {
                    await logUserAction({
                        userId: user.id,
                        action: 'Update Product',
                        status: 'success',
                        orderId: formData.product_id.trim() || "",
                        details: Object.keys(changes).length > 0 ? changes : null,
                    });
                }
                showSuccess('Product updated successfully!');
                closeModal();
            }
            else {
                // Add new product
                const productData = {
                    product_id: formData.product_id.trim(), // Custom business ID (TEXT)
                    name: formData.name.trim(),
                    category: formData.category.toLowerCase().trim(),
                    price: numericPrice,
                    stock: stock,
                    status: formData.status,
                };
                const newProduct = await addItem(productData);
                // Explicitly refetch to ensure UI is in sync with database
                await refetch();
                // Log user action (use product_id for logging)
                if (user && newProduct) {
                    await logUserAction({
                        userId: user.id,
                        action: 'Create Product',
                        status: 'success',
                        orderId: newProduct.product_id ?? "",
                    });
                }
                const categoryName = getCategoryDisplayName(formData.category);
                showSuccess(`Product added successfully under category: ${categoryName} `);
                closeModal();
            }
        }
        catch (err) {
            console.error('Error saving product:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to save product. Please try again.';
            showError(errorMessage);
            // Log failed action
            if (user) {
                await logUserAction({
                    userId: user.id,
                    action: isEditMode ? 'Update Product' : 'Create Product',
                    status: 'failed',
                    orderId: isEditMode ? (selectedProduct?.product_id ?? "") : "",
                });
            }
            // Refetch on error to ensure UI reflects current database state
            try {
                await refetch();
            }
            catch (fetchErr) {
                console.error('Error refetching products after save error:', fetchErr);
            }
        }
    };
    const handleDeleteClick = (product) => {
        setConfirmModal({
            isOpen: true,
            productId: product.id,
            productName: product.name,
        });
    };
    const handleDeleteConfirm = async () => {
        if (!confirmModal.productId)
            return;
        setDeleteLoading(true);
        const productId = confirmModal.productId;
        const productName = confirmModal.productName;
        // Find the product to get its product_id before deleting
        const productToDelete = products.find(p => p.id === productId);
        const customProductId = productToDelete?.product_id ?? "";
        try {
            // Delete the product from Supabase
            await deleteItem(productId);
            // Remove from selected IDs if it was selected
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
            // Explicitly refetch to ensure UI is in sync with database
            await refetch();
            // Log user action
            if (user) {
                await logUserAction({
                    userId: user.id,
                    action: 'Delete Product',
                    status: 'success',
                    orderId: customProductId,
                });
            }
            showSuccess(`Product "${productName}" deleted successfully!`);
            setConfirmModal({ isOpen: false, productId: null, productName: '' });
        }
        catch (err) {
            console.error('Error deleting product:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete product. Please try again.';
            showError(errorMessage);
            // Log failed action
            if (user) {
                await logUserAction({
                    userId: user.id,
                    action: 'Delete Product',
                    status: 'failed',
                    orderId: customProductId,
                });
            }
            // Refetch on error to ensure UI reflects current database state
            try {
                await refetch();
            }
            catch (fetchErr) {
                console.error('Error refetching products after delete error:', fetchErr);
            }
        }
        finally {
            setDeleteLoading(false);
        }
    };
    const handleDeleteCancel = () => {
        setConfirmModal({ isOpen: false, productId: null, productName: '' });
    };
    const handleDeleteAllClick = () => {
        if (selectedIds.size === 0)
            return;
        setDeleteAllModal({
            isOpen: true,
            selectedCount: selectedIds.size,
        });
    };
    const handleDeleteAllConfirm = async () => {
        if (selectedIds.size === 0)
            return;
        setDeleteAllLoading(true);
        const idsToDelete = Array.from(selectedIds);
        const productsToDelete = products.filter(p => idsToDelete.includes(p.id));
        try {
            const deletePromises = idsToDelete.map(id => deleteItem(id));
            // Delete all selected items in parallel
            await Promise.all(deletePromises);
            // Log user actions for each deleted product
            if (user) {
                const logPromises = productsToDelete.map(product => logUserAction({
                    userId: user.id,
                    action: 'Delete Product',
                    status: 'success',
                    orderId: product.product_id ?? "",
                }));
                await Promise.all(logPromises);
            }
            // Clear selected IDs
            setSelectedIds(new Set());
            // Explicitly refetch to ensure UI is in sync with database
            await refetch();
            showSuccess(`Successfully deleted ${idsToDelete.length} product${idsToDelete.length > 1 ? 's' : ''} !`);
            setDeleteAllModal({ isOpen: false, selectedCount: 0 });
        }
        catch (err) {
            console.error('Error deleting products:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete products. Please try again.';
            showError(errorMessage);
            // Log failed actions
            if (user) {
                const logPromises = productsToDelete.map(product => logUserAction({
                    userId: user.id,
                    action: 'Delete Product',
                    status: 'failed',
                    orderId: product.product_id ?? "",
                }));
                await Promise.all(logPromises);
            }
            // Refetch on error to ensure UI reflects current database state
            try {
                await refetch();
            }
            catch (fetchErr) {
                console.error('Error refetching products after delete all error:', fetchErr);
            }
        }
        finally {
            setDeleteAllLoading(false);
        }
    };
    const handleDeleteAllCancel = () => {
        setDeleteAllModal({ isOpen: false, selectedCount: 0 });
    };
    // Category and status options for multi-select
    const categoryOptions = (availableCategories ?? []).map((c) => ({
        value: c,
        label: c, // Display category name as is from DB
    }));
    const statusOptions = (availableStatuses ?? []).map((s) => ({
        value: s,
        label: s.toUpperCase(), // Format status if needed
    }));
    const handleSelectAll = () => {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(products.map(p => p.id)));
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
    // Handle action dropdown toggle with auto-flip positioning
    const toggleActionDropdown = (productId, event) => {
        if (openActionDropdown === productId) {
            setOpenActionDropdown(null);
        }
        else {
            if (event) {
                const rect = event.currentTarget.getBoundingClientRect();
                const dropdownWidth = 192; // w-48 = 192px
                const dropdownHeight = 96; // Approximate height of 2 menu items (48px each)
                const padding = 8; // Space between button and dropdown
                // Calculate available space below and above
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                // Determine placement: show below if enough space, otherwise show above
                const placement = spaceBelow >= dropdownHeight + padding ? 'bottom' : 'top';
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
            setOpenActionDropdown(productId);
        }
    };
    // Handle edit from dropdown
    const handleEditFromDropdown = (product) => {
        setOpenActionDropdown(null);
        openEditModal(product);
    };
    // Handle delete from dropdown
    const handleDeleteFromDropdown = (product) => {
        setOpenActionDropdown(null);
        handleDeleteClick(product);
    };
    // Close dropdown when clicking outside or scrolling
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
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
    if (loading && products.length === 0) {
        return (_jsx("div", { className: "flex flex-col h-full min-h-0", children: _jsx(Card, { className: "flex-1 flex flex-col min-h-0", children: _jsx(CardContent, { className: "flex-1 flex items-center justify-center", children: _jsx("p", { className: "text-[var(--text-muted)]", children: "Loading products..." }) }) }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex flex-col h-full min-h-0", children: _jsx(Card, { className: "flex-1 flex flex-col min-h-0", children: _jsxs(CardContent, { className: "flex-1 flex flex-col items-center justify-center", children: [_jsxs("p", { className: "text-red-400 mb-4", children: ["Error: ", error] }), _jsx(Button, { onClick: () => window.location.reload(), children: "Retry" })] }) }) }));
    }
    return (_jsxs("div", { className: "space-y-6 p-6 h-full flex flex-col min-h-0", children: [_jsxs(FilterBar, { searchValue: searchQuery, onSearch: setSearchQuery, searchPlaceholder: "Search by product name...", children: [_jsx(MultiSelectFilter, { label: "Categories", options: categoryOptions, selectedValues: categoryFilter, onChange: setCategoryFilter }), _jsx(MultiSelectFilter, { label: "Status", options: statusOptions, selectedValues: statusFilter, onChange: setStatusFilter }), _jsx("button", { type: "button", onClick: handleClearFilters, className: "text-sm text-[var(--text-muted)] whitespace-nowrap hover:text-white transition", children: "Clear filters" }), _jsx(Button, { onClick: openAddModal, className: "whitespace-nowrap", children: "+ Add Product" })] }), _jsxs(Card, { className: "flex-1 flex flex-col min-h-0 relative z-0", children: [_jsx(CardHeader, { className: "!pt-4 !pb-1 !px-6 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: handleSelectAll, className: "text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition", children: selectedIds.size === products.length && products.length > 0
                                                ? 'Deselect All'
                                                : 'Select All' }), selectedIds.size > 0 && (_jsxs("span", { className: "text-sm text-[var(--text-muted)]", children: [selectedIds.size, " selected"] }))] }), selectedIds.size > 0 && (_jsxs("button", { onClick: handleDeleteAllClick, className: "px-4 py-2 text-sm font-semibold rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0B0F28] flex items-center gap-2", children: [_jsx(Trash2, { size: 16 }), "Delete All"] }))] }) }), _jsx(CardContent, { className: "flex-1 min-h-0 overflow-y-auto p-0", children: _jsxs("div", { className: "w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent", children: [_jsxs("table", { className: "min-w-[1100px] w-full border-separate border-spacing-0", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[#1E223D]", children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap w-12", children: _jsx("input", { type: "checkbox", checked: selectedIds.size === products.length && products.length > 0, onChange: handleSelectAll, className: "w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer" }) }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Product ID" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Product Name" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Category" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Price (VND)" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Stock" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Actions" })] }) }), _jsx("tbody", { children: products.map((product) => (_jsxs("tr", { className: "border-b border-[#1E223D] hover:bg-white/5 transition", children: [_jsx("td", { className: "px-6 py-4 align-middle", children: _jsx("input", { type: "checkbox", checked: selectedIds.has(product.id), onChange: () => handleToggleSelect(product.id), className: "w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer" }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] font-medium align-middle", title: product.product_id || product.id, children: _jsx("span", { className: "block truncate whitespace-nowrap max-w-[200px]", children: product.product_id || product.id }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] align-middle", title: product.name, children: _jsx("span", { className: "block truncate whitespace-nowrap max-w-[200px]", children: product.name }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle", children: getCategoryDisplayName(product.category) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle", children: product.price.toLocaleString('vi-VN') }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle", children: product.stock }), _jsx("td", { className: "px-6 py-4 align-middle", children: _jsx(StatusBadge, { status: product.status }) }), _jsx("td", { className: "px-6 py-4 align-middle", children: _jsx("div", { className: "relative action-dropdown-container", children: _jsxs(Button, { onClick: (e) => toggleActionDropdown(product.id, e), size: "sm", className: "!px-3 !py-1.5 !text-xs", children: [_jsx("span", { children: "Action" }), _jsx(ChevronDown, { size: 14, className: `ml - 1.5 transition - transform duration - 200 ${openActionDropdown === product.id ? 'rotate-180' : ''} ` })] }) }) })] }, product.id))) })] }), products.length === 0 && (_jsx("div", { className: "p-12 text-center text-[#E5E7EB]/70", children: products.length === 0
                                        ? 'No products found. Add your first product to get started.'
                                        : 'No products match your filters.' }))] }) }), _jsx(Pagination, { currentPage: page, totalPages: totalPages, onPageChange: handlePageChange, startIndex: startIndex, endIndex: endIndex, totalCount: totalCount })] }), openActionDropdown && typeof document !== 'undefined' && (() => {
                const product = products.find(p => p.id === openActionDropdown);
                if (!product)
                    return null;
                const dropdownContent = (_jsx("div", { "data-dropdown-menu": true, className: "fixed z-[9999] w-48 bg-[#1E223D] border border-white/20 rounded-lg shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100", style: {
                        top: dropdownPosition.y,
                        left: dropdownPosition.x,
                        transformOrigin: dropdownPosition.placement === 'top' ? 'bottom center' : 'top center',
                    }, children: _jsxs("div", { className: "p-1", children: [_jsxs("button", { onClick: () => handleEditFromDropdown(product), className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left", children: [_jsx(Edit, { size: 16, className: "text-blue-400 flex-shrink-0" }), _jsx("span", { children: "Edit Product" })] }), _jsxs("button", { onClick: () => handleDeleteFromDropdown(product), className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FCA5A5] hover:bg-white/5 rounded-lg transition-colors text-left", children: [_jsx(Trash2, { size: 16, className: "text-red-400 flex-shrink-0" }), _jsx("span", { children: "Delete Product" })] })] }) }));
                // Render dropdown via Portal to document.body to escape parent containers
                return createPortal(dropdownContent, document.body);
            })(), isModalOpen && !isEditMode && (_jsx(AddProductModal, { isOpen: isModalOpen, onClose: closeModal, onSuccess: async () => {
                    await refetch();
                } })), isModalOpen && isEditMode && (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200", onClick: handleOverlayClick, role: "dialog", "aria-modal": "true", "aria-labelledby": "product-modal-title", children: _jsxs("div", { className: "bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] max-w-[550px] w-full shadow-2xl transition-all duration-200 ease-out", onClick: (e) => e.stopPropagation(), style: {
                        maxHeight: '90vh',
                        animation: 'modalEnter 0.2s ease-out',
                    }, children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[#1E223D] flex-shrink-0", children: [_jsx("h3", { id: "product-modal-title", className: "text-xl font-semibold text-[#E5E7EB]", children: "Edit Product" }), _jsx("button", { onClick: closeModal, className: "text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors p-1 rounded hover:bg-white/10", "aria-label": "Close modal", children: _jsx(X, { size: 20 }) })] }), _jsx("div", { className: "overflow-y-auto", style: {
                                maxHeight: 'calc(90vh - 80px)',
                                paddingRight: '6px'
                            }, children: _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-5", children: [_jsx(Input, { label: "Product ID", value: formData.product_id, onChange: (e) => setFormData({ ...formData, product_id: e.target.value }), placeholder: "e.g., PROD-2024-001", required: true, className: "w-full" }), _jsx(Input, { label: "Product Name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), required: true, className: "w-full" }), _jsxs("div", { className: "w-full", children: [_jsxs("label", { className: "block text-sm font-medium text-[#E5E7EB]/90 mb-2", children: ["Category ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: formData.category, onChange: (e) => setFormData({ ...formData, category: e.target.value }), className: "w-full pr-10 px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300", required: true, children: [_jsx("option", { value: "", children: "Select a category" }), PRODUCT_CATEGORIES.map(group => (_jsx("optgroup", { label: group.groupName, children: group.categories.map(category => (_jsx("option", { value: category.slug, children: category.displayName }, category.slug))) }, group.groupName))), isEditMode && selectedProduct &&
                                                                !getAllCategorySlugs().includes(selectedProduct.category.toLowerCase()) && (_jsx("optgroup", { label: "Current Category", children: _jsxs("option", { value: selectedProduct.category.toLowerCase(), children: [getCategoryDisplayName(selectedProduct.category), " (Current)"] }) }))] }), _jsx("svg", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 9l-7 7-7-7" }) })] }), isEditMode && selectedProduct &&
                                                !getAllCategorySlugs().includes(selectedProduct.category.toLowerCase()) && (_jsx("p", { className: "mt-1 text-xs text-yellow-400", children: "This product uses a legacy category. Consider updating to a standardized category." }))] }), _jsx(Input, { label: "Price (VND)", type: "text", value: formData.price, onChange: (e) => handleFormattedNumberChange('price', e), required: true, placeholder: "e.g., 20,000,000", className: "w-full" }), _jsx(Input, { label: "Stock", type: "number", value: formData.stock, onChange: (e) => setFormData({ ...formData, stock: e.target.value }), required: true, className: "w-full" }), _jsxs("div", { className: "w-full", children: [_jsx("label", { className: "block text-sm font-medium text-[#E5E7EB]/90 mb-2", children: "Status" }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: formData.status, onChange: (e) => setFormData({ ...formData, status: e.target.value }), className: "w-full pr-10 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]", children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] }), _jsx("svg", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 9l-7 7-7-7" }) })] })] }), _jsxs("div", { className: "flex gap-3 justify-end pt-4 border-t border-[#1E223D]", children: [_jsx(Button, { type: "button", variant: "outline", onClick: closeModal, children: "Cancel" }), _jsx(Button, { type: "submit", children: "Update Product" })] })] }) })] }) })), _jsx(ConfirmModal, { isOpen: confirmModal.isOpen, message: `Are you sure you want to delete "${confirmModal.productName}" ? This action cannot be undone.`, confirmText: "Delete Product", cancelText: "Cancel", variant: "danger", onConfirm: handleDeleteConfirm, onCancel: handleDeleteCancel, loading: deleteLoading }), _jsx(ConfirmModal, { isOpen: deleteAllModal.isOpen, message: `Are you sure you want to delete ${deleteAllModal.selectedCount} selected product${deleteAllModal.selectedCount > 1 ? 's' : ''}? This action cannot be undone.`, confirmText: `Delete ${deleteAllModal.selectedCount} Product${deleteAllModal.selectedCount > 1 ? 's' : ''} `, cancelText: "Cancel", variant: "danger", onConfirm: handleDeleteAllConfirm, onCancel: handleDeleteAllCancel, loading: deleteAllLoading })] }));
};
