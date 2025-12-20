import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../utils/logUserAction';
import { generateChanges } from '../../utils/generateChanges';
import { evaluateRisk } from '../../utils/riskEngine';
import { fetchPastOrdersByPhone } from '../../features/orders/services/ordersService';
import { fetchCustomerBlacklist } from '../../features/customers/services/customersService';
import { logOrderEvent } from '../../features/orders/services/orderEventsService';
import { markInvoicePaidForOrder } from '../../features/invoices/services/invoiceService';
import { ORDER_STATUS } from '../../constants/orderStatus';
export const ManualOrderForm = ({ editingOrder, onClose, onSuccess, products, }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();
    const isEditMode = !!editingOrder;
    // Manual entry form state
    const [formData, setFormData] = useState({
        order_id: '',
        customer_name: '',
        phone: '',
        address_detail: '',
        ward: '',
        district: '',
        province: '',
        product_id: '',
        amount: 0,
        amountDisplay: '',
        payment_method: 'COD',
    });
    // Initialize form data when editing
    useEffect(() => {
        if (editingOrder) {
            const formattedAmount = editingOrder.amount
                ? Number(editingOrder.amount).toLocaleString('en-US')
                : '';
            setFormData({
                order_id: editingOrder.order_id || '',
                customer_name: editingOrder.customer_name || '',
                phone: editingOrder.phone || '',
                address_detail: editingOrder.address_detail || editingOrder.address || '',
                ward: editingOrder.ward || '',
                district: editingOrder.district || '',
                province: editingOrder.province || '',
                product_id: editingOrder.product_id || '',
                amount: editingOrder.amount || 0,
                amountDisplay: formattedAmount,
                payment_method: editingOrder.payment_method || 'COD',
            });
        }
    }, [editingOrder]);
    // Helper function to handle formatted number input for amount
    const handleFormattedNumberChange = (e) => {
        let value = e.target.value.replace(/[^\d]/g, ''); // remove non-digits
        const formatted = value ? Number(value).toLocaleString('en-US') : '';
        setFormData({ ...formData, amountDisplay: formatted });
    };
    // Local validator function
    const validateManualOrder = (o) => {
        if (!o.order_id?.trim())
            return 'Order ID is required';
        if (!o.customer_name?.trim())
            return 'Customer Name is required';
        if (!o.phone?.trim())
            return 'Phone is required';
        if (!o.product_id)
            return 'Product is required';
        if (!o.amount || o.amount <= 0)
            return 'Amount is invalid';
        return null;
    };
    // Handle manual form submission
    const handleManualSubmit = async (e) => {
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
            const numericAmount = formData.amountDisplay
                ? Number(formData.amountDisplay.replace(/,/g, ''))
                : 0;
            if (numericAmount <= 0) {
                showError('Amount must be greater than 0');
                setLoading(false);
                return;
            }
            if (isEditMode && editingOrder && user) {
                const previousProduct = products.find((p) => p.id === editingOrder.product_id);
                const newProduct = products.find((p) => p.id === formData.product_id);
                const previousData = {
                    order_id: editingOrder.order_id || '',
                    customer_name: editingOrder.customer_name || '',
                    phone: editingOrder.phone || '',
                    product: previousProduct?.name || editingOrder.product || 'N/A',
                    amount: editingOrder.amount || 0,
                    payment_method: editingOrder.payment_method || 'COD',
                };
                const updateData = {
                    order_id: formData.order_id?.trim() || '',
                    customer_name: formData.customer_name?.trim() || '',
                    phone: formData.phone?.trim() || '',
                    product: newProduct?.name || 'N/A',
                    amount: numericAmount,
                    payment_method: formData.payment_method || 'COD',
                };
                const changes = generateChanges(previousData, updateData);
                const selectedProduct = products.find((p) => p.id === formData.product_id);
                const productName = selectedProduct?.name || '';
                const { data: updatedOrder, error } = await supabase
                    .from('orders')
                    .update({
                    order_id: formData.order_id?.trim() || '',
                    customer_name: formData.customer_name?.trim() || '',
                    phone: formData.phone?.trim() || '',
                    address_detail: formData.address_detail?.trim() || null,
                    ward: formData.ward?.trim() || null,
                    district: formData.district?.trim() || null,
                    province: formData.province?.trim() || null,
                    product_id: formData.product_id || '',
                    product: productName, // Store product name
                    amount: numericAmount,
                    payment_method: formData.payment_method || 'COD',
                    updated_at: new Date().toISOString(),
                })
                    .eq('id', editingOrder.id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) {
                    throw error;
                }
                if (user && updatedOrder) {
                    await logUserAction({
                        userId: user.id,
                        action: 'Update Order',
                        status: 'success',
                        orderId: updatedOrder.order_id ?? '',
                        details: Object.keys(changes).length > 0 ? changes : null,
                    });
                }
                showSuccess('Order updated successfully!');
            }
            else {
                // Insert new order
                const selectedProduct = products.find((p) => p.id === formData.product_id);
                const productName = selectedProduct?.name || '';
                const orderData = {
                    order_id: formData.order_id || '',
                    customer_name: formData.customer_name || '',
                    phone: formData.phone || '',
                    address_detail: formData.address_detail || null,
                    ward: formData.ward || null,
                    district: formData.district || null,
                    province: formData.province || null,
                    product_id: formData.product_id || null,
                    product: productName,
                    amount: numericAmount,
                    payment_method: formData.payment_method || 'COD',
                };
                const validationError = validateManualOrder(orderData);
                if (validationError) {
                    showError(validationError);
                    setLoading(false);
                    return;
                }
                let riskScore = null;
                let riskLevel = null;
                let riskVersion = null;
                let riskReasons = [];
                const paymentMethod = (orderData.payment_method || 'COD').toUpperCase();
                if (paymentMethod === 'COD') {
                    try {
                        if (user) {
                            const { data: blacklistData } = await fetchCustomerBlacklist(user.id);
                            const blacklistSet = new Set((blacklistData || []).map((b) => b.phone));
                            const { data: pastOrders } = await fetchPastOrdersByPhone(user.id, orderData.phone);
                            const riskInput = {
                                paymentMethod: 'COD',
                                amountVnd: numericAmount,
                                phone: orderData.phone,
                                pastOrders: pastOrders || [],
                                productName: productName,
                            };
                            const riskOutput = evaluateRisk(riskInput, blacklistSet);
                            riskScore = riskOutput.score;
                            riskLevel = riskOutput.level;
                            riskVersion = riskOutput.version || null;
                            riskReasons = riskOutput.reasons;
                        }
                    }
                    catch (err) {
                        console.error('Error calculating risk:', err);
                    }
                }
                const isCod = paymentMethod === 'COD';
                const initialStatus = isCod
                    ? ORDER_STATUS.PENDING_REVIEW
                    : ORDER_STATUS.ORDER_PAID;
                const { data: newOrder, error: insertError } = await supabase
                    .from('orders')
                    .insert({
                    user_id: user?.id,
                    order_id: orderData.order_id,
                    customer_name: orderData.customer_name,
                    phone: orderData.phone,
                    address_detail: orderData.address_detail,
                    ward: orderData.ward,
                    district: orderData.district,
                    province: orderData.province,
                    product_id: orderData.product_id,
                    product: productName,
                    amount: orderData.amount,
                    payment_method: orderData.payment_method,
                    status: initialStatus,
                    risk_score: isCod ? riskScore : null,
                    risk_level: isCod ? riskLevel : null,
                    order_date: new Date().toISOString().split('T')[0],
                })
                    .select()
                    .single();
                if (insertError)
                    throw insertError;
                if (newOrder && riskReasons.length > 0) {
                    await logOrderEvent(newOrder.id, 'RISK_EVALUATED', {
                        score: riskScore,
                        level: riskLevel,
                        reasons: riskReasons,
                        version: riskVersion,
                    }, 'manual_order_form');
                }
                if (user && newOrder) {
                    await logUserAction({
                        userId: user.id,
                        action: 'Create Order',
                        status: 'success',
                        orderId: newOrder.order_id ?? '',
                        details: {
                            source: 'manual',
                            product: newOrder.product,
                            amount: newOrder.amount?.toString() || '0',
                            payment_method: newOrder.payment_method,
                        },
                    });
                    const pm = newOrder.payment_method?.toUpperCase() || 'COD';
                    if (pm !== 'COD') {
                        await markInvoicePaidForOrder(newOrder);
                    }
                }
                showSuccess('Order added successfully!');
            }
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        }
        catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : isEditMode
                    ? 'Failed to update order'
                    : 'Failed to add order';
            showError(errorMessage);
            if (user) {
                await logUserAction({
                    userId: user.id,
                    action: isEditMode ? 'Update Order' : 'Create Order',
                    status: 'failed',
                    orderId: isEditMode
                        ? editingOrder?.order_id ?? ''
                        : '',
                });
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleManualSubmit, className: "space-y-5", children: [_jsx(Input, { label: "Order ID", value: formData.order_id, onChange: (e) => setFormData({ ...formData, order_id: e.target.value }), required: true, disabled: loading, placeholder: "e.g., ORD-2024-001" }), _jsx(Input, { label: "Customer Name", value: formData.customer_name, onChange: (e) => setFormData({
                    ...formData,
                    customer_name: e.target.value,
                }), required: true, disabled: loading }), _jsx(Input, { label: "Phone Number", value: formData.phone, onChange: (e) => setFormData({ ...formData, phone: e.target.value }), required: true, disabled: loading }), _jsxs("div", { className: "space-y-3 bg-white/5 p-4 rounded-xl border border-white/10", children: [_jsx("div", { className: "text-sm font-medium text-white/80", children: "Address Details" }), _jsx(Input, { label: "Address Number", value: formData.address_detail || '', onChange: (e) => setFormData({
                            ...formData,
                            address_detail: e.target.value,
                        }), required: true, disabled: loading, placeholder: "House number, street..." }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsx(Input, { label: "Ward", value: formData.ward || '', onChange: (e) => setFormData({ ...formData, ward: e.target.value }), disabled: loading, placeholder: "Ward" }), _jsx(Input, { label: "District", value: formData.district || '', onChange: (e) => setFormData({
                                    ...formData,
                                    district: e.target.value,
                                }), disabled: loading, placeholder: "District" }), _jsx(Input, { label: "Province", value: formData.province || '', onChange: (e) => setFormData({
                                    ...formData,
                                    province: e.target.value,
                                }), disabled: loading, placeholder: "Province" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-[#E5E7EB]/90 mb-2", children: ["Product ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: formData.product_id || '', onChange: (e) => setFormData({
                                    ...formData,
                                    product_id: e.target.value,
                                }), className: "w-full pr-10 px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed", required: true, disabled: loading, children: [_jsx("option", { value: "", children: "Select a product" }), products.map((product) => (_jsx("option", { value: product.id, children: product.name }, product.id)))] }), _jsx("svg", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 9l-7 7-7-7" }) })] }), products.length === 0 && (_jsx("p", { className: "mt-1 text-xs text-yellow-400", children: "No products available. Please add products first." }))] }), _jsx(Input, { label: "Amount (VND)", type: "text", value: formData.amountDisplay || '', onChange: handleFormattedNumberChange, required: true, disabled: loading, placeholder: "e.g., 20,000,000" }), _jsxs("label", { className: "block text-sm text-white/80", children: ["Payment Method", _jsxs("select", { value: formData.payment_method, onChange: (e) => setFormData((prev) => ({
                            ...prev,
                            payment_method: e.target.value,
                        })), className: "mt-1 w-full h-11 px-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx("option", { value: "COD", children: "COD" }), _jsx("option", { value: "BANK_TRANSFER", children: "Bank" }), _jsx("option", { value: "MOMO", children: "Momo" }), _jsx("option", { value: "ZALO", children: "Zalo" }), _jsx("option", { value: "Credit Cards", children: "Credit Cards" })] })] }), !isEditMode && (_jsx("div", { className: "bg-blue-500/10 border border-blue-500/30 rounded-lg p-3", children: _jsxs("p", { className: "text-sm text-blue-300", children: [_jsx("strong", { children: "Note:" }), ' ', "For COD orders, status will start at", ' ', _jsx("strong", { children: "Pending Review" }), " and risk score will be calculated automatically. For non-COD orders, status will be ", _jsx("strong", { children: "Order Paid" }), " and risk score will be ", _jsx("strong", { children: "N/A" }), "."] }) })), _jsxs("div", { className: "flex gap-3 justify-end mt-6 pt-4 border-t border-[#1E223D]", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onClose, disabled: loading, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "mr-2 animate-spin" }), isEditMode ? 'Updating...' : 'Adding...'] })) : (isEditMode ? 'Update Order' : 'Add Order') })] })] }));
};
