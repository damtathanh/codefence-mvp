import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Upload, FileText, Loader2, AlertTriangle, Circle, AlertCircle, Plus } from 'lucide-react';
import { useOrders, type OrderInput, type InvalidOrderRow } from '../../hooks/useOrders';
import { useToast } from '../ui/Toast';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../utils/logUserAction';
import { generateChanges } from '../../utils/generateChanges';
import type { Product, Order } from '../../types/supabase';
import type { HeaderValidationResult } from '../../utils/smartColumnMapper';
import { normalize } from '../../utils/smartColumnMapper';

interface ParsedUploadPayload {
  validOrders: OrderInput[];
  orders: Array<{ product: string; [key: string]: any }>;
}

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingOrder?: Order | null;
  openAddProductModal?: (options?: { initialName?: string; onSuccess?: () => void | Promise<void> }) => void;
  refetchProducts?: () => Promise<void>;
  openBulkCreateProductsModal?: (options: { missingProducts: string[]; pendingUpload: ParsedUploadPayload | null }) => void;
  pendingUploadAfterProductsCreated?: ParsedUploadPayload | null;
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingOrder = null,
  openAddProductModal,
  refetchProducts,
  openBulkCreateProductsModal,
  pendingUploadAfterProductsCreated,
}) => {
  const isEditMode = !!editingOrder;
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseFile, insertOrders, validateAndMapProducts } = useOrders();
  const { showSuccess, showError, showWarning } = useToast();
  const { user } = useAuth();

  // Helper to parse numeric values (same as in useOrders)
  const parseNumeric = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const cleaned = v.toString().replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };
  
  // Fetch products for dropdown (only active products)
  const { data: allProducts = [] } = useSupabaseTable<Product>({ 
    tableName: 'products'
  });
  const products = allProducts.filter(p => p.status === 'active');

  // Manual entry form state
  const [formData, setFormData] = useState<Partial<OrderInput & { amountDisplay: string }>>({
    order_id: '',
    customer_name: '',
    phone: '',
    address: '',
    product_id: '',
    amount: 0,
    amountDisplay: '',
  });

  // File upload state
  const [uploadedOrders, setUploadedOrders] = useState<Array<{ product: string; [key: string]: any }>>([]);
  const [invalidOrders, setInvalidOrders] = useState<InvalidOrderRow[]>([]);
  const [correctedOrders, setCorrectedOrders] = useState<Map<number, string>>(new Map()); // rowIndex -> product_id
  const [showPreview, setShowPreview] = useState(false);
  
  // Missing products state
  interface ParsedUploadPayload {
    validOrders: OrderInput[];
    orders: Array<{ product: string; [key: string]: any }>;
  }
  const [pendingUpload, setPendingUpload] = useState<ParsedUploadPayload | null>(null);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);

  // Helper function to handle formatted number input for amount
  const handleFormattedNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // remove non-digits
    const formatted = value ? Number(value).toLocaleString('en-US') : '';
    setFormData({ ...formData, amountDisplay: formatted });
  };

  // Initialize form data when editing
  useEffect(() => {
    if (isOpen && editingOrder) {
      // Populate form with existing order data
      const formattedAmount = editingOrder.amount ? Number(editingOrder.amount).toLocaleString('en-US') : '';
      setFormData({
        order_id: editingOrder.order_id || '',
        customer_name: editingOrder.customer_name || '',
        phone: editingOrder.phone || '',
        address: editingOrder.address || '',
        product_id: editingOrder.product_id || '',
        amount: editingOrder.amount || 0,
        amountDisplay: formattedAmount,
      });
      setActiveTab('manual'); // Always show manual entry tab when editing
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        order_id: '',
        customer_name: '',
        phone: '',
        address: '',
        product_id: '',
        amount: 0,
        amountDisplay: '',
      });
      setUploadProgress('');
      setUploadedOrders([]);
      setInvalidOrders([]);
      setCorrectedOrders(new Map());
      setShowPreview(false);
      setPendingUpload(null);
      setMissingProducts([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, editingOrder]);

  // Local validator function
  const validateManualOrder = (o: OrderInput) => {
    if (!o.order_id?.trim()) return "Order ID is required";
    if (!o.customer_name?.trim()) return "Customer Name is required";
    if (!o.phone?.trim()) return "Phone is required";
    if (!o.product_id) return "Product is required";
    if (!o.amount || o.amount <= 0) return "Amount is invalid";
    return null;
  };

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

      // Convert formatted amount string back to number (remove commas)
      const numericAmount = formData.amountDisplay ? Number(formData.amountDisplay.replace(/,/g, '')) : 0;
      
      if (numericAmount <= 0) {
        showError('Amount must be greater than 0');
        setLoading(false);
        return;
      }

      if (isEditMode && editingOrder && user) {
        // Capture previous data for change tracking
        const previousProduct = products.find(p => p.id === editingOrder.product_id);
        const newProduct = products.find(p => p.id === formData.product_id);
        
        const previousData = {
          order_id: editingOrder.order_id || '',
          customer_name: editingOrder.customer_name || '',
          phone: editingOrder.phone || '',
          address: editingOrder.address || '',
          product: previousProduct?.name || editingOrder.product || 'N/A',
          amount: editingOrder.amount || 0,
        };
        
        const updateData = {
          order_id: formData.order_id?.trim() || '',
          customer_name: formData.customer_name?.trim() || '',
          phone: formData.phone?.trim() || '',
          address: formData.address?.trim() || '',
          product: newProduct?.name || 'N/A',
          amount: numericAmount,
        };
        
        // Generate changes before updating
        const changes = generateChanges(previousData, updateData);
        
        // Get product name for the selected product_id
        const selectedProduct = products.find(p => p.id === formData.product_id);
        const productName = selectedProduct?.name || '';

        // Update existing order
        const { data: updatedOrder, error } = await supabase
          .from('orders')
          .update({
            order_id: formData.order_id?.trim() || '',
            customer_name: formData.customer_name?.trim() || '',
            phone: formData.phone?.trim() || '',
            address: formData.address?.trim() || null,
            product_id: formData.product_id || '',
            product: productName, // Store product name
            amount: numericAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingOrder.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Log user action
        if (user && updatedOrder) {
          await logUserAction({
            userId: user.id,
            action: 'Update Order',
            status: 'success',
            orderId: updatedOrder.order_id ?? "",
            details: Object.keys(changes).length > 0 ? changes : null,
          });
        }

        showSuccess('Order updated successfully!');
      } else {
        // Insert new order
        const selectedProduct = products.find(p => p.id === formData.product_id);
        const productName = selectedProduct?.name || '';
        const orderData: OrderInput = {
          order_id: formData.order_id || '',
          customer_name: formData.customer_name || '',
          phone: formData.phone || '',
          address: formData.address || null,
          product_id: formData.product_id || null,
          product: productName, // Store product name
          amount: numericAmount,
        };

        // Validate order
        const validationError = validateManualOrder(orderData);
        if (validationError) {
          showError(validationError);
          setLoading(false);
          return;
        }

        // Insert order directly via Supabase
        const { data: newOrder, error: insertError } = await supabase
          .from("orders")
          .insert({
            user_id: user?.id,
            order_id: orderData.order_id,
            customer_name: orderData.customer_name,
            phone: orderData.phone,
            address: orderData.address,
            product_id: orderData.product_id,
            product: productName, // Store product name
            amount: orderData.amount,
            status: "Pending",
            risk_score: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        // Log user action
        if (user && newOrder) {
          await logUserAction({
            userId: user.id,
            action: 'Create Order',
            status: 'success',
            orderId: newOrder.order_id ?? "",
          });
        }
        
        showSuccess('Order added successfully!');
      }
      
      // Refresh orders table
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (isEditMode ? 'Failed to update order' : 'Failed to add order');
      showError(errorMessage);
      
      // Log failed action
      if (user) {
        await logUserAction({
          userId: user.id,
          action: isEditMode ? 'Update Order' : 'Create Order',
          status: 'failed',
          orderId: isEditMode ? (editingOrder?.order_id ?? "") : "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  // Helper function to extract detailed error message from Supabase/API errors
  const getErrorMessage = (err: any): string => {
    // Check for Supabase error structure
    if (err && typeof err === 'object') {
      // Supabase errors often have message, details, hint, code
      if (err.message) {
        let message = err.message;
        // Add details if available
        if (err.details) {
          message += ` (${err.details})`;
        }
        // Add hint if available
        if (err.hint) {
          message += ` Hint: ${err.hint}`;
        }
        // Add code if available
        if (err.code) {
          message += ` [Code: ${err.code}]`;
        }
        return message;
      }
      // Check for standard Error instance
      if (err instanceof Error) {
        return err.message;
      }
    }
    // Fallback for unknown error types
    return 'Unknown error';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress('Parsing file...');

    try {
      // Parse file (this will reject with header validation errors if any)
      const orders = await parseFile(file);
      
      if (orders.length === 0) {
        showError('No valid orders found in the file.');
        return; // finally block will still execute
      }

      setUploadProgress(`Found ${orders.length} orders. Validating products...`);

      // Validate and map products
      const { validOrders, invalidOrders: invalid, warnings } = await validateAndMapProducts(orders);
      
      setUploadedOrders(orders);
      setInvalidOrders(invalid);
      setCorrectedOrders(new Map());
      
      if (invalid.length > 0) {
        // Store pending upload for later (when invalid orders are corrected)
        setPendingUpload({ validOrders, orders });
        setMissingProducts([]);
        // Show preview with invalid orders
        setShowPreview(true);
        setUploadProgress(`Found ${invalid.length} order(s) with missing required fields. Please correct them below.`);
      } else {
        // Check for missing products before inserting
        setUploadProgress('Checking for missing products...');
        
        // Collect all distinct product names from valid orders
        const productNamesFromFile = new Set<string>();
        validOrders.forEach(order => {
          const productName = (order.product || '').trim();
          if (productName) {
            productNamesFromFile.add(productName);
          }
        });
        
        // Query existing products
        let existingProducts: Array<{ id: string; name: string }> = [];
        if (productNamesFromFile.size > 0 && user?.id) {
          const { data: productsData, error: fetchError } = await supabase
            .from('products')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .in('name', Array.from(productNamesFromFile));
          
          if (!fetchError && productsData) {
            existingProducts = productsData;
          }
        }
        
        // Build normalized map of existing products
        const existingProductsByName = new Map<string, { id: string; name: string }>();
        existingProducts.forEach(prod => {
          existingProductsByName.set(normalize(prod.name), prod);
        });
        
        // Find missing products
        const missingProductNames: string[] = [];
        productNamesFromFile.forEach(productName => {
          const normalized = normalize(productName);
          if (!existingProductsByName.has(normalized)) {
            missingProductNames.push(productName);
          }
        });
        
        // If there are missing products, close this modal and open bulk create products modal
        if (missingProductNames.length > 0) {
          const payload: ParsedUploadPayload = { validOrders, orders };
          
          // Reset upload-related state before closing
          setUploadProgress('');
          setUploadedOrders([]);
          setInvalidOrders([]);
          setCorrectedOrders(new Map());
          setShowPreview(false);
          setPendingUpload(null);
          setMissingProducts([]);
          setLoading(false);
          
          // Close AddOrderModal and open BulkCreateProductsModal
          if (openBulkCreateProductsModal) {
            // Close AddOrderModal first
            onClose();
            
            // Small delay to ensure modal closes before opening new one
            setTimeout(() => {
              openBulkCreateProductsModal({
                missingProducts: missingProductNames,
                pendingUpload: payload,
              });
            }, 100);
            
            return; // Stop here, don't insert anything
          } else {
            // Fallback: keep legacy behavior if prop is not provided
            setPendingUpload(payload);
            setMissingProducts(missingProductNames);
            setLoading(false);
            return;
          }
        }
        
        // No missing products, continue with duplicate check and insert
        // Check for duplicate Order IDs before inserting
        setUploadProgress('Checking for duplicate Order IDs...');
        
        // A. Check for duplicates within the file
        const fileOrderIds = validOrders.map((o, idx) => ({ orderId: o.order_id, rowIndex: idx + 1 }));
        const fileDuplicateMap = new Map<string, number[]>();
        fileOrderIds.forEach(({ orderId, rowIndex }) => {
          if (orderId) {
            if (!fileDuplicateMap.has(orderId)) {
              fileDuplicateMap.set(orderId, []);
            }
            fileDuplicateMap.get(orderId)!.push(rowIndex);
          }
        });
        const fileDuplicates: Array<{ orderId: string; rows: number[] }> = [];
        fileDuplicateMap.forEach((rows, orderId) => {
          if (rows.length > 1) {
            fileDuplicates.push({ orderId, rows });
          }
        });
        
        // B. Check for duplicates in existing orders
        const orderIdsToCheck = validOrders.map(o => o.order_id).filter(Boolean);
        let existingOrderIds: string[] = [];
        if (orderIdsToCheck.length > 0 && user?.id) {
          const { data: existingOrders, error: fetchError } = await supabase
            .from('orders')
            .select('order_id')
            .eq('user_id', user.id)
            .in('order_id', orderIdsToCheck);
          
          if (!fetchError && existingOrders) {
            existingOrderIds = existingOrders.map(o => o.order_id).filter(Boolean) as string[];
          }
        }
        
        // If any duplicates found, show warning and stop
        if (fileDuplicates.length > 0 || existingOrderIds.length > 0) {
          const duplicateMessage = (
            <div className="space-y-3">
              {/* Top section - warning yellow */}
              <div>
                <p className="font-semibold text-yellow-300">We couldn't import this file.</p>
                <p className="text-yellow-300/90 mt-1">Please fix the following issues:</p>
              </div>
              
              {/* Duplicate Order IDs in file - critical (red inside yellow toast) */}
              {fileDuplicates.length > 0 && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <p className="font-bold text-red-400 mb-2">Duplicate Order IDs in your file:</p>
                  <ul className="space-y-1.5">
                    {fileDuplicates.map((dup, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                        <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                        <span>{dup.orderId} (found in rows {dup.rows.join(', ')})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Order IDs that already exist in DB - critical (red inside yellow toast) */}
              {existingOrderIds.length > 0 && (
                <div className={fileDuplicates.length > 0 ? "mt-3" : "mt-4"}>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                    <p className="font-bold text-red-400 mb-2">Order IDs that already exist in your account:</p>
                    <ul className="space-y-1.5">
                      {existingOrderIds.map((orderId, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                          <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                          <span>{orderId}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Footer message - normal text */}
              <p className="text-white/80 text-sm mt-3">
                Order ID must be unique. Please update the values in your spreadsheet and upload again.
              </p>
            </div>
          );
          
          showWarning(duplicateMessage, 0); // Persistent warning toast (yellow wrapper)
          return; // Stop here, don't insert anything
        }
        
        // All orders are valid and no duplicates, insert them
        setUploadProgress(`Inserting ${validOrders.length} orders...`);
        
        // Insert orders and log each one
        let successCount = 0;
        const errors: Array<{ orderId: string; customerName: string; error: string }> = [];
        
        for (const orderData of validOrders) {
          try {
            // Insert order directly via Supabase
            const { data: newOrder, error: insertError } = await supabase
              .from("orders")
              .insert({
                user_id: user?.id,
                order_id: orderData.order_id,
                customer_name: orderData.customer_name,
                phone: orderData.phone,
                address: orderData.address,
                product_id: orderData.product_id, // Can be null
                product: orderData.product, // Raw product name from file
                amount: orderData.amount,
                status: "Pending",
                risk_score: null,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            successCount++;
            
            // Log user action for each successfully created order
            if (user && newOrder) {
              await logUserAction({
                userId: user.id,
                action: 'Create Order',
                status: 'success',
                orderId: newOrder.order_id ?? "",
              });
            }
          } catch (err) {
            const errorMessage = getErrorMessage(err);
            const orderId = orderData.order_id || 'N/A';
            const customerName = orderData.customer_name || 'Unknown';
            errors.push({ orderId, customerName, error: errorMessage });
            
            // Log failed action
            if (user) {
              await logUserAction({
                userId: user.id,
                action: 'Create Order',
                status: 'failed',
                orderId: orderData.order_id ?? "",
              });
            }
          }
        }

        if (successCount > 0) {
          if (errors.length > 0) {
            // Show detailed error summary
            const errorSummary = errors.map(e => 
              `${e.customerName} (${e.orderId}): ${e.error}`
            ).join('\n');
            showError(`Successfully added ${successCount} order(s), but ${errors.length} failed:\n${errorSummary}`);
          } else {
            showSuccess(`Successfully added ${successCount} order(s)!`);
          }
          
          // Refresh orders table
          if (onSuccess) {
            onSuccess();
          }
          
          onClose();
        } else {
          // All failed - show detailed error list
          const errorSummary = errors.map(e => 
            `${e.customerName} (${e.orderId}): ${e.error}`
          ).join('\n');
          showError(`Failed to add all ${errors.length} order(s):\n${errorSummary}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : getErrorMessage(err);
      
      // Check if this is a header validation error (user input issue, not system error)
      const isHeaderValidationError = errorMessage.includes("We couldn't import this file") || 
          errorMessage.includes("Missing required columns") || 
          errorMessage.includes("Some column names are invalid") ||
          errorMessage.includes("Columns with invalid names");
      
      if (isHeaderValidationError) {
        // Extract validation result if available
        const validationResult = (err as any)?.validationResult as HeaderValidationResult | undefined;
        
        // Render structured JSX message with severity-based styling
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
        
        // Show as persistent warning (duration: 0 means no auto-dismiss)
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

  // Process parsed orders (reusable function for auto-resume after product creation)
  const processParsedOrders = async (payload: ParsedUploadPayload) => {
    const { validOrders, orders } = payload;
    
    setLoading(true);
    setUploadProgress('Resuming import...');
    
    try {
      // Re-validate products (in case new products were added)
      const { validOrders: revalidatedOrders, invalidOrders: invalid } = await validateAndMapProducts(orders);
      
      setUploadedOrders(orders);
      setInvalidOrders(invalid);
      setCorrectedOrders(new Map());
      
      if (invalid.length > 0) {
        // Still have invalid orders, show preview
        setShowPreview(true);
        setUploadProgress(`Found ${invalid.length} order(s) with missing required fields. Please correct them below.`);
        setPendingUpload({ validOrders: revalidatedOrders, orders });
        setMissingProducts([]);
        return;
      }
      
      // Check for missing products again
      const productNamesFromFile = new Set<string>();
      revalidatedOrders.forEach(order => {
        const productName = (order.product || '').trim();
        if (productName) {
          productNamesFromFile.add(productName);
        }
      });
      
      let existingProducts: Array<{ id: string; name: string }> = [];
      if (productNamesFromFile.size > 0 && user?.id) {
        const { data: productsData, error: fetchError } = await supabase
          .from('products')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .in('name', Array.from(productNamesFromFile));
        
        if (!fetchError && productsData) {
          existingProducts = productsData;
        }
      }
      
      const existingProductsByName = new Map<string, { id: string; name: string }>();
      existingProducts.forEach(prod => {
        existingProductsByName.set(normalize(prod.name), prod);
      });
      
      const missingProductNames: string[] = [];
      productNamesFromFile.forEach(productName => {
        const normalized = normalize(productName);
        if (!existingProductsByName.has(normalized)) {
          missingProductNames.push(productName);
        }
      });
      
      // If still missing products, close this modal and open bulk create products modal
      if (missingProductNames.length > 0) {
        const payload: ParsedUploadPayload = { validOrders: revalidatedOrders, orders };
        
        // Reset upload-related state before closing
        setUploadProgress('');
        setUploadedOrders([]);
        setInvalidOrders([]);
        setCorrectedOrders(new Map());
        setShowPreview(false);
        setPendingUpload(null);
        setMissingProducts([]);
        setLoading(false);
        
        // Close AddOrderModal and open BulkCreateProductsModal
        if (openBulkCreateProductsModal) {
          // Close AddOrderModal first
          onClose();
          
          // Small delay to ensure modal closes before opening new one
          setTimeout(() => {
            openBulkCreateProductsModal({
              missingProducts: missingProductNames,
              pendingUpload: payload,
            });
          }, 100);
          
          return;
        } else {
          // Fallback: keep legacy behavior if prop is not provided
          setPendingUpload(payload);
          setMissingProducts(missingProductNames);
          setLoading(false);
          return;
        }
      }
      
      // No missing products, continue with duplicate check and insert
      setUploadProgress('Checking for duplicate Order IDs...');
      
      // Check for duplicate Order IDs
      const fileOrderIds = revalidatedOrders.map((o, idx) => ({ orderId: o.order_id, rowIndex: idx + 1 }));
      const fileDuplicateMap = new Map<string, number[]>();
      fileOrderIds.forEach(({ orderId, rowIndex }) => {
        if (orderId) {
          if (!fileDuplicateMap.has(orderId)) {
            fileDuplicateMap.set(orderId, []);
          }
          fileDuplicateMap.get(orderId)!.push(rowIndex);
        }
      });
      const fileDuplicates: Array<{ orderId: string; rows: number[] }> = [];
      fileDuplicateMap.forEach((rows, orderId) => {
        if (rows.length > 1) {
          fileDuplicates.push({ orderId, rows });
        }
      });
      
      const orderIdsToCheck = revalidatedOrders.map(o => o.order_id).filter(Boolean);
      let existingOrderIds: string[] = [];
      if (orderIdsToCheck.length > 0 && user?.id) {
        const { data: existingOrders, error: fetchError } = await supabase
          .from('orders')
          .select('order_id')
          .eq('user_id', user.id)
          .in('order_id', orderIdsToCheck);
        
        if (!fetchError && existingOrders) {
          existingOrderIds = existingOrders.map(o => o.order_id).filter(Boolean) as string[];
        }
      }
      
      if (fileDuplicates.length > 0 || existingOrderIds.length > 0) {
        // Show duplicate error (same as before)
        const duplicateMessage = (
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-yellow-300">We couldn't import this file.</p>
              <p className="text-yellow-300/90 mt-1">Please fix the following issues:</p>
            </div>
            
            {fileDuplicates.length > 0 && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="font-bold text-red-400 mb-2">Duplicate Order IDs in your file:</p>
                <ul className="space-y-1.5">
                  {fileDuplicates.map((dup, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                      <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                      <span>{dup.orderId} (found in rows {dup.rows.join(', ')})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {existingOrderIds.length > 0 && (
              <div className={fileDuplicates.length > 0 ? "mt-3" : "mt-4"}>
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <p className="font-bold text-red-400 mb-2">Order IDs that already exist in your account:</p>
                  <ul className="space-y-1.5">
                    {existingOrderIds.map((orderId, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                        <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                        <span>{orderId}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <p className="text-white/80 text-sm mt-3">
              Order ID must be unique. Please update the values in your spreadsheet and upload again.
            </p>
          </div>
        );
        
        showWarning(duplicateMessage, 0);
        setPendingUpload(null);
        setMissingProducts([]);
        setUploadProgress('');
        return;
      }
      
      // All checks passed, insert orders
      setUploadProgress(`Inserting ${revalidatedOrders.length} orders...`);
      
      let successCount = 0;
      const errors: Array<{ orderId: string; customerName: string; error: string }> = [];
      
      for (const orderData of revalidatedOrders) {
        try {
          const { data: newOrder, error: insertError } = await supabase
            .from("orders")
            .insert({
              user_id: user?.id,
              order_id: orderData.order_id,
              customer_name: orderData.customer_name,
              phone: orderData.phone,
              address: orderData.address,
              product_id: orderData.product_id,
              product: orderData.product,
              amount: orderData.amount,
              status: "Pending",
              risk_score: null,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          successCount++;
          
          if (user && newOrder) {
            await logUserAction({
              userId: user.id,
              action: 'Create Order',
              status: 'success',
              orderId: newOrder.order_id ?? "",
            });
          }
        } catch (err) {
          const errorMessage = getErrorMessage(err);
          const orderId = orderData.order_id || 'N/A';
          const customerName = orderData.customer_name || 'Unknown';
          errors.push({ orderId, customerName, error: errorMessage });
          
          if (user) {
            await logUserAction({
              userId: user.id,
              action: 'Create Order',
              status: 'failed',
              orderId: orderData.order_id ?? "",
            });
          }
        }
      }

      if (successCount > 0) {
        if (errors.length > 0) {
          const errorSummary = errors.map(e => 
            `${e.customerName} (${e.orderId}): ${e.error}`
          ).join('\n');
          showError(`Successfully added ${successCount} order(s), but ${errors.length} failed:\n${errorSummary}`);
        } else {
          showSuccess(`Successfully added ${successCount} order(s)!`);
        }
        
        if (onSuccess) {
          onSuccess();
        }
        
        // Reset state
        setPendingUpload(null);
        setMissingProducts([]);
        onClose();
      } else {
        const errorSummary = errors.map(e => 
          `${e.customerName} (${e.orderId}): ${e.error}`
        ).join('\n');
        showError(`Failed to add all ${errors.length} order(s):\n${errorSummary}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : getErrorMessage(err);
      showError(`Failed to process file: ${errorMessage}`);
    } finally {
      setLoading(false);
      setUploadProgress('');
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
          allOrders.push({
            order_id: order.order_id || "",
            customer_name: order.customer_name || "",
            phone: order.phone || "",
            address: order.address || null,
            product_id: productId,
            product: order.product || "", // Keep raw product name
            amount: parseNumeric(order.amount) ?? 0,
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

      // Check for duplicate Order IDs before inserting
      setUploadProgress('Checking for duplicate Order IDs...');
      
      // A. Check for duplicates within the file
      const fileOrderIds = finalOrders.map((o, idx) => ({ orderId: o.order_id, rowIndex: idx + 1 }));
      const fileDuplicateMap = new Map<string, number[]>();
      fileOrderIds.forEach(({ orderId, rowIndex }) => {
        if (orderId) {
          if (!fileDuplicateMap.has(orderId)) {
            fileDuplicateMap.set(orderId, []);
          }
          fileDuplicateMap.get(orderId)!.push(rowIndex);
        }
      });
      const fileDuplicates: Array<{ orderId: string; rows: number[] }> = [];
      fileDuplicateMap.forEach((rows, orderId) => {
        if (rows.length > 1) {
          fileDuplicates.push({ orderId, rows });
        }
      });
      
      // B. Check for duplicates in existing orders
      const orderIdsToCheck = finalOrders.map(o => o.order_id).filter(Boolean);
      let existingOrderIds: string[] = [];
      if (orderIdsToCheck.length > 0 && user?.id) {
        const { data: existingOrders, error: fetchError } = await supabase
          .from('orders')
          .select('order_id')
          .eq('user_id', user.id)
          .in('order_id', orderIdsToCheck);
        
        if (!fetchError && existingOrders) {
          existingOrderIds = existingOrders.map(o => o.order_id).filter(Boolean) as string[];
        }
      }
      
      // If any duplicates found, show warning and stop
      if (fileDuplicates.length > 0 || existingOrderIds.length > 0) {
        const duplicateMessage = (
          <div className="space-y-3">
            {/* Top section - warning yellow */}
            <div>
              <p className="font-semibold text-yellow-300">We couldn't import this file.</p>
              <p className="text-yellow-300/90 mt-1">Please fix the following issues:</p>
            </div>
            
            {/* Duplicate Order IDs in file - critical (red inside yellow toast) */}
            {fileDuplicates.length > 0 && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="font-bold text-red-400 mb-2">Duplicate Order IDs in your file:</p>
                <ul className="space-y-1.5">
                  {fileDuplicates.map((dup, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                      <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                      <span>{dup.orderId} (found in rows {dup.rows.join(', ')})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Order IDs that already exist in DB - critical (red inside yellow toast) */}
            {existingOrderIds.length > 0 && (
              <div className={fileDuplicates.length > 0 ? "mt-3" : "mt-4"}>
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <p className="font-bold text-red-400 mb-2">Order IDs that already exist in your account:</p>
                  <ul className="space-y-1.5">
                    {existingOrderIds.map((orderId, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                        <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                        <span>{orderId}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Footer message - normal text */}
            <p className="text-white/80 text-sm mt-3">
              Order ID must be unique. Please update the values in your spreadsheet and upload again.
            </p>
          </div>
        );
        
        showWarning(duplicateMessage, 0); // Persistent warning toast (yellow wrapper)
        return; // Stop here, don't insert anything
      }

      // All orders are valid and no duplicates, insert them
      setUploadProgress(`Inserting ${finalOrders.length} orders...`);

      // Insert all orders and log each one
      let successCount = 0;
      const errors: Array<{ orderId: string; customerName: string; error: string }> = [];
      
      for (const orderData of finalOrders) {
        try {
          // Insert order directly via Supabase
          const { data: newOrder, error: insertError } = await supabase
            .from("orders")
            .insert({
              user_id: user?.id,
              order_id: orderData.order_id,
              customer_name: orderData.customer_name,
              phone: orderData.phone,
              address: orderData.address,
              product_id: orderData.product_id, // Can be null
              product: orderData.product, // Raw product name from file
              amount: orderData.amount,
              status: "Pending",
              risk_score: null,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          successCount++;
          
          // Log user action for each successfully created order
          if (user && newOrder) {
            await logUserAction({
              userId: user.id,
              action: 'Create Order',
              status: 'success',
              orderId: newOrder.order_id ?? "",
            });
          }
        } catch (err) {
          const errorMessage = getErrorMessage(err);
          const orderId = orderData.order_id || 'N/A';
          const customerName = orderData.customer_name || 'Unknown';
          errors.push({ orderId, customerName, error: errorMessage });
          
          // Log failed action
          if (user) {
            await logUserAction({
              userId: user.id,
              action: 'Create Order',
              status: 'failed',
              orderId: orderData.order_id ?? "",
            });
          }
        }
      }

      if (successCount > 0) {
        if (errors.length > 0) {
          // Show detailed error summary
          const errorSummary = errors.map(e => 
            `${e.customerName} (${e.orderId}): ${e.error}`
          ).join('\n');
          showError(`Successfully added ${successCount} order(s), but ${errors.length} failed:\n${errorSummary}`);
        } else {
          showSuccess(`Successfully added ${successCount} order(s)!`);
        }
        
        // Refresh orders table
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        // All failed - show detailed error list
        const errorSummary = errors.map(e => 
          `${e.customerName} (${e.orderId}): ${e.error}`
        ).join('\n');
        showError(`Failed to add all ${errors.length} order(s):\n${errorSummary}`);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showError(`Failed to process orders: ${errorMessage}`);
    } finally {
      setLoading(false);
      setUploadProgress('');
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
          <h3 id="add-order-modal-title" className="text-xl font-semibold text-[#E5E7EB]">
            {isEditMode ? 'Edit Order' : 'Add Order'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors"
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs - Only show tabs when not in edit mode */}
        {!isEditMode && (
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
        )}

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
              <div className="relative">
                <select
                  value={formData.product_id || ''}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full pr-10 px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {products.length === 0 && (
                <p className="mt-1 text-xs text-yellow-400">
                  No products available. Please add products first.
                </p>
              )}
            </div>
            <Input
              label="Amount (VND)"
              type="text"
              value={formData.amountDisplay || ''}
              onChange={handleFormattedNumberChange}
              required
              disabled={loading}
              placeholder="e.g., 20,000,000"
            />
            {!isEditMode && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> Status will be set to "Pending" and Risk Score will be set to "N/A" automatically.
                </p>
              </div>
            )}
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
                    {isEditMode ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  isEditMode ? 'Update Order' : 'Add Order'
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
                              {order.product || 'N/A'}
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
          </div>
        )}
      </div>
    </div>
  );
};

