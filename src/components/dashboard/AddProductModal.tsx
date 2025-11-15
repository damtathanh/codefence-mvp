import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { logUserAction } from '../../utils/logUserAction';
import { PRODUCT_CATEGORIES, getCategoryDisplayName, getAllCategorySlugs } from '../../constants/productCategories';
import type { Product } from '../../types/supabase';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  initialName?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { addItem, fetchAll } = useSupabaseTable<Product>({ tableName: 'products', enableRealtime: false });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    name: initialName,
    category: '',
    price: '',
    stock: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Update form when initialName changes
  useEffect(() => {
    if (isOpen && initialName) {
      setFormData(prev => ({ ...prev, name: initialName }));
    }
  }, [isOpen, initialName]);

  // Helper function to handle formatted number input for price
  const handleFormattedNumberChange = (field: 'price' | 'stock', e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'price') {
      let value = e.target.value.replace(/[^\d]/g, '');
      const formatted = value ? Number(value).toLocaleString('en-US') : '';
      setFormData({ ...formData, [field]: formatted });
    } else {
      setFormData({ ...formData, [field]: e.target.value });
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Handle click outside to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate Product ID is required
      if (!formData.product_id.trim()) {
        showError('Please enter a Product ID');
        setLoading(false);
        return;
      }

      // Validate category is selected
      if (!formData.category) {
        showError('Please select a category');
        setLoading(false);
        return;
      }

      // Convert formatted price string back to number (remove commas)
      const numericPrice = formData.price ? Number(formData.price.replace(/,/g, '')) : 0;
      const stock = parseInt(formData.stock);
      
      if (isNaN(numericPrice) || numericPrice < 0) {
        showError('Please enter a valid price');
        setLoading(false);
        return;
      }
      
      if (isNaN(stock) || stock < 0) {
        showError('Please enter a valid stock quantity');
        setLoading(false);
        return;
      }

      // Add new product
      const productData: any = {
        product_id: formData.product_id.trim(),
        name: formData.name.trim(),
        category: formData.category.toLowerCase().trim(),
        price: numericPrice,
        stock: stock,
        status: formData.status,
      };

      const newProduct = await addItem(productData);
      
      // Explicitly refetch to ensure UI is in sync
      await fetchAll();
      
      // Log user action
      if (user && newProduct) {
        await logUserAction({
          userId: user.id,
          action: 'Create Product',
          status: 'success',
          orderId: newProduct.product_id ?? "",
        });
      }
      
      const categoryName = getCategoryDisplayName(formData.category);
      showSuccess(`Product added successfully under category: ${categoryName}`);
      
      // Reset form
      setFormData({ product_id: '', name: initialName || '', category: '', price: '', stock: '', status: 'active' });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        await onSuccess();
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product. Please try again.';
      showError(errorMessage);
      
      // Log failed action
      if (user) {
        await logUserAction({
          userId: user.id,
          action: 'Create Product',
          status: 'failed',
          orderId: formData.product_id.trim() || "",
        });
      }
      
      // Refetch on error to ensure UI reflects current database state
      try {
        await fetchAll();
      } catch (fetchErr) {
        console.error('Error refetching products after save error:', fetchErr);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-200"
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
            Add Product
          </h3>
          <button 
            onClick={onClose} 
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
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
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
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

