import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { processExchange, processRefund } from '../../services/ordersService';
import { fetchProductsByUser } from '../../../products/services/productsService';
import { useAuth } from '../../../auth';
import type { Product, Order } from '../../../../types/supabase';

interface ExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    onSuccess: () => void;
    isPaid: boolean;
}

export const ExchangeModal: React.FC<ExchangeModalProps> = ({
    isOpen,
    onClose,
    order,
    onSuccess,
    isPaid,
}) => {
    const { user } = useAuth();
    const [payer, setPayer] = useState<'customer' | 'shop'>('customer');
    const [customerAmount, setCustomerAmount] = useState<string>('50000');
    const [note, setNote] = useState('');
    const [refundAmount, setRefundAmount] = useState<string>(order.amount.toString());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Product Selection State
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>(order.product_id || '');
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Fetch products on mount
    React.useEffect(() => {
        if (isOpen && user) {
            setLoadingProducts(true);
            fetchProductsByUser(user.id, 1, 100, {}) // Fetch first 100 products for now
                .then(({ products }) => {
                    setProducts(products);
                    // Ensure current product is selected if valid
                    if (order.product_id) {
                        setSelectedProductId(order.product_id);
                    } else if (products.length > 0 && !selectedProductId) {
                        setSelectedProductId(products[0].id);
                    }
                })
                .catch(err => console.error('Failed to fetch products', err))
                .finally(() => setLoadingProducts(false));
        }
    }, [isOpen, user, order.product_id, selectedProductId]);

    if (!isOpen) return null;

    const handlePayerChange = (newPayer: 'customer' | 'shop') => {
        setPayer(newPayer);
        if (newPayer === 'shop') {
            setCustomerAmount('25000');
        } else {
            setCustomerAmount('50000');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const custAmount = parseInt(customerAmount.replace(/[^0-9]/g, ''), 10) || 0;
            const finalShopAmount = 0;

            if (isPaid) {
                const refundVal = parseInt(refundAmount.replace(/[^0-9]/g, ''), 10);
                if (isNaN(refundVal) || refundVal <= 0) {
                    throw new Error('Invalid refund amount');
                }

                // 👇 DÙNG user.id THEO SIGNATURE MỚI processRefund(userId, orderId, ...)
                await processRefund(user.id, order.id, refundVal, `Refund for Exchange: ${note}`);
            }

            // processExchange hiện tại vẫn dùng signature cũ: (orderId, ...)
            await processExchange(
                order.id,
                payer === 'customer',
                custAmount,
                finalShopAmount,
                note,
                selectedProductId
            );

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Exchange failed:', err);
            setError(err.message || 'Failed to process exchange');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#131625] border border-white/10 rounded-xl shadow-2xl z-[61] p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Exchange Order</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-xs">
                    This will create a new order and record shipping costs.
                    {isPaid && ' The original order will be refunded.'}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Exchange For Product
                        </label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                            required
                            disabled={loadingProducts}
                        >
                            <option value="" disabled>
                                Select a product
                            </option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} -{' '}
                                    {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                    }).format(p.price)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isPaid && (
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">
                                Refund Amount (VND)
                            </label>
                            <Input
                                type="number"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                                required
                            />
                            <p className="text-xs text-white/40 mt-1">
                                Refund original order amount before creating new one.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Who pays return shipping?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handlePayerChange('customer')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${payer === 'customer'
                                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                    }`}
                            >
                                Customer
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePayerChange('shop')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${payer === 'shop'
                                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                    }`}
                            >
                                Shop (Free Return)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Customer Pays (VND)
                        </label>
                        <Input
                            type="number"
                            value={customerAmount}
                            onChange={(e) => setCustomerAmount(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                        <p className="text-xs text-white/40 mt-1">
                            {payer === 'customer'
                                ? 'Includes Return (25k) + New Outbound (25k)'
                                : 'Includes New Outbound (25k) only'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Reason / Note
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] resize-none"
                            placeholder="Reason for exchange..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Exchange'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
};
