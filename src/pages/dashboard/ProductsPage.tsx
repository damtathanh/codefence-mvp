import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PrimaryActionButton } from '../../components/dashboard/PrimaryActionButton';
import { FilterBar } from '../../components/ui/FilterBar';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { MultiSelectFilter } from '../../components/filters/MultiSelectFilter';
import { Pagination } from '../../features/products/components/Pagination';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AddProductModal } from '../../components/dashboard/AddProductModal';
import { Edit, Trash2, ChevronDown, X, Search } from 'lucide-react';
import { useProductsData } from '../../features/products/hooks/useProductsData';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../features/auth';
import { logUserAction } from '../../utils/logUserAction';
import { generateChanges } from '../../utils/generateChanges';
import { PRODUCT_CATEGORIES, getCategoryDisplayName, getAllCategorySlugs } from '../../constants/productCategories';
import type { Product } from '../../types/supabase';

const STATIC_STATUS_OPTIONS = ['active', 'inactive'];

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Use new Products hook with pagination and filters
  const {
    products,
    totalCount,
    loading,
    error,
    page,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    handleClearFilters,
    refetch,
    availableCategories,
    availableStatuses,
  } = useProductsData();

  // Keep useSupabaseTable for CRUD operations (add/update/delete)
  const {
    addItem,
    updateItem,
    deleteItem,
    fetchAll: fetchAllLegacy,
  } = useSupabaseTable<Product>({ tableName: 'products', enableRealtime: false });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    product_id: '',
    name: '',
    category: '',
    price: '',
    stock: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    productId: string | null;
    productName: string;
  }>({
    isOpen: false,
    productId: null,
    productName: '',
  });
  const [deleteAllModal, setDeleteAllModal] = useState<{
    isOpen: boolean;
    selectedCount: number;
  }>({
    isOpen: false,
    selectedCount: 0,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number; placement: 'bottom' | 'top' }>({ x: 0, y: 0, placement: 'bottom' });


  // Helper function to handle formatted number input for price
  const handleFormattedNumberChange = (field: 'price' | 'stock', e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'price') {
      // For price: format with commas
      let value = e.target.value.replace(/[^\d]/g, ''); // remove non-digits
      const formatted = value ? Number(value).toLocaleString('en-US') : '';
      setFormData({ ...formData, [field]: formatted });
    } else {
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

  const openEditModal = (product: Product) => {
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
    if (!isModalOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  // Handle click outside to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        const updateData: any = {
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
      } else {
        // Add new product
        const productData: any = {
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
    } catch (err) {
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
      } catch (fetchErr) {
        console.error('Error refetching products after save error:', fetchErr);
      }
    }
  };

  const handleDeleteClick = (product: Product) => {
    setConfirmModal({
      isOpen: true,
      productId: product.id,
      productName: product.name,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal.productId) return;

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
    } catch (err) {
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
      } catch (fetchErr) {
        console.error('Error refetching products after delete error:', fetchErr);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmModal({ isOpen: false, productId: null, productName: '' });
  };

  const handleDeleteAllClick = () => {
    if (selectedIds.size === 0) return;
    setDeleteAllModal({
      isOpen: true,
      selectedCount: selectedIds.size,
    });
  };

  const handleDeleteAllConfirm = async () => {
    if (selectedIds.size === 0) return;

    setDeleteAllLoading(true);
    const idsToDelete = Array.from(selectedIds);
    const productsToDelete = products.filter(p => idsToDelete.includes(p.id));

    try {
      const deletePromises = idsToDelete.map(id => deleteItem(id));

      // Delete all selected items in parallel
      await Promise.all(deletePromises);

      // Log user actions for each deleted product
      if (user) {
        const logPromises = productsToDelete.map(product =>
          logUserAction({
            userId: user.id,
            action: 'Delete Product',
            status: 'success',
            orderId: product.product_id ?? "",
          })
        );
        await Promise.all(logPromises);
      }

      // Clear selected IDs
      setSelectedIds(new Set());

      // Explicitly refetch to ensure UI is in sync with database
      await refetch();

      showSuccess(`Successfully deleted ${idsToDelete.length} product${idsToDelete.length > 1 ? 's' : ''} !`);
      setDeleteAllModal({ isOpen: false, selectedCount: 0 });
    } catch (err) {
      console.error('Error deleting products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete products. Please try again.';
      showError(errorMessage);

      // Log failed actions
      if (user) {
        const logPromises = productsToDelete.map(product =>
          logUserAction({
            userId: user.id,
            action: 'Delete Product',
            status: 'failed',
            orderId: product.product_id ?? "",
          })
        );
        await Promise.all(logPromises);
      }

      // Refetch on error to ensure UI reflects current database state
      try {
        await refetch();
      } catch (fetchErr) {
        console.error('Error refetching products after delete all error:', fetchErr);
      }
    } finally {
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
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
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

  // Handle action dropdown toggle with auto-flip positioning
  const toggleActionDropdown = (productId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (openActionDropdown === productId) {
      setOpenActionDropdown(null);
    } else {
      if (event) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const dropdownWidth = 192; // w-48 = 192px
        const dropdownHeight = 96; // Approximate height of 2 menu items (48px each)
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
      setOpenActionDropdown(productId);
    }
  };

  // Handle edit from dropdown
  const handleEditFromDropdown = (product: Product) => {
    setOpenActionDropdown(null);
    openEditModal(product);
  };

  // Handle delete from dropdown
  const handleDeleteFromDropdown = (product: Product) => {
    setOpenActionDropdown(null);
    handleDeleteClick(product);
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

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 flex items-center justify-center">
            <p className="text-[var(--text-muted)]">Loading products...</p>
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
    <div className="space-y-6 p-6 h-full flex flex-col min-h-0">
      {/* Filters */}
      {/* Header */}
      {/* Filters & Actions */}
      {/* Filters & Actions */}
      <FilterBar
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by product name..."
      >
        <MultiSelectFilter
          label="Categories"
          options={categoryOptions}
          selectedValues={categoryFilter}
          onChange={setCategoryFilter}
        />
        <MultiSelectFilter
          label="Status"
          options={statusOptions}
          selectedValues={statusFilter}
          onChange={setStatusFilter}
        />

        {/* Clear filters */}
        <button
          type="button"
          onClick={handleClearFilters}
          className="text-sm text-[var(--text-muted)] whitespace-nowrap hover:text-white transition"
        >
          Clear filters
        </button>

        {/* Action Button */}
        <Button onClick={openAddModal} className="whitespace-nowrap">
          + Add Product
        </Button>
      </FilterBar>

      <Card className="flex-1 flex flex-col min-h-0 relative z-0">
        <CardHeader className="!pt-4 !pb-1 !px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
              >
                {selectedIds.size === products.length && products.length > 0
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
              <button
                onClick={handleDeleteAllClick}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0B0F28] flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete All
              </button>
            )}
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
                      checked={selectedIds.size === products.length && products.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Product ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Product Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Price (VND)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Stock</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-[#E5E7EB] font-medium align-middle" title={product.product_id || product.id}>
                      <span className="block truncate whitespace-nowrap max-w-[200px]">
                        {product.product_id || product.id}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-[#E5E7EB] align-middle"
                      title={product.name}
                    >
                      <span className="block truncate whitespace-nowrap max-w-[200px]">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                      {getCategoryDisplayName(product.category)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                      {product.price.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap align-middle">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="relative action-dropdown-container">
                        <Button
                          onClick={(e) => toggleActionDropdown(product.id, e)}
                          size="sm"
                          className="!px-3 !py-1.5 !text-xs"
                        >
                          <span>Action</span>
                          <ChevronDown
                            size={14}
                            className={`ml - 1.5 transition - transform duration - 200 ${openActionDropdown === product.id ? 'rotate-180' : ''} `}
                          />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                {products.length === 0
                  ? 'No products found. Add your first product to get started.'
                  : 'No products match your filters.'}
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          startIndex={startIndex}
          endIndex={endIndex}
          totalCount={totalCount}
        />
      </Card>

      {/* Action Dropdown Menu - Rendered via Portal */}
      {openActionDropdown && typeof document !== 'undefined' && (() => {
        const product = products.find(p => p.id === openActionDropdown);
        if (!product) return null;

        const dropdownContent = (
          <div
            data-dropdown-menu
            className="fixed z-[9999] w-48 bg-[#1E223D] border border-white/20 rounded-lg shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: dropdownPosition.y,
              left: dropdownPosition.x,
              transformOrigin: dropdownPosition.placement === 'top' ? 'bottom center' : 'top center',
            }}
          >
            <div className="p-1">
              <button
                onClick={() => handleEditFromDropdown(product)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-colors text-left"
              >
                <Edit size={16} className="text-blue-400 flex-shrink-0" />
                <span>Edit Product</span>
              </button>
              <button
                onClick={() => handleDeleteFromDropdown(product)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FCA5A5] hover:bg-white/5 rounded-lg transition-colors text-left"
              >
                <Trash2 size={16} className="text-red-400 flex-shrink-0" />
                <span>Delete Product</span>
              </button>
            </div>
          </div>
        );

        // Render dropdown via Portal to document.body to escape parent containers
        return createPortal(dropdownContent, document.body);
      })()}

      {/* Add Product Modal - Only show in add mode, not edit mode */}
      {isModalOpen && !isEditMode && (
        <AddProductModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSuccess={async () => {
            await refetch();
          }}
        />
      )}

      {/* Edit Modal - Keep inline for edit mode to preserve existing edit functionality */}
      {isModalOpen && isEditMode && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div
            className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] max-w-[550px] w-full shadow-2xl transition-all duration-200 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              animation: 'modalEnter 0.2s ease-out',
            }}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-[#1E223D] flex-shrink-0">
              <h3 id="product-modal-title" className="text-xl font-semibold text-[#E5E7EB]">
                Edit Product
              </h3>
              <button
                onClick={closeModal}
                className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors p-1 rounded hover:bg-white/10"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div
              className="overflow-y-auto"
              style={{
                maxHeight: 'calc(90vh - 80px)',
                paddingRight: '6px'
              }}
            >
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <Input
                  label="Product ID"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  placeholder="e.g., PROD-2024-001"
                  required
                  className="w-full"
                />
                <Input
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full"
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full pr-10 px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300"
                      required
                    >
                      <option value="">Select a category</option>
                      {PRODUCT_CATEGORIES.map(group => (
                        <optgroup key={group.groupName} label={group.groupName}>
                          {group.categories.map(category => (
                            <option key={category.slug} value={category.slug}>
                              {category.displayName}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {/* Show current category if it's not in the standard list (for backward compatibility when editing) */}
                      {isEditMode && selectedProduct &&
                        !getAllCategorySlugs().includes(selectedProduct.category.toLowerCase()) && (
                          <optgroup label="Current Category">
                            <option value={selectedProduct.category.toLowerCase()}>
                              {getCategoryDisplayName(selectedProduct.category)} (Current)
                            </option>
                          </optgroup>
                        )}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isEditMode && selectedProduct &&
                    !getAllCategorySlugs().includes(selectedProduct.category.toLowerCase()) && (
                      <p className="mt-1 text-xs text-yellow-400">
                        This product uses a legacy category. Consider updating to a standardized category.
                      </p>
                    )}
                </div>
                <Input
                  label="Price (VND)"
                  type="text"
                  value={formData.price}
                  onChange={(e) => handleFormattedNumberChange('price', e)}
                  required
                  placeholder="e.g., 20,000,000"
                  className="w-full"
                />
                <Input
                  label="Stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  className="w-full"
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full pr-10 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-[#1E223D]">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Product
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={`Are you sure you want to delete "${confirmModal.productName}" ? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={deleteAllModal.isOpen}
        message={`Are you sure you want to delete ${deleteAllModal.selectedCount} selected product${deleteAllModal.selectedCount > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={`Delete ${deleteAllModal.selectedCount} Product${deleteAllModal.selectedCount > 1 ? 's' : ''} `}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteAllConfirm}
        onCancel={handleDeleteAllCancel}
        loading={deleteAllLoading}
      />
    </div>
  );
};

