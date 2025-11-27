import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { logUserAction } from '../../utils/logUserAction';
import { PRODUCT_CATEGORIES, getCategoryDisplayName } from '../../constants/productCategories';
import type { Product } from '../../types/supabase';
import * as XLSX from 'xlsx';
import { validateAndMapProductHeaders } from '../../utils/productColumnMapper';
import type { HeaderValidationResult } from '../../utils/productColumnMapper';
import { supabase } from '../../lib/supabaseClient';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  initialName?: string;
}

export interface ProductInput {
  product_id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
}) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { addItem, fetchAll } = useSupabaseTable<Product>({ tableName: 'products', enableRealtime: false });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to handle formatted number input for price/stock
  const handleFormattedNumberChange = (field: 'price' | 'stock', e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'price') {
      let value = e.target.value.replace(/[^\d]/g, '');
      const formatted = value ? Number(value).toLocaleString('en-US') : '';
      setFormData({ ...formData, [field]: formatted });
    } else {
      setFormData({ ...formData, [field]: e.target.value });
    }
  };

  // ESC to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  // ====== PARSE HELPERS (giữ nguyên logic cũ) ======
  const parseNumeric = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const cleaned = String(v).replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  const toStr = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const parseCSV = (file: File): Promise<ProductInput[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          if (!json || json.length === 0) {
            reject(new Error("File appears to be empty or has no data rows."));
            return;
          }
          const headers = Object.keys(json[0] || {});
          const validationResult: HeaderValidationResult = validateAndMapProductHeaders(headers);
          if (validationResult.error) {
            const error = new Error(validationResult.error);
            (error as any).validationResult = validationResult;
            reject(error);
            return;
          }
          const mapping = validationResult.mapping;
          const rows: ProductInput[] = json.map((r: any) => {
            const productId = toStr(r[mapping.product_id]);
            const name = toStr(r[mapping.name]);
            const category = toStr(r[mapping.category]) || null;
            const priceStr = toStr(r[mapping.price]);
            const stockStr = toStr(r[mapping.stock]);
            const price = parseNumeric(priceStr);
            const stock = parseNumeric(stockStr);
            return {
              product_id: productId,
              name,
              category,
              price: price ?? 0,
              stock: stock ?? 0,
              status: 'active',
            };
          });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseXLSX = (file: File): Promise<ProductInput[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          if (!json || json.length === 0) {
            reject(new Error("File appears to be empty or has no data rows."));
            return;
          }
          const headers = Object.keys(json[0] || {});
          const validationResult: HeaderValidationResult = validateAndMapProductHeaders(headers);
          if (validationResult.error) {
            const error = new Error(validationResult.error);
            (error as any).validationResult = validationResult;
            reject(error);
            return;
          }
          const mapping = validationResult.mapping;
          const rows: ProductInput[] = json.map((r: any) => {
            const productId = toStr(r[mapping.product_id]);
            const name = toStr(r[mapping.name]);
            const category = toStr(r[mapping.category]) || null;
            const priceStr = toStr(r[mapping.price]);
            const stockStr = toStr(r[mapping.stock]);
            const price = parseNumeric(priceStr);
            const stock = parseNumeric(stockStr);
            return {
              product_id: productId,
              name,
              category,
              price: price ?? 0,
              stock: stock ?? 0,
              status: 'active',
            };
          });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseProductFile = async (file: File): Promise<ProductInput[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return parseCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file);
    throw new Error('Unsupported file format. Please use CSV or XLSX.');
  };

  const getErrorMessage = (err: any): string => {
    if (err && typeof err === 'object') {
      if (err.message) return err.message;
      if (err instanceof Error) return err.message;
    }
    return 'Unknown error';
  };

  // ====== MANUAL SUBMIT ======
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.product_id.trim()) {
        showError('Please enter a Product ID');
        setLoading(false);
        return;
      }
      if (!formData.category) {
        showError('Please select a category');
        setLoading(false);
        return;
      }

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

      const productData: any = {
        product_id: formData.product_id.trim(),
        name: formData.name.trim(),
        category: formData.category.toLowerCase().trim(),
        price: numericPrice,
        stock: stock,
        status: formData.status,
      };

      const newProduct = await addItem(productData);
      await fetchAll();

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
      setFormData({ product_id: '', name: initialName || '', category: '', price: '', stock: '', status: 'active' });
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product.';
      showError(errorMessage);
      if (user) {
        await logUserAction({
          userId: user.id,
          action: 'Create Product',
          status: 'failed',
          orderId: formData.product_id.trim() || "",
        });
      }
      try { await fetchAll(); } catch { }
    } finally {
      setLoading(false);
    }
  };

  // ====== FILE UPLOAD ======
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress('Parsing file...');

    try {
      const parsedProducts = await parseProductFile(file);

      if (!parsedProducts.length) {
        showWarning('No valid products found in file.');
        setLoading(false);
        return;
      }

      setUploadProgress(`Inserting ${parsedProducts.length} products...`);

      const { data, error } = await supabase
        .from('products')
        .insert(
          parsedProducts.map(p => ({
            user_id: user?.id ?? null,
            product_id: p.product_id,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            status: p.status,
          }))
        )
        .select();

      if (error) {
        throw error;
      }

      await fetchAll();

      showSuccess(`Imported ${parsedProducts.length} products successfully.`);
      setUploadProgress('');
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error uploading product file:', err);
      showError(getErrorMessage(err));
      setUploadProgress('');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E223D]">
          <h3
            id="product-modal-title"
            className="text-xl font-semibold text-[#E5E7EB]"
          >
            Add Product
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

        {/* TABS */}
        <div className="flex gap-2 px-6 pt-4 border-b border-[#1E223D] flex-shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'manual'
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
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload'
              ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
              : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'
              }`}
            disabled={loading}
          >
            <Upload size={16} className="inline mr-2" />
            Upload File
          </button>
        </div>

        {/* BODY – scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Product ID"
                  value={formData.product_id}
                  onChange={(e) =>
                    setFormData({ ...formData, product_id: e.target.value })
                  }
                  required
                  disabled={loading}
                  placeholder="e.g., PROD-001"
                />
                <div>
                  <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-1">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="w-full h-[44px] px-3 rounded-lg bg-white/5 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    disabled={loading}
                    required
                  >
                    <option value="">Select category</option>
                    {Object.keys(PRODUCT_CATEGORIES).map((key) => (
                      <option key={key} value={key}>
                        {getCategoryDisplayName(key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={loading}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Price (VND)"
                  type="text"
                  value={formData.price}
                  onChange={(e) => handleFormattedNumberChange('price', e)}
                  placeholder="e.g., 20,000,000"
                  required
                  disabled={loading}
                />
                <Input
                  label="Stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleFormattedNumberChange('stock', e)}
                  placeholder="e.g., 100"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-1">
                  Status
                </label>
                <select
                  className="w-full h-[44px] px-3 rounded-lg bg-white/5 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1E223D] mt-4">
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Header Upload */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#E5E7EB]">
                    Upload CSV or XLSX file
                  </h3>
                  <p className="text-sm text-[#E5E7EB]/60">
                    Supported formats: .csv, .xlsx, .xls
                  </p>
                </div>
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-[#8B5CF6]/40 bg-white/5 rounded-2xl p-8 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/10 flex items-center justify-center border border-[#8B5CF6]/30">
                    {loading ? (
                      <Loader2 className="w-7 h-7 text-[#8B5CF6] animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7 text-[#8B5CF6]" />
                    )}
                  </div>
                  <p className="text-[#E5E7EB] font-medium">
                    {loading ? 'Processing file...' : 'Drag & drop file here or'}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <Button
                    type="button"
                    disabled={loading}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </Button>

                  {uploadProgress && (
                    <p className="text-sm text-[#E5E7EB]/70 mt-2">
                      {uploadProgress}
                    </p>
                  )}
                </div>
              </div>

              {/* Expected columns note (giống design cũ) */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-sm text-[#E5E7EB]/80 text-left">
                <p className="font-semibold mb-2">Expected CSV/XLSX columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Product ID (required)</li>
                  <li>Product Name (required)</li>
                  <li>Category (optional)</li>
                  <li>Price (VND) (required)</li>
                  <li>Stock (required)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
