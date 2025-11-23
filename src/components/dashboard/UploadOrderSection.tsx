import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Upload, Loader2, AlertTriangle, Circle } from 'lucide-react';
import { useOrders, type OrderInput, type InvalidOrderRow, type ParsedOrderRow } from '../../hooks/useOrders';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../utils/logUserAction';
import type { Product } from '../../types/supabase';
import type { HeaderValidationResult } from '../../utils/smartColumnMapper';
import { normalize } from '../../utils/smartColumnMapper';
import { checkDuplicateOrderIds, insertOrdersWithLogging } from '../../utils/orderImport';

interface ParsedUploadPayload {
    validOrders: OrderInput[];
    orders: ParsedOrderRow[];
}

interface UploadOrderSectionProps {
    onClose: () => void;
    onSuccess?: () => void;
    products: Product[];
    openBulkCreateProductsModal?: (options: { missingProducts: string[]; pendingUpload: ParsedUploadPayload | null }) => void;
    pendingUploadAfterProductsCreated?: ParsedUploadPayload | null;
}

export const UploadOrderSection: React.FC<UploadOrderSectionProps> = ({
    onClose,
    onSuccess,
    products,
    openBulkCreateProductsModal,
    pendingUploadAfterProductsCreated,
}) => {
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { parseFile, insertOrders, validateAndMapProducts } = useOrders();
    const { showSuccess, showError, showWarning } = useToast();
    const { user } = useAuth();

    // File upload state
    const [uploadedOrders, setUploadedOrders] = useState<ParsedOrderRow[]>([]);
    const [invalidOrders, setInvalidOrders] = useState<InvalidOrderRow[]>([]);
    const [correctedOrders, setCorrectedOrders] = useState<Map<number, string>>(new Map()); // rowIndex -> product_id
    const [showPreview, setShowPreview] = useState(false);

    // Missing products state
    const [pendingUpload, setPendingUpload] = useState<ParsedUploadPayload | null>(null);
    const [missingProducts, setMissingProducts] = useState<string[]>([]);

    // Flag to track if we've already processed the pending upload after products were created
    const [hasProcessedPendingUpload, setHasProcessedPendingUpload] = useState(false);

    // Helper to parse numeric values
    const parseNumeric = (v: any): number | null => {
        if (v === null || v === undefined) return null;
        const cleaned = v.toString().replace(/,/g, "").trim();
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
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
            if (err instanceof Error) return err.message;
        }
        return 'Unknown error';
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
            orders.forEach(order => {
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
                    onClose();
                    setTimeout(() => {
                        openBulkCreateProductsModal({
                            missingProducts: missingProductNames,
                            pendingUpload: payload,
                        });
                    }, 100);
                    return;
                } else {
                    // Fallback
                    setPendingUpload(payload);
                    setMissingProducts(missingProductNames);
                    setLoading(false);
                    return;
                }
            }

            // No missing products, continue with duplicate check and insert
            setUploadProgress('Checking for duplicate Order IDs...');

            if (!user) return;

            const { hasDuplicates, messageJsx } = await checkDuplicateOrderIds(revalidatedOrders, user.id, supabase);
            if (hasDuplicates && messageJsx) {
                showWarning(messageJsx, 0);
                setPendingUpload(null);
                setMissingProducts([]);
                setUploadProgress('');
                return;
            }

            // All checks passed, insert orders
            setUploadProgress(`Inserting ${revalidatedOrders.length} orders...`);

            const result = await insertOrdersWithLogging(revalidatedOrders, user.id, insertOrders, logUserAction);

            if (result.success > 0) {
                if (result.failed > 0) {
                    const errorSummary = result.errors.join('\n');
                    showError(`Successfully added ${result.success} order(s), but ${result.failed} failed:\n${errorSummary}`);
                } else {
                    showSuccess(`Successfully added ${result.success} order(s)!`);
                }

                if (onSuccess) {
                    onSuccess();
                }

                // Reset state
                setPendingUpload(null);
                setMissingProducts([]);
                onClose();
            } else {
                const errorSummary = result.errors.join('\n');
                showError(`Failed to add all ${result.failed} order(s):\n${errorSummary}`);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : getErrorMessage(err);
            showError(`Failed to process file: ${errorMessage}`);
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    };

    // Auto-resume import after products are created
    useEffect(() => {
        if (
            pendingUploadAfterProductsCreated &&
            !hasProcessedPendingUpload
        ) {
            setHasProcessedPendingUpload(true);

            // Small delay to ensure render completes
            const timeoutId = setTimeout(() => {
                processParsedOrders(pendingUploadAfterProductsCreated)
                    .then(() => {
                        // Success handled in function
                    })
                    .catch(err => {
                        console.error('Error continuing import after product creation:', err);
                        const errorMessage = err instanceof Error ? err.message : 'Failed to continue import.';
                        showError(errorMessage);
                        setHasProcessedPendingUpload(false);
                    });
            }, 100);

            return () => clearTimeout(timeoutId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingUploadAfterProductsCreated, hasProcessedPendingUpload]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setUploadProgress('Parsing file...');

        try {
            const orders = await parseFile(file);

            if (orders.length === 0) {
                showError('No valid orders found in the file.');
                return;
            }

            setUploadProgress(`Found ${orders.length} orders. Validating products...`);

            const { validOrders, invalidOrders: invalid, warnings } = await validateAndMapProducts(orders);

            setUploadedOrders(orders);
            setInvalidOrders(invalid);
            setCorrectedOrders(new Map());

            if (invalid.length > 0) {
                setPendingUpload({ validOrders, orders });
                setMissingProducts([]);
                setShowPreview(true);
                setUploadProgress(`Found ${invalid.length} order(s) with missing required fields. Please correct them below.`);
            } else {
                setUploadProgress('Checking for missing products...');

                const productNamesFromFile = new Set<string>();
                orders.forEach(order => {
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

                if (missingProductNames.length > 0) {
                    const payload: ParsedUploadPayload = { validOrders, orders };

                    setUploadProgress('');
                    setUploadedOrders([]);
                    setInvalidOrders([]);
                    setCorrectedOrders(new Map());
                    setShowPreview(false);
                    setPendingUpload(null);
                    setMissingProducts([]);
                    setLoading(false);

                    if (openBulkCreateProductsModal) {
                        onClose();
                        setTimeout(() => {
                            openBulkCreateProductsModal({
                                missingProducts: missingProductNames,
                                pendingUpload: payload,
                            });
                        }, 100);
                        return;
                    } else {
                        setPendingUpload(payload);
                        setMissingProducts(missingProductNames);
                        setLoading(false);
                        return;
                    }
                }

                setUploadProgress('Checking for duplicate Order IDs...');

                if (!user) return;

                const { hasDuplicates, messageJsx } = await checkDuplicateOrderIds(validOrders, user.id, supabase);
                if (hasDuplicates && messageJsx) {
                    showWarning(messageJsx, 0);
                    return;
                }

                setUploadProgress(`Inserting ${validOrders.length} orders...`);

                const result = await insertOrdersWithLogging(validOrders, user.id, insertOrders, logUserAction);

                if (result.success > 0) {
                    if (result.failed > 0) {
                        const errorSummary = result.errors.join('\n');
                        showError(`Successfully added ${result.success} order(s), but ${result.failed} failed:\n${errorSummary}`);
                    } else {
                        showSuccess(`Successfully added ${result.success} order(s)!`);
                    }

                    if (onSuccess) {
                        onSuccess();
                    }

                    onClose();
                } else {
                    const errorSummary = result.errors.join('\n');
                    showError(`Failed to add all ${result.failed} order(s):\n${errorSummary}`);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : getErrorMessage(err);

            const isHeaderValidationError = errorMessage.includes("We couldn't import this file") ||
                errorMessage.includes("Missing required columns") ||
                errorMessage.includes("Some column names are invalid") ||
                errorMessage.includes("Columns with invalid names");

            if (isHeaderValidationError) {
                const validationResult = (err as any)?.validationResult as HeaderValidationResult | undefined;

                const structuredMessage = (
                    <div className="space-y-3">
                        <div>
                            <p className="font-semibold text-yellow-300">We couldn't import this file.</p>
                            <p className="text-yellow-300/90 mt-1">Please fix the following issues:</p>
                        </div>

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
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleProductCorrection = (rowIndex: number, productId: string) => {
        setCorrectedOrders(prev => {
            const next = new Map(prev);
            next.set(rowIndex, productId);
            return next;
        });
    };

    const handleConfirmUpload = async () => {
        if (invalidOrders.length === 0) return;

        setLoading(true);
        setUploadProgress('Processing corrected orders...');

        try {
            const allOrders: OrderInput[] = [];

            invalidOrders.forEach(({ order, rowIndex }) => {
                const productId = correctedOrders.get(rowIndex);
                if (productId) {
                    allOrders.push({
                        order_id: order.order_id || "",
                        customer_name: order.customer_name || "",
                        phone: order.phone || "",
                        address: order.address || null,
                        product_id: productId,
                        product: order.product || "",
                        amount: parseNumeric(order.amount) ?? 0,
                        payment_method: order.payment_method || "COD",
                    } as OrderInput);
                }
            });

            const uncorrected = invalidOrders.filter(({ rowIndex }) => !correctedOrders.has(rowIndex));
            if (uncorrected.length > 0) {
                showError(`Please correct all ${uncorrected.length} invalid product(s) before confirming.`);
                setLoading(false);
                return;
            }

            const { validOrders } = await validateAndMapProducts(uploadedOrders.filter((_, idx) => {
                return !invalidOrders.some(inv => inv.rowIndex === idx + 1);
            }));

            const finalOrders = [...validOrders, ...allOrders];

            setUploadProgress('Checking for duplicate Order IDs...');

            if (!user) return;

            const { hasDuplicates, messageJsx } = await checkDuplicateOrderIds(finalOrders, user.id, supabase);
            if (hasDuplicates && messageJsx) {
                showWarning(messageJsx, 0);
                return;
            }

            setUploadProgress(`Inserting ${finalOrders.length} orders...`);

            const result = await insertOrdersWithLogging(finalOrders, user.id, insertOrders, logUserAction);

            if (result.success > 0) {
                if (result.failed > 0) {
                    const errorSummary = result.errors.join('\n');
                    showError(`Successfully added ${result.success} order(s), but ${result.failed} failed:\n${errorSummary}`);
                } else {
                    showSuccess(`Successfully added ${result.success} order(s)!`);
                }

                if (onSuccess) {
                    onSuccess();
                }

                onClose();
            } else {
                const errorSummary = result.errors.join('\n');
                showError(`Failed to add all ${result.failed} order(s):\n${errorSummary}`);
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            showError(`Failed to process orders: ${errorMessage}`);
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    };

    return (
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
                            <li>Payment Method (optional) – if missing, it will default to "COD".</li>
                        </ul>
                        <p className="mt-3 text-sm text-white/60">
                            Note: Status will be set to <strong>Pending</strong>. If your file does not include a
                            Payment Method column, it will default to <strong>COD</strong>. Risk will be evaluated
                            automatically in the workflow.
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
    );
};
