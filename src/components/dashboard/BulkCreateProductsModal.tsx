import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Plus, Loader2, Circle } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../utils/logUserAction';
import { PRODUCT_CATEGORIES } from '../../constants/productCategories';
import type { Product } from '../../types/supabase';

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  stock: string;
  status: 'active' | 'inactive';
}

interface ParsedUploadPayload {
  validOrders: any[];
  orders: Array<{ product: string; [key: string]: any }>;
}

interface BulkCreateProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingProducts: string[];
  pendingUpload?: ParsedUploadPayload | null;
  onSuccess?: (pendingUpload?: ParsedUploadPayload | null) => void | Promise<void>;
}

export const BulkCreateProductsModal: React.FC<BulkCreateProductsModalProps> = ({
  isOpen,
  onClose,
  missingProducts,
  pendingUpload,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { fetchAll: refetchProducts } = useSupabaseTable<Product>({ tableName: 'products', enableRealtime: false });
  const [loading, setLoading] = useState(false);
  const [productFormData, setProductFormData] = useState<Map<string, ProductFormData>>(new Map());

  // Initialize form data when modal opens or missingProducts change
  useEffect(() => {
    if (isOpen && missingProducts.length > 0) {
      const initialFormData = new Map<string, ProductFormData>();
      missingProducts.forEach(productName => {
        // Keep existing form data if available, otherwise use defaults
        const existing = productFormData.get(productName);
        initialFormData.set(productName, existing || {
          name: productName,
          category: '',
          price: '',
          stock: '',
          status: 'active',
        });
      });
      setProductFormData(initialFormData);
    }
  }, [isOpen, missingProducts]);

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

  // Handle product form field change
  const handleProductFormChange = (productName: string, field: keyof ProductFormData, value: string | 'active' | 'inactive') => {
    setProductFormData(prev => {
      const next = new Map(prev);
      const current = next.get(productName) || {
        name: productName,
        category: '',
        price: '',
        stock: '',
        status: 'active' as const,
      };
      next.set(productName, { ...current, [field]: value });
      return next;
    });
  };

  // Handle formatted price input for product form
  const handleProductPriceChange = (productName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // remove non-digits
    const formatted = value ? Number(value).toLocaleString('en-US') : '';
    handleProductFormChange(productName, 'price', formatted);
  };

  // Handle bulk product creation submit
  const handleSubmit = async () => {
    if (!missingProducts.length || !user?.id) {
      showError('Unable to create products. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // Validate all products
      const productsToCreate: Array<{
        user_id: string;
        product_id: string;
        name: string;
        category: string;
        price: number;
        stock: number;
        status: 'active' | 'inactive';
      }> = [];

      const errors: string[] = [];

      missingProducts.forEach((productName, index) => {
        const formData = productFormData.get(productName);
        if (!formData) {
          errors.push(`${productName}: Missing form data`);
          return;
        }

        // Validate required fields
        if (!formData.category.trim()) {
          errors.push(`${productName}: Category is required`);
          return;
        }

        // Parse price (remove commas)
        const numericPrice = formData.price ? Number(formData.price.replace(/,/g, '')) : 0;
        if (isNaN(numericPrice) || numericPrice < 0) {
          errors.push(`${productName}: Invalid price`);
          return;
        }

        // Parse stock
        const stock = parseInt(formData.stock);
        if (isNaN(stock) || stock < 0) {
          errors.push(`${productName}: Invalid stock quantity`);
          return;
        }

        // Generate unique product_id from name (use first 3 letters + timestamp + index + random)
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const productId = `${productName.substring(0, 3).toUpperCase()}-${timestamp}-${index}-${random}`;

        productsToCreate.push({
          user_id: user.id,
          product_id: productId,
          name: formData.name.trim(),
          category: formData.category.toLowerCase().trim(),
          price: numericPrice,
          stock: stock,
          status: formData.status,
        });
      });

      if (errors.length > 0) {
        showError(`Please fix the following errors:\n${errors.join('\n')}`);
        setLoading(false);
        return;
      }

      if (productsToCreate.length === 0) {
        showError('No valid products to create.');
        setLoading(false);
        return;
      }

      // Bulk insert all products
      const { data: createdProducts, error: insertError } = await supabase
        .from('products')
        .insert(productsToCreate)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Log user actions for each created product
      if (user && createdProducts) {
        const logPromises = createdProducts.map(product =>
          logUserAction({
            userId: user.id,
            action: 'Create Product',
            status: 'success',
            orderId: product.product_id ?? "",
          })
        );
        await Promise.all(logPromises);
      }

      showSuccess(`Successfully created ${productsToCreate.length} product(s)!`);

      // Refetch products so the new ones are available
      await refetchProducts();

      // Call onSuccess callback with pendingUpload to continue import
      if (onSuccess) {
        await onSuccess(pendingUpload || null);
      }

      // Close modal and reset form
      setProductFormData(new Map());
      onClose();
    } catch (err) {
      console.error('Error creating products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create products. Please try again.';
      showError(errorMessage);
      
      // Log failed actions
      if (user) {
        const logPromises = missingProducts.map(productName =>
          logUserAction({
            userId: user.id,
            action: 'Create Product',
            status: 'failed',
            orderId: productName,
          })
        );
        await Promise.all(logPromises);
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
      aria-labelledby="bulk-product-modal-title"
    >
      <div 
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] max-w-4xl w-full shadow-2xl transition-all duration-200 ease-out flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxHeight: '90vh',
          animation: 'modalEnter 0.2s ease-out',
        }}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E223D] flex-shrink-0">
          <h3 id="bulk-product-modal-title" className="text-xl font-semibold text-[#E5E7EB]">
            Bulk Create Products
          </h3>
          <button 
            onClick={onClose} 
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors p-1 rounded hover:bg-white/10"
            aria-label="Close modal"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="overflow-y-auto flex-1 min-h-0"
          style={{ 
            paddingRight: '6px'
          }}
        >
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#E5E7EB]/80">
                The following products don't exist in your catalog yet. Please fill in the details to create them:
              </p>
            </div>

            {/* Products creation table */}
            <div className="mt-4 overflow-x-auto border border-[#1E223D] rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1E223D]/50 border-b border-[#1E223D]">
                    <th className="text-left py-3 px-4 text-[#E5E7EB] font-medium">Product Name</th>
                    <th className="text-left py-3 px-4 text-[#E5E7EB] font-medium">Category</th>
                    <th className="text-left py-3 px-4 text-[#E5E7EB] font-medium">Price (VND)</th>
                    <th className="text-left py-3 px-4 text-[#E5E7EB] font-medium">Stock</th>
                    <th className="text-left py-3 px-4 text-[#E5E7EB] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {missingProducts.map((productName, idx) => {
                    const formData = productFormData.get(productName) || {
                      name: productName,
                      category: '',
                      price: '',
                      stock: '',
                      status: 'active' as const,
                    };
                    
                    return (
                      <tr key={idx} className="border-b border-[#1E223D]/30 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white/90">
                          <span className="font-medium">{productName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <select
                              value={formData.category}
                              onChange={(e) => handleProductFormChange(productName, 'category', e.target.value)}
                              className="w-full pr-8 px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 transition-all text-sm"
                              required
                              disabled={loading}
                            >
                              <option value="">Select category</option>
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
                            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="text"
                            value={formData.price}
                            onChange={(e) => handleProductPriceChange(productName, e)}
                            placeholder="e.g., 20,000,000"
                            className="w-full !py-2 text-sm"
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            value={formData.stock}
                            onChange={(e) => handleProductFormChange(productName, 'stock', e.target.value)}
                            placeholder="0"
                            className="w-full !py-2 text-sm"
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <select
                              value={formData.status}
                              onChange={(e) => handleProductFormChange(productName, 'status', e.target.value as 'active' | 'inactive')}
                              className="w-full pr-8 px-3 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] text-sm"
                              disabled={loading}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex gap-3 justify-end p-6 border-t border-[#1E223D] flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Create {missingProducts.length} Product{missingProducts.length > 1 ? 's' : ''} + Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

