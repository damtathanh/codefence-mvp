import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Upload, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { useOrders, type OrderInput, type InvalidOrderRow } from '../../hooks/useOrders';
import { useToast } from '../ui/Toast';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import type { Product } from '../../types/supabase';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { validateOrder, insertOrder, parseFile, insertOrders, validateAndMapProducts } = useOrders();
  const { showSuccess, showError } = useToast();
  
  // Fetch products for dropdown (only active products)
  const { data: allProducts = [] } = useSupabaseTable<Product>({ 
    tableName: 'products'
  });
  const products = allProducts.filter(p => p.status === 'active');

  // Manual entry form state
  const [formData, setFormData] = useState<Partial<OrderInput>>({
    order_id: '',
    customer_name: '',
    phone: '',
    address: '',
    product_id: '',
    amount: 0,
  });

  // File upload state
  const [uploadedOrders, setUploadedOrders] = useState<Array<{ product: string; [key: string]: any }>>([]);
  const [invalidOrders, setInvalidOrders] = useState<InvalidOrderRow[]>([]);
  const [correctedOrders, setCorrectedOrders] = useState<Map<number, string>>(new Map()); // rowIndex -> product_id
  const [showPreview, setShowPreview] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        order_id: '',
        customer_name: '',
        phone: '',
        address: '',
        product_id: '',
        amount: 0,
      });
      setUploadProgress('');
      setUploadedOrders([]);
      setInvalidOrders([]);
      setCorrectedOrders(new Map());
      setShowPreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Handle manual form submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Validate product is selected
      if (!formData.product_id) {
        showError('Please select a valid product from the list.');
        setLoading(false);
        return;
      }

      // Validate order
      const validationError = validateOrder(formData as OrderInput);
      if (validationError) {
        showError(validationError);
        setLoading(false);
        return;
      }

      // Insert order
      await insertOrder(formData as OrderInput);
      
      showSuccess('Order added successfully!');
      
      // Refresh orders table
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add order';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress('Parsing file...');

    try {
      // Parse file
      const orders = await parseFile(file);
      
      if (orders.length === 0) {
        showError('No valid orders found in the file.');
        setLoading(false);
        return;
      }

      setUploadProgress(`Found ${orders.length} orders. Validating products...`);

      // Validate and map products
      const { validOrders, invalidOrders: invalid } = await validateAndMapProducts(orders);
      
      setUploadedOrders(orders);
      setInvalidOrders(invalid);
      setCorrectedOrders(new Map());
      
      if (invalid.length > 0) {
        // Show preview with invalid orders
        setShowPreview(true);
        setUploadProgress(`Found ${invalid.length} order(s) with invalid products. Please correct them below.`);
        setLoading(false);
      } else {
        // All orders are valid, insert them
        setUploadProgress(`Inserting ${validOrders.length} orders...`);
        const result = await insertOrders(validOrders);

        if (result.success > 0) {
          showSuccess(`Successfully added ${result.success} order(s)!`);
          
          // Refresh orders table
          if (onSuccess) {
            onSuccess();
          }
          
          onClose();
        } else {
          showError(`Failed to add orders: ${result.errors.join(', ')}`);
        }
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      showError(errorMessage);
      setLoading(false);
    }
  };

  // Handle product correction for invalid orders
  const handleProductCorrection = (rowIndex: number, productId: string) => {
    setCorrectedOrders(prev => {
      const next = new Map(prev);
      next.set(rowIndex, productId);
      return next;
    });
  };

  // Confirm upload after corrections
  const handleConfirmUpload = async () => {
    if (invalidOrders.length === 0) {
      return;
    }

    setLoading(true);
    setUploadProgress('Processing corrected orders...');

    try {
      // Merge corrected orders with valid orders
      const allOrders: OrderInput[] = [];
      
      // Add corrected invalid orders
      invalidOrders.forEach(({ order, rowIndex }) => {
        const productId = correctedOrders.get(rowIndex);
        if (productId) {
          const { product: _, ...rest } = order;
          allOrders.push({
            ...rest,
            product_id: productId,
          } as OrderInput);
        }
      });

      // Validate that all invalid orders have been corrected
      const uncorrected = invalidOrders.filter(({ rowIndex }) => !correctedOrders.has(rowIndex));
      if (uncorrected.length > 0) {
        showError(`Please correct all ${uncorrected.length} invalid product(s) before confirming.`);
        setLoading(false);
        return;
      }

      // Get valid orders from the original upload
      const { validOrders } = await validateAndMapProducts(uploadedOrders.filter((_, idx) => {
        return !invalidOrders.some(inv => inv.rowIndex === idx + 1);
      }));

      // Combine all orders
      const finalOrders = [...validOrders, ...allOrders];

      // Insert all orders
      const result = await insertOrders(finalOrders);

      if (result.success > 0) {
        showSuccess(`Successfully added ${result.success} order(s)!`);
        
        // Refresh orders table
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        showError(`Failed to add orders: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process orders';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onClose]);

  // Handle click outside to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-order-modal-title"
    >
      <div 
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 id="add-order-modal-title" className="text-xl font-semibold text-[#E5E7EB]">Add Order</h3>
          <button
            onClick={onClose}
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors"
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#1E223D]">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
                : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'
            }`}
            disabled={loading}
          >
            <FileText size={16} className="inline mr-2" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
                : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'
            }`}
            disabled={loading}
          >
            <Upload size={16} className="inline mr-2" />
            Upload File
          </button>
        </div>

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-5">
            <Input
              label="Order ID"
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              required
              disabled={loading}
              placeholder="e.g., ORD-2024-001"
            />
            <Input
              label="Customer Name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              required
              disabled={loading}
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={loading}
            />
            <Input
              label="Address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading}
            />
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">
                Product <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.product_id || ''}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300"
                required
                disabled={loading}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {products.length === 0 && (
                <p className="mt-1 text-xs text-yellow-400">
                  No products available. Please add products first.
                </p>
              )}
            </div>
            <Input
              label="Amount (VND)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              min="0"
              step="0.01"
              disabled={loading}
            />
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> Status will be set to "Pending" and Risk Score will be set to "N/A" automatically.
              </p>
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#1E223D]">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Order'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-5">
            {!showPreview ? (
              <>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                  <Upload size={48} className="mx-auto mb-4 text-[#E5E7EB]/50" />
                  <p className="text-[#E5E7EB] mb-2">Upload CSV or XLSX file</p>
                  <p className="text-sm text-[#E5E7EB]/70 mb-4">
                    Supported formats: .csv, .xlsx, .xls
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>

                {uploadProgress && (
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                    <p className="text-sm text-blue-300">{uploadProgress}</p>
                  </div>
                )}

                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm font-medium text-[#E5E7EB] mb-2">Expected CSV/XLSX columns:</p>
                  <ul className="text-xs text-[#E5E7EB]/70 space-y-1 list-disc list-inside">
                    <li>Order ID (required)</li>
                    <li>Customer Name (required)</li>
                    <li>Phone / Phone Number (required)</li>
                    <li>Address (optional)</li>
                    <li>Product / Product Name (required) - must match an existing product</li>
                    <li>Amount (required)</li>
                  </ul>
                  <p className="text-xs text-blue-300 mt-2">
                    <strong>Note:</strong> Status will be set to "Pending" and Risk Score will be set to "N/A" automatically.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Invalid Orders Preview */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-400 mb-1">
                        {invalidOrders.length} order(s) with invalid products
                      </p>
                      <p className="text-xs text-red-300">
                        Please select a valid product for each order below before confirming the upload.
                      </p>
                    </div>
                  </div>
                </div>

                {uploadProgress && (
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                    <p className="text-sm text-blue-300">{uploadProgress}</p>
                  </div>
                )}

                {/* Invalid Orders Table */}
                <div className="max-h-96 overflow-y-auto border border-[#1E223D] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-[#E5E7EB] font-semibold">Row</th>
                        <th className="px-4 py-2 text-left text-[#E5E7EB] font-semibold">Order ID</th>
                        <th className="px-4 py-2 text-left text-[#E5E7EB] font-semibold">Customer</th>
                        <th className="px-4 py-2 text-left text-[#E5E7EB] font-semibold">Invalid Product</th>
                        <th className="px-4 py-2 text-left text-[#E5E7EB] font-semibold">Select Product</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E223D]">
                      {invalidOrders.map(({ order, rowIndex, reason }) => (
                        <tr key={rowIndex} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-[#E5E7EB]">{rowIndex}</td>
                          <td className="px-4 py-3 text-[#E5E7EB]">{order.order_id}</td>
                          <td className="px-4 py-3 text-[#E5E7EB]">{order.customer_name}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 border border-red-600 text-red-300 text-xs">
                              <AlertTriangle size={12} />
                              {order.product || order.product_name || 'N/A'}
                            </span>
                            <p className="text-xs text-red-400 mt-1">{reason}</p>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={correctedOrders.get(rowIndex) || ''}
                              onChange={(e) => handleProductCorrection(rowIndex, e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] text-xs focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50"
                            >
                              <option value="">Select product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-[#1E223D]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPreview(false);
                      setInvalidOrders([]);
                      setCorrectedOrders(new Map());
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={loading || invalidOrders.some(({ rowIndex }) => !correctedOrders.has(rowIndex))}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Confirm Upload (${correctedOrders.size}/${invalidOrders.length})`
                    )}
                  </Button>
                </div>
              </>
            )}

            {!showPreview && (
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#1E223D]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

