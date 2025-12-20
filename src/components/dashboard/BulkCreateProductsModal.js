import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Plus, Loader2 } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../utils/logUserAction';
import { PRODUCT_CATEGORIES } from '../../constants/productCategories';
export const BulkCreateProductsModal = ({ isOpen, onClose, missingProducts, pendingUpload, onSuccess, }) => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const { fetchAll: refetchProducts } = useSupabaseTable({ tableName: 'products', enableRealtime: false });
    const [loading, setLoading] = useState(false);
    const [productFormData, setProductFormData] = useState(new Map());
    // Initialize form data when modal opens or missingProducts change
    useEffect(() => {
        if (isOpen && missingProducts.length > 0) {
            const initialFormData = new Map();
            missingProducts.forEach(productName => {
                // Keep existing form data if available, otherwise use defaults
                const existing = productFormData.get(productName);
                initialFormData.set(productName, existing || {
                    productId: '',
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
        if (!isOpen)
            return;
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);
    // Handle click outside to close modal
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    // Handle product form field change
    const handleProductFormChange = (productName, field, value) => {
        setProductFormData(prev => {
            const next = new Map(prev);
            const current = next.get(productName) || {
                productId: '',
                name: productName,
                category: '',
                price: '',
                stock: '',
                status: 'active',
            };
            next.set(productName, { ...current, [field]: value });
            return next;
        });
    };
    // Handle formatted price input for product form
    const handleProductPriceChange = (productName, e) => {
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
            const productsToCreate = [];
            const errors = [];
            missingProducts.forEach((productName, index) => {
                const formData = productFormData.get(productName);
                if (!formData) {
                    errors.push(`${productName}: Missing form data`);
                    return;
                }
                // Validate required fields
                if (!formData.productId.trim()) {
                    errors.push(`${productName}: Product ID is required`);
                    return;
                }
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
                // Use productId from form data (trimmed)
                const productId = formData.productId.trim();
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
                const logPromises = createdProducts.map(product => logUserAction({
                    userId: user.id,
                    action: 'Create Product',
                    status: 'success',
                    orderId: product.product_id ?? "",
                }));
                await Promise.all(logPromises);
            }
            showSuccess(`Successfully created ${productsToCreate.length} product(s)!`);
            // Refetch products so the new ones are available
            await refetchProducts();
            // Call onSuccess callback with pendingUpload to continue import
            // The handler (handleBulkCreateProductsModalSuccess) will close the modal
            if (onSuccess) {
                await onSuccess(pendingUpload || null);
            }
            // Reset form (modal will be closed by the onSuccess handler)
            setProductFormData(new Map());
        }
        catch (err) {
            console.error('Error creating products:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create products. Please try again.';
            showError(errorMessage);
            // Log failed actions
            if (user) {
                const logPromises = missingProducts.map(productName => logUserAction({
                    userId: user.id,
                    action: 'Create Product',
                    status: 'failed',
                    orderId: productName,
                }));
                await Promise.all(logPromises);
            }
        }
        finally {
            setLoading(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-200", onClick: handleOverlayClick, role: "dialog", "aria-modal": "true", "aria-labelledby": "bulk-product-modal-title", children: _jsxs("div", { className: "bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] max-w-4xl w-full shadow-2xl transition-all duration-200 ease-out flex flex-col", onClick: (e) => e.stopPropagation(), style: {
                maxHeight: '90vh',
                animation: 'modalEnter 0.2s ease-out',
            }, children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[#1E223D] flex-shrink-0", children: [_jsx("h3", { id: "bulk-product-modal-title", className: "text-xl font-semibold text-[#E5E7EB]", children: "Bulk Create Products" }), _jsx("button", { onClick: onClose, className: "text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors p-1 rounded hover:bg-white/10", "aria-label": "Close modal", disabled: loading, children: _jsx(X, { size: 20 }) })] }), _jsx("div", { className: "overflow-y-auto flex-1 min-h-0", style: {
                        paddingRight: '6px'
                    }, children: _jsxs("div", { className: "p-6 space-y-4", children: [_jsx("div", { children: _jsx("p", { className: "text-sm text-[#E5E7EB]/80", children: "The following products don't exist in your catalog yet. Please fill in the details to create them:" }) }), _jsx("div", { className: "mt-4 overflow-x-auto border border-[#1E223D] rounded-lg", children: _jsxs("table", { className: "w-full text-sm border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-[#1E223D]/50 border-b border-[#1E223D]", children: [_jsx("th", { className: "text-left py-3 px-4 text-[#E5E7EB] font-medium", children: "Product ID" }), _jsx("th", { className: "text-left py-3 px-4 text-[#E5E7EB] font-medium", children: "Product Name" }), _jsx("th", { className: "text-left py-3 px-4 text-[#E5E7EB] font-medium", children: "Category" }), _jsx("th", { className: "text-left py-3 px-4 text-[#E5E7EB] font-medium", children: "Price (VND)" }), _jsx("th", { className: "text-left py-3 px-4 text-[#E5E7EB] font-medium", children: "Stock" }), _jsx("th", { className: "text-left py-3 px-4 text-[#E5E7EB] font-medium", children: "Status" })] }) }), _jsx("tbody", { children: missingProducts.map((productName, idx) => {
                                                const formData = productFormData.get(productName) || {
                                                    productId: '',
                                                    name: productName,
                                                    category: '',
                                                    price: '',
                                                    stock: '',
                                                    status: 'active',
                                                };
                                                return (_jsxs("tr", { className: "border-b border-[#1E223D]/30 hover:bg-white/5 transition-colors", children: [_jsx("td", { className: "py-3 px-4", children: _jsx(Input, { type: "text", value: formData.productId, onChange: (e) => handleProductFormChange(productName, 'productId', e.target.value), placeholder: "e.g., PROD-001", className: "w-full !py-2 text-sm", required: true, disabled: loading }) }), _jsx("td", { className: "py-3 px-4 text-white/90", children: _jsx("span", { className: "font-medium", children: productName }) }), _jsx("td", { className: "py-3 px-4", children: _jsxs("div", { className: "relative", children: [_jsxs("select", { value: formData.category, onChange: (e) => handleProductFormChange(productName, 'category', e.target.value), className: "w-full pr-8 px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 transition-all text-sm", required: true, disabled: loading, children: [_jsx("option", { value: "", children: "Select category" }), PRODUCT_CATEGORIES.map(group => (_jsx("optgroup", { label: group.groupName, children: group.categories.map(category => (_jsx("option", { value: category.slug, children: category.displayName }, category.slug))) }, group.groupName)))] }), _jsx("svg", { className: "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 9l-7 7-7-7" }) })] }) }), _jsx("td", { className: "py-3 px-4", children: _jsx(Input, { type: "text", value: formData.price, onChange: (e) => handleProductPriceChange(productName, e), placeholder: "e.g., 20,000,000", className: "w-full !py-2 text-sm", required: true, disabled: loading }) }), _jsx("td", { className: "py-3 px-4", children: _jsx(Input, { type: "number", value: formData.stock, onChange: (e) => handleProductFormChange(productName, 'stock', e.target.value), placeholder: "0", className: "w-full !py-2 text-sm", required: true, disabled: loading }) }), _jsx("td", { className: "py-3 px-4", children: _jsxs("div", { className: "relative", children: [_jsxs("select", { value: formData.status, onChange: (e) => handleProductFormChange(productName, 'status', e.target.value), className: "w-full pr-8 px-3 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] text-sm", disabled: loading, children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] }), _jsx("svg", { className: "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 9l-7 7-7-7" }) })] }) })] }, idx));
                                            }) })] }) })] }) }), _jsxs("div", { className: "flex gap-3 justify-end p-6 border-t border-[#1E223D] flex-shrink-0", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onClose, disabled: loading, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "mr-2 animate-spin" }), "Creating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Plus, { size: 16, className: "mr-2" }), "Create ", missingProducts.length, " Product", missingProducts.length > 1 ? 's' : '', " + Continue"] })) })] })] }) }));
};
