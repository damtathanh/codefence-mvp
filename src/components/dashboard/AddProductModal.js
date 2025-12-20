import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { logUserAction } from '../../utils/logUserAction';
import { PRODUCT_CATEGORIES, getCategoryDisplayName } from '../../constants/productCategories';
import * as XLSX from 'xlsx';
import { validateAndMapProductHeaders } from '../../utils/productColumnMapper';
import { supabase } from '../../lib/supabaseClient';
export const AddProductModal = ({ isOpen, onClose, onSuccess, initialName = '', }) => {
    const { user } = useAuth();
    const { showSuccess, showError, showWarning } = useToast();
    const { addItem, fetchAll } = useSupabaseTable({ tableName: 'products', enableRealtime: false });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('manual');
    const [uploadProgress, setUploadProgress] = useState('');
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        product_id: '',
        name: initialName,
        category: '',
        price: '',
        stock: '',
        status: 'active',
    });
    // Update form when initialName changes
    useEffect(() => {
        if (isOpen && initialName) {
            setFormData(prev => ({ ...prev, name: initialName }));
        }
    }, [isOpen, initialName]);
    // Helper function to handle formatted number input for price/stock
    const handleFormattedNumberChange = (field, e) => {
        if (field === 'price') {
            let value = e.target.value.replace(/[^\d]/g, '');
            const formatted = value ? Number(value).toLocaleString('en-US') : '';
            setFormData({ ...formData, [field]: formatted });
        }
        else {
            setFormData({ ...formData, [field]: e.target.value });
        }
    };
    // ESC to close modal
    useEffect(() => {
        if (!isOpen)
            return;
        const handleEsc = (event) => {
            if (event.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading)
            onClose();
    };
    // ====== PARSE HELPERS (giữ nguyên logic cũ) ======
    const parseNumeric = (v) => {
        if (v === null || v === undefined)
            return null;
        const cleaned = String(v).replace(/,/g, "").trim();
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
    };
    const toStr = (value) => {
        if (value === null || value === undefined)
            return "";
        return String(value).trim();
    };
    const parseCSV = (file) => {
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
                    const validationResult = validateAndMapProductHeaders(headers);
                    if (validationResult.error) {
                        const error = new Error(validationResult.error);
                        error.validationResult = validationResult;
                        reject(error);
                        return;
                    }
                    const mapping = validationResult.mapping;
                    const rows = json.map((r) => {
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
                }
                catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };
    const parseXLSX = (file) => {
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
                    const validationResult = validateAndMapProductHeaders(headers);
                    if (validationResult.error) {
                        const error = new Error(validationResult.error);
                        error.validationResult = validationResult;
                        reject(error);
                        return;
                    }
                    const mapping = validationResult.mapping;
                    const rows = json.map((r) => {
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
                }
                catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };
    const parseProductFile = async (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv')
            return parseCSV(file);
        if (ext === 'xlsx' || ext === 'xls')
            return parseXLSX(file);
        throw new Error('Unsupported file format. Please use CSV or XLSX.');
    };
    const getErrorMessage = (err) => {
        if (err && typeof err === 'object') {
            if (err.message)
                return err.message;
            if (err instanceof Error)
                return err.message;
        }
        return 'Unknown error';
    };
    // ====== MANUAL SUBMIT ======
    const handleManualSubmit = async (e) => {
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
            const productData = {
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
            if (onSuccess)
                await onSuccess();
            onClose();
        }
        catch (err) {
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
            try {
                await fetchAll();
            }
            catch { }
        }
        finally {
            setLoading(false);
        }
    };
    // ====== FILE UPLOAD ======
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
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
                .insert(parsedProducts.map(p => ({
                user_id: user?.id ?? null,
                product_id: p.product_id,
                name: p.name,
                category: p.category,
                price: p.price,
                stock: p.stock,
                status: p.status,
            })))
                .select();
            if (error) {
                throw error;
            }
            await fetchAll();
            if (user && data) {
                const logPromises = data.map(product => logUserAction({
                    userId: user.id,
                    action: 'Import Products',
                    status: 'success',
                    orderId: product.product_id ?? "",
                    details: {
                        source: 'excel_import',
                        file_name: file.name,
                        product_name: product.name,
                        category: product.category,
                    },
                }));
                await Promise.all(logPromises);
            }
            showSuccess(`Imported ${parsedProducts.length} products successfully.`);
            setUploadProgress('');
            if (onSuccess)
                await onSuccess();
            onClose();
        }
        catch (err) {
            console.error('Error uploading product file:', err);
            showError(getErrorMessage(err));
            setUploadProgress('');
        }
        finally {
            setLoading(false);
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4", onClick: handleOverlayClick, role: "dialog", "aria-modal": "true", "aria-labelledby": "product-modal-title", children: _jsxs("div", { className: "bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] shadow-2xl w-full max-w-2xl flex flex-col", style: { maxHeight: '90vh' }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[#1E223D]", children: [_jsx("h3", { id: "product-modal-title", className: "text-xl font-semibold text-[#E5E7EB]", children: "Add Product" }), _jsx("button", { onClick: onClose, className: "text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors p-1 rounded hover:bg-white/10", "aria-label": "Close modal", disabled: loading, children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "flex gap-2 px-6 pt-4 border-b border-[#1E223D] flex-shrink-0", children: [_jsxs("button", { onClick: () => setActiveTab('manual'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'manual'
                                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
                                : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'}`, disabled: loading, children: [_jsx(FileText, { size: 16, className: "inline mr-2" }), "Manual Entry"] }), _jsxs("button", { onClick: () => setActiveTab('upload'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload'
                                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
                                : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'}`, disabled: loading, children: [_jsx(Upload, { size: 16, className: "inline mr-2" }), "Upload File"] })] }), _jsx("div", { className: "flex-1 overflow-y-auto min-h-0 p-6", children: activeTab === 'manual' ? (_jsxs("form", { onSubmit: handleManualSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Product ID", value: formData.product_id, onChange: (e) => setFormData({ ...formData, product_id: e.target.value }), required: true, disabled: loading, placeholder: "e.g., PROD-001" }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-[#E5E7EB]/90 mb-1", children: ["Category ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsxs("select", { className: "w-full h-[44px] px-3 rounded-lg bg-white/5 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]", value: formData.category, onChange: (e) => setFormData({ ...formData, category: e.target.value }), disabled: loading, required: true, children: [_jsx("option", { value: "", children: "Select category" }), Object.keys(PRODUCT_CATEGORIES).map((key) => (_jsx("option", { value: key, children: getCategoryDisplayName(key) }, key)))] })] })] }), _jsx(Input, { label: "Product Name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), required: true, disabled: loading }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Price (VND)", type: "text", value: formData.price, onChange: (e) => handleFormattedNumberChange('price', e), placeholder: "e.g., 20,000,000", required: true, disabled: loading }), _jsx(Input, { label: "Stock", type: "number", value: formData.stock, onChange: (e) => handleFormattedNumberChange('stock', e), placeholder: "e.g., 100", required: true, disabled: loading })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-[#E5E7EB]/90 mb-1", children: "Status" }), _jsxs("select", { className: "w-full h-[44px] px-3 rounded-lg bg-white/5 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]", value: formData.status, onChange: (e) => setFormData({
                                            ...formData,
                                            status: e.target.value,
                                        }), disabled: loading, children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t border-[#1E223D] mt-4", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onClose, disabled: loading, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Adding..."] })) : ('Add Product') })] })] })) : (_jsxs("div", { className: "space-y-5", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-[#E5E7EB]", children: "Upload CSV or XLSX file" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/60", children: "Supported formats: .csv, .xlsx, .xls" })] }) }), _jsx("div", { className: "border-2 border-dashed border-[#8B5CF6]/40 bg-white/5 rounded-2xl p-8 text-center", children: _jsxs("div", { className: "flex flex-col items-center justify-center space-y-4", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/10 flex items-center justify-center border border-[#8B5CF6]/30", children: loading ? (_jsx(Loader2, { className: "w-7 h-7 text-[#8B5CF6] animate-spin" })) : (_jsx(Upload, { className: "w-7 h-7 text-[#8B5CF6]" })) }), _jsx("p", { className: "text-[#E5E7EB] font-medium", children: loading ? 'Processing file...' : 'Drag & drop file here or' }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".csv,.xlsx,.xls", className: "hidden", onChange: handleFileUpload }), _jsxs(Button, { type: "button", disabled: loading, onClick: () => fileInputRef.current?.click(), className: "mt-2 flex items-center gap-2", children: [_jsx(Upload, { className: "w-4 h-4" }), "Choose File"] }), uploadProgress && (_jsx("p", { className: "text-sm text-[#E5E7EB]/70 mt-2", children: uploadProgress }))] }) }), _jsxs("div", { className: "bg-white/5 rounded-lg p-4 border border-white/10 text-sm text-[#E5E7EB]/80 text-left", children: [_jsx("p", { className: "font-semibold mb-2", children: "Expected CSV/XLSX columns:" }), _jsxs("ul", { className: "list-disc list-inside space-y-1", children: [_jsx("li", { children: "Product ID (required)" }), _jsx("li", { children: "Product Name (required)" }), _jsx("li", { children: "Category (optional)" }), _jsx("li", { children: "Price (VND) (required)" }), _jsx("li", { children: "Stock (required)" })] })] })] })) })] }) }));
};
