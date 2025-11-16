import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Upload, FileText, Loader2, Circle } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { logUserAction } from '../../utils/logUserAction';
import { PRODUCT_CATEGORIES, getCategoryDisplayName, getAllCategorySlugs } from '../../constants/productCategories';
import type { Product } from '../../types/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { validateAndMapProductHeaders, normalize } from '../../utils/productColumnMapper';
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
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Helper to parse numeric values
  const parseNumeric = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const cleaned = String(v).replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  // Helper to convert value to string
  const toStr = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  // Parse CSV file
  const parseCSV = (file: File): Promise<ProductInput[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          try {
            const headers = res.meta.fields || [];
            
            // Validate headers
            const validationResult = validateAndMapProductHeaders(headers);
            if (validationResult.error) {
              const error = new Error(validationResult.error);
              (error as any).validationResult = validationResult;
              reject(error);
              return;
            }
            const mapping = validationResult.mapping;

            const rows: ProductInput[] = res.data.map((r: any, idx: number) => {
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
                status: 'active' as const,
              };
            });

            resolve(rows);
          } catch (err) {
            reject(err);
          }
        },
        error: reject,
      });
    });
  };

  // Parse XLSX file
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
          
          // Validate headers
          const validationResult = validateAndMapProductHeaders(headers);
          if (validationResult.error) {
            const error = new Error(validationResult.error);
            (error as any).validationResult = validationResult;
            reject(error);
            return;
          }
          const mapping = validationResult.mapping;

          const rows: ProductInput[] = json.map((r: any, idx: number) => {
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
              status: 'active' as const,
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

  // Parse product file
  const parseProductFile = async (file: File): Promise<ProductInput[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      return parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return parseXLSX(file);
    } else {
      throw new Error('Unsupported file format. Please use CSV or XLSX.');
    }
  };

  // Helper function to extract detailed error message
  const getErrorMessage = (err: any): string => {
    if (err && typeof err === 'object') {
      if (err.message) {
        let message = err.message;
        if (err.details) message += ` (${err.details})`;
        if (err.hint) message += ` Hint: ${err.hint}`;
        if (err.code) message += ` [Code: ${err.code}]`;
        return message;
      }
      if (err instanceof Error) {
        return err.message;
      }
    }
    return 'Unknown error';
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
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

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress('Parsing file...');

    try {
      // Parse file (will reject with header validation errors if any)
      const parsedProducts = await parseProductFile(file);
      
      if (parsedProducts.length === 0) {
        showError('No valid products found in the file.');
        setUploadProgress('');
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setUploadProgress(`Found ${parsedProducts.length} products. Validating data...`);

      // Validate numeric values
      const invalidRows: Array<{ rowIndex: number; productId: string; reason: string }> = [];
      parsedProducts.forEach((product, idx) => {
        if (!product.product_id.trim()) {
          invalidRows.push({ rowIndex: idx + 2, productId: product.product_id || 'N/A', reason: 'Product ID is required' });
        }
        if (!product.name.trim()) {
          invalidRows.push({ rowIndex: idx + 2, productId: product.product_id || 'N/A', reason: 'Product Name is required' });
        }
        if (product.price <= 0) {
          invalidRows.push({ rowIndex: idx + 2, productId: product.product_id || 'N/A', reason: 'Price must be greater than 0' });
        }
        if (product.stock < 0) {
          invalidRows.push({ rowIndex: idx + 2, productId: product.product_id || 'N/A', reason: 'Stock must be >= 0' });
        }
      });

      if (invalidRows.length > 0) {
        const errorSummary = invalidRows.map(r => 
          `Row ${r.rowIndex} (${r.productId}): ${r.reason}`
        ).join('\n');
        showError(`Invalid data found in file:\n${errorSummary}`);
        setUploadProgress('');
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Filter out invalid products
      const validProducts = parsedProducts.filter(p => 
        p.product_id.trim() && 
        p.name.trim() && 
        p.price > 0 && 
        p.stock >= 0
      );

      if (validProducts.length === 0) {
        showError('No valid products to import after validation.');
        setUploadProgress('');
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setUploadProgress('Checking for duplicates...');

      // A. Check for duplicates within the file
      const fileDuplicateMap = new Map<string, number[]>();
      validProducts.forEach((product, idx) => {
        const key = `${product.product_id}::${product.name}`;
        if (!fileDuplicateMap.has(key)) {
          fileDuplicateMap.set(key, []);
        }
        fileDuplicateMap.get(key)!.push(idx + 2); // +2 for header row and 1-based indexing
      });

      const fileDuplicates: Array<{ productId: string; name: string; rows: number[] }> = [];
      fileDuplicateMap.forEach((rows, key) => {
        if (rows.length > 1) {
          const [productId, name] = key.split('::');
          fileDuplicates.push({ productId, name, rows });
        }
      });

      // B. Check for duplicates against existing products in DB
      const productIdsToCheck = validProducts.map(p => p.product_id).filter(Boolean);
      let existingProducts: Array<{ product_id: string; name: string }> = [];
      if (productIdsToCheck.length > 0 && user?.id) {
        const { data: existing, error: fetchError } = await supabase
          .from('products')
          .select('product_id, name')
          .eq('user_id', user.id)
          .in('product_id', productIdsToCheck);
        
        if (!fetchError && existing) {
          existingProducts = existing;
        }
      }

      // Check if any existing products match both product_id and name
      const existingDuplicates: Array<{ productId: string; name: string }> = [];
      const existingProductMap = new Map<string, string>();
      existingProducts.forEach(p => {
        existingProductMap.set(p.product_id, p.name);
      });

      validProducts.forEach(product => {
        const existingName = existingProductMap.get(product.product_id);
        if (existingName && normalize(existingName) === normalize(product.name)) {
          existingDuplicates.push({ productId: product.product_id, name: product.name });
        }
      });

      // If any duplicates found, show warning and stop
      if (fileDuplicates.length > 0 || existingDuplicates.length > 0) {
        const duplicateMessage = (
          <div className="space-y-3">
            {/* Top section - warning yellow */}
            <div>
              <p className="font-semibold text-yellow-300">We couldn't import this file.</p>
              <p className="text-yellow-300/90 mt-1">Please fix the following issues:</p>
            </div>
            
            {/* Duplicate products in file - critical (red inside yellow toast) */}
            {fileDuplicates.length > 0 && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="font-bold text-red-400 mb-2">Duplicate products in your file:</p>
                <ul className="space-y-1.5">
                  {fileDuplicates.map((dup, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                      <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                      <span>{dup.productId} – "{dup.name}" (rows {dup.rows.join(', ')})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Products that already exist in DB - critical (red inside yellow toast) */}
            {existingDuplicates.length > 0 && (
              <div className={fileDuplicates.length > 0 ? "mt-3" : "mt-4"}>
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <p className="font-bold text-red-400 mb-2">Products that already exist in your catalog:</p>
                  <ul className="space-y-1.5">
                    {existingDuplicates.map((dup, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                        <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                        <span>{dup.productId} – "{dup.name}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Footer message */}
            <p className="text-white/80 text-sm mt-3">
              Product ID and Name combination must be unique. Please update the values in your spreadsheet and upload again.
            </p>
          </div>
        );
        
        showWarning(duplicateMessage, 0);
        setUploadProgress('');
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Insert all products
      setUploadProgress(`Inserting ${validProducts.length} product(s)...`);
      
      const { data: createdProducts, error: insertError } = await supabase
        .from('products')
        .insert(
          validProducts.map(p => ({
            user_id: user?.id,
            product_id: p.product_id,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            status: 'active',
          }))
        )
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

      showSuccess(`Successfully added ${createdProducts.length} product(s)!`);
      
      // Refresh products list
      await fetchAll();
      
      if (onSuccess) {
        await onSuccess();
      }
      
      onClose();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      
      // Check if this is a header validation error
      const isHeaderValidationError = errorMessage.includes("We couldn't import this file") || 
          errorMessage.includes("Missing required columns") || 
          errorMessage.includes("Some column names are invalid") ||
          errorMessage.includes("Columns with invalid names");
      
      if (isHeaderValidationError) {
        const validationResult = (err as any)?.validationResult as HeaderValidationResult | undefined;
        
        // Render structured JSX message
        const structuredMessage = (
          <div className="space-y-3">
            {/* Top section - warning yellow */}
            <div>
              <p className="font-semibold text-yellow-300">We couldn't import this file.</p>
              <p className="text-yellow-300/90 mt-1">Please fix the following issues:</p>
            </div>
            
            {/* Missing required columns - critical (red) */}
            {validationResult?.missingRequired && validationResult.missingRequired.length > 0 && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="font-bold text-red-400 mb-2">Missing required columns:</p>
                <ul className="space-y-1.5">
                  {validationResult.missingRequired.map((col, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                      <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                      <span>{col}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Columns with invalid names - non-critical (amber/yellow) */}
            {validationResult?.misnamed && validationResult.misnamed.length > 0 && (
              <div className="mt-3">
                <p className="font-bold text-amber-300 mb-2">Columns with invalid names:</p>
                <ul className="space-y-1.5">
                  {validationResult.misnamed.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-white/90">
                      <Circle className="w-3 h-3 fill-amber-300 text-amber-300 mt-1 flex-shrink-0" />
                      <span>"{item.actual}" → should be {item.expected}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
        
        showWarning(structuredMessage, 0);
      } else {
        showError(`Failed to process file: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      setUploadProgress('');
      // Reset file input so user can upload again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] max-w-2xl w-full shadow-2xl transition-all duration-200 ease-out"
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
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-6 border-b border-[#1E223D]">
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

        {/* Content - Scrollable */}
        <div 
          className="overflow-y-auto"
          style={{ 
            maxHeight: 'calc(90vh - 200px)',
            paddingRight: '6px'
          }}
        >
          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="p-6 space-y-5">
              <Input
                label="Product ID"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                placeholder="e.g., PROD-2024-001"
                required
                disabled={loading}
                className="w-full"
              />
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
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
                    className="w-full pr-10 px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={loading}
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
                disabled={loading}
                placeholder="e.g., 20,000,000"
                className="w-full"
              />
              <Input
                label="Stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
                disabled={loading}
                className="w-full"
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full pr-10 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
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
                  {loading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="p-6 space-y-5">
              <div className="relative">
                <div className="border-2 border-dashed border-[#8B5CF6]/30 rounded-xl p-8 text-center bg-gradient-to-br from-[#8B5CF6]/5 to-transparent hover:border-[#8B5CF6]/50 transition-all duration-300">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/10 flex items-center justify-center mb-4 border border-[#8B5CF6]/30">
                      <Upload size={28} className="text-[#8B5CF6]" />
                    </div>
                    <p className="text-[#E5E7EB] font-medium mb-1 text-lg">Upload CSV or XLSX file</p>
                    <p className="text-sm text-[#E5E7EB]/60 mb-6">
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#8B5CF6]/20 hover:shadow-[#8B5CF6]/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#8B5CF6] disabled:hover:to-[#7C3AED]"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          <span>Choose File</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {uploadProgress && (
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-sm text-blue-300">{uploadProgress}</p>
                </div>
              )}

              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm font-medium text-[#E5E7EB] mb-2">Expected CSV/XLSX columns:</p>
                <ul className="text-xs text-[#E5E7EB]/70 space-y-1 list-disc list-inside">
                  <li>Product ID (required)</li>
                  <li>Product Name (required)</li>
                  <li>Category (optional)</li>
                  <li>Price (VND) (required)</li>
                  <li>Stock (required)</li>
                </ul>
                <p className="text-xs text-blue-300 mt-2">
                  <strong>Note:</strong> Status will be set to "Active" automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

