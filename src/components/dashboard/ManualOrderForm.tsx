import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../features/auth';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../utils/logUserAction';
import { generateChanges } from '../../utils/generateChanges';
import type { Product, Order } from '../../types/supabase';
import type { OrderInput } from '../../hooks/useOrders';
import { evaluateRisk } from '../../utils/riskEngine';
import { fetchPastOrdersByPhone } from '../../features/orders/services/ordersService';
import { fetchCustomerBlacklist } from '../../features/customers/services/customersService';
import { insertOrderEvent } from '../../features/orders/services/orderEventsService';
import type { RiskInput } from '../../utils/riskEngine';
import { markInvoicePaidForOrder } from '../../features/invoices/services/invoiceService';
import { ORDER_STATUS } from '../../constants/orderStatus';

interface ManualOrderFormProps {
    editingOrder?: Order | null;
    onClose: () => void;
    onSuccess?: () => void;
    products: Product[];
}

export const ManualOrderForm: React.FC<ManualOrderFormProps> = ({
    editingOrder,
    onClose,
    onSuccess,
    products,
}) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();
    const isEditMode = !!editingOrder;

    // Manual entry form state
    const [formData, setFormData] = useState<Partial<OrderInput & { amountDisplay: string }>>({
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
            // Populate form with existing order data
            const formattedAmount = editingOrder.amount ? Number(editingOrder.amount).toLocaleString('en-US') : '';
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
    const handleFormattedNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^\d]/g, ''); // remove non-digits
        const formatted = value ? Number(value).toLocaleString('en-US') : '';
        setFormData({ ...formData, amountDisplay: formatted });
    };

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
                    payment_method: editingOrder.payment_method || 'COD',
                };

                const fullAddress = [
                    formData.address_detail,
                    formData.ward,
                    formData.district,
                    formData.province
                ].filter(Boolean).map(s => s?.trim()).filter(s => s && s.length > 0).join(', ');

                const updateData = {
                    order_id: formData.order_id?.trim() || '',
                    customer_name: formData.customer_name?.trim() || '',
                    phone: formData.phone?.trim() || '',
                    address: fullAddress,
                    product: newProduct?.name || 'N/A',
                    amount: numericAmount,
                    payment_method: formData.payment_method || 'COD',
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
                        address: fullAddress || null,
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

                const fullAddress = [
                    formData.address_detail,
                    formData.ward,
                    formData.district,
                    formData.province
                ].filter(Boolean).map(s => s?.trim()).filter(s => s && s.length > 0).join(', ');

                const orderData: OrderInput = {
                    order_id: formData.order_id || '',
                    customer_name: formData.customer_name || '',
                    phone: formData.phone || '',
                    address: fullAddress || null,
                    address_detail: formData.address_detail || null,
                    ward: formData.ward || null,
                    district: formData.district || null,
                    province: formData.province || null,
                    product_id: formData.product_id || null,
                    product: productName, // Store product name
                    amount: numericAmount,
                    payment_method: formData.payment_method || "COD",
                };

                // Validate order
                const validationError = validateManualOrder(orderData);
                if (validationError) {
                    showError(validationError);
                    setLoading(false);
                    return;
                }

                // Calculate risk for COD orders
                let riskScore: number | null = null;
                let riskLevel: string | null = null;
                let riskVersion: string | null = null;
                let riskReasons: any[] = [];

                const paymentMethod = (orderData.payment_method || 'COD').toUpperCase();

                // Only calculate risk for COD
                if (paymentMethod === 'COD') {
                    try {
                        // 1. Fetch blacklist
                        if (user) {
                            const { data: blacklistData } = await fetchCustomerBlacklist(user.id);
                            const blacklistSet = new Set((blacklistData || []).map(b => b.phone));

                            // 2. Fetch past orders
                            const { data: pastOrders } = await fetchPastOrdersByPhone(user.id, orderData.phone);

                            // 3. Evaluate risk
                            const riskInput: RiskInput = {
                                paymentMethod: 'COD',
                                amountVnd: numericAmount,
                                phone: orderData.phone,
                                address: orderData.address,
                                pastOrders: pastOrders || [],
                                productName: productName,
                            };

                            const riskOutput = evaluateRisk(riskInput, blacklistSet);

                            riskScore = riskOutput.score;
                            riskLevel = riskOutput.level;
                            riskVersion = riskOutput.version || null;
                            riskReasons = riskOutput.reasons;
                        }
                    } catch (err) {
                        console.error('Error calculating risk:', err);
                        // Continue without risk score if calculation fails
                    }
                }

                // Insert order directly via Supabase
                const isCod = paymentMethod === 'COD';

                const initialStatus = isCod
                    ? ORDER_STATUS.PENDING_REVIEW           // "Pending Review"
                    : ORDER_STATUS.ORDER_PAID;              // "Order Paid"

                const { data: newOrder, error: insertError } = await supabase
                    .from("orders")
                    .insert({
                        user_id: user?.id,
                        order_id: orderData.order_id,
                        customer_name: orderData.customer_name,
                        phone: orderData.phone,
                        address: orderData.address,
                        address_detail: orderData.address_detail,
                        ward: orderData.ward,
                        district: orderData.district,
                        province: orderData.province,
                        product_id: orderData.product_id,
                        product: productName, // Store product name
                        amount: orderData.amount,
                        payment_method: orderData.payment_method,
                        status: initialStatus,
                        risk_score: isCod ? riskScore : null,
                        risk_level: isCod ? riskLevel : null,
                        order_date: new Date().toISOString().split('T')[0],
                        // risk_version: riskVersion, // Uncomment if column exists, otherwise skip
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Log risk event if we have reasons
                if (newOrder && riskReasons.length > 0) {
                    await insertOrderEvent({
                        order_id: newOrder.id,
                        event_type: 'RISK_EVALUATED',
                        payload_json: {
                            score: riskScore,
                            level: riskLevel,
                            reasons: riskReasons,
                            version: riskVersion
                        }
                    });
                }

                // Log user action
                if (user && newOrder) {
                    await logUserAction({
                        userId: user.id,
                        action: 'Create Order',
                        status: 'success',
                        orderId: newOrder.order_id ?? "",
                    });

                    // Create invoice for non-COD orders
                    const pm = newOrder.payment_method?.toUpperCase() || 'COD';
                    if (pm !== 'COD') {
                        await markInvoicePaidForOrder(newOrder);
                    }
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

    return (
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
            <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-sm font-medium text-white/80">Address Details</div>
                <Input
                    label="Address Number"
                    value={formData.address_detail || ''}
                    onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })}
                    required
                    disabled={loading}
                    placeholder="House number, street..."
                />
                <div className="grid grid-cols-3 gap-3">
                    <Input
                        label="Ward"
                        value={formData.ward || ''}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                        disabled={loading}
                        placeholder="Ward"
                    />
                    <Input
                        label="District"
                        value={formData.district || ''}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        disabled={loading}
                        placeholder="District"
                    />
                    <Input
                        label="Province"
                        value={formData.province || ''}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        disabled={loading}
                        placeholder="Province"
                    />
                </div>
            </div>
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
            <label className="block text-sm text-white/80">
                Payment Method
                <select
                    value={formData.payment_method}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, payment_method: e.target.value }))
                    }
                    className="mt-1 w-full h-10 px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                >
                    <option value="COD">COD</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MOMO">Momo</option>
                    <option value="ZALO">Zalo</option>
                    <option value="Credit Cards">Credit Cards</option>
                </select>
            </label>
            {!isEditMode && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                        <strong>Note:</strong>{' '}
                        For COD orders, status will start at <strong>Pending Review</strong> and risk score will be calculated automatically.
                        For non-COD orders, status will be <strong>Order Paid</strong> and risk score will be <strong>N/A</strong>.
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
    );
};
