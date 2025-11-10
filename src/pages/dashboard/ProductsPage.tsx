import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Plus, Edit, Trash2, X, Filter } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../../components/ui/Toast';
import { PRODUCT_CATEGORIES, getCategoryDisplayName, getAllCategorySlugs } from '../../constants/productCategories';
import type { Product } from '../../types/supabase';

export const ProductsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const {
    data: products,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    fetchAll,
  } = useSupabaseTable<Product>({ tableName: 'products', enableRealtime: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
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
    setFormData({ name: '', category: '', price: '', stock: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setIsEditMode(true);
    setSelectedProduct(product);
    // Use the category slug as stored (lowercase), or fallback to the stored value
    // Format price with commas for display
    const formattedPrice = product.price ? Number(product.price).toLocaleString('en-US') : '';
    setFormData({
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
    setFormData({ name: '', category: '', price: '', stock: '', status: 'active' });
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
        await updateItem(selectedProduct.id, {
          name: formData.name.trim(),
          category: formData.category.toLowerCase().trim(),
          price: numericPrice,
          stock: stock,
          status: formData.status,
        });
        
        // Explicitly refetch to ensure UI is in sync with database
        await fetchAll();
        
        showSuccess('Product updated successfully!');
        closeModal();
      } else {
        // Add new product
        await addItem({
          name: formData.name.trim(),
          category: formData.category.toLowerCase().trim(),
          price: numericPrice,
          stock: stock,
          status: formData.status,
        });
        
        // Explicitly refetch to ensure UI is in sync with database
        await fetchAll();
        
        const categoryName = getCategoryDisplayName(formData.category);
        showSuccess(`Product added successfully under category: ${categoryName}`);
        closeModal();
      }
    } catch (err) {
      console.error('Error saving product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product. Please try again.';
      showError(errorMessage);
      
      // Refetch on error to ensure UI reflects current database state
      try {
        await fetchAll();
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
    try {
      // Delete the product from Supabase
      await deleteItem(confirmModal.productId);
      
      // Remove from selected IDs if it was selected
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(confirmModal.productId!);
        return next;
      });
      
      // Explicitly refetch to ensure UI is in sync with database
      await fetchAll();
      
      showSuccess(`Product "${confirmModal.productName}" deleted successfully!`);
      setConfirmModal({ isOpen: false, productId: null, productName: '' });
    } catch (err) {
      console.error('Error deleting product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product. Please try again.';
      showError(errorMessage);
      
      // Refetch on error to ensure UI reflects current database state
      try {
        await fetchAll();
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
    try {
      const idsToDelete = Array.from(selectedIds);
      const deletePromises = idsToDelete.map(id => deleteItem(id));
      
      // Delete all selected items in parallel
      await Promise.all(deletePromises);
      
      // Clear selected IDs
      setSelectedIds(new Set());
      
      // Explicitly refetch to ensure UI is in sync with database
      await fetchAll();
      
      showSuccess(`Successfully deleted ${idsToDelete.length} product${idsToDelete.length > 1 ? 's' : ''}!`);
      setDeleteAllModal({ isOpen: false, selectedCount: 0 });
    } catch (err) {
      console.error('Error deleting products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete products. Please try again.';
      showError(errorMessage);
      
      // Refetch on error to ensure UI reflects current database state
      try {
        await fetchAll();
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

  // Get unique categories for filter dropdown (include both standardized and existing categories for backward compatibility)
  const existingCategories = Array.from(new Set(products.map(p => p.category))).filter(
    cat => cat && !getAllCategorySlugs().includes(cat.toLowerCase())
  );

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    // Compare categories case-insensitively for backward compatibility
    const matchesCategory = categoryFilter === 'all' || 
      product.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
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

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Loading products...</p>
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
            <Button onClick={openAddModal} className="w-full sm:w-auto">
              <Plus size={20} className="mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search by Name"
              placeholder="Enter product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Categories</option>
                {PRODUCT_CATEGORIES.map(group => (
                  <optgroup key={group.groupName} label={group.groupName}>
                    {group.categories.map(category => (
                      <option key={category.slug} value={category.slug}>
                        {category.displayName}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {existingCategories.length > 0 && (
                  <optgroup label="Other Categories">
                    {existingCategories.map(category => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
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
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Name</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Category</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Price</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Stock</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                    <td className="px-6 py-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">{product.name}</td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">{getCategoryDisplayName(product.category)}</td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                      {product.price.toLocaleString('vi-VN')} VND
                    </td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">{product.stock}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 rounded hover:bg-white/10 text-[#E5E7EB] transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(product)}
                          className="p-2 rounded hover:bg-red-500/10 text-red-400 transition"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                {products.length === 0
                  ? 'No products found. Add your first product to get started.'
                  : 'No products match your filters.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div 
            className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="product-modal-title" className="text-xl font-semibold text-[#E5E7EB]">
                {isEditMode ? 'Edit Product' : 'Add Product'}
              </h3>
              <button 
                onClick={closeModal} 
                className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300"
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
              />
              <Input
                label="Stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Update' : 'Add'} Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={`Are you sure you want to delete "${confirmModal.productName}"? This action cannot be undone.`}
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
        confirmText={`Delete ${deleteAllModal.selectedCount} Product${deleteAllModal.selectedCount > 1 ? 's' : ''}`}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteAllConfirm}
        onCancel={handleDeleteAllCancel}
        loading={deleteAllLoading}
      />
    </div>
  );
};

