import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { processReturn } from '../../services/ordersService';
import type { Order } from '../../../../types/supabase';
import { useAuth } from '../../../../features/auth'; // 👈 THÊM DÒNG NÀY

interface ReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    onSuccess: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, order, onSuccess }) => {
    const { user } = useAuth(); // 👈 LẤY user TỪ AUTH

    const [payer, setPayer] = useState<'customer' | 'shop'>('customer');
    const [customerAmount, setCustomerAmount] = useState<string>('25000');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const custAmount = parseInt(customerAmount.replace(/[^0-9]/g, ''), 10) || 0;

            // Nếu shop trả, customerAmount luôn = 0
            const finalCustomerAmount = payer === 'shop' ? 0 : custAmount;
            const finalShopAmount = 0; // vẫn giữ logic hiện tại của ông

            // 👇 TRUYỀN user.id VÀO THEO SIGNATURE MỚI: (userId, orderId, ...)
            await processReturn(
                user.id,
                order.id,
                payer === 'customer',
                finalCustomerAmount,
                finalShopAmount,
                note
            );

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Return failed:', err);
            setError(err.message || 'Failed to process return');
        } finally {
            setLoading(false);
        }
    };

    const handlePayerChange = (newPayer: 'customer' | 'shop') => {
        setPayer(newPayer);
        if (newPayer === 'shop') {
            setCustomerAmount('0');
        } else {
            setCustomerAmount('25000');
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#131625] border border-white/10 rounded-xl shadow-2xl z-[61] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Return Order</h2>
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

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <label className="block text-sm font-medium text-white/70 mb-1">Customer Pays (VND)</label>
                        <Input
                            type="number"
                            value={customerAmount}
                            onChange={(e) => setCustomerAmount(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                            disabled={payer === 'shop'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">Reason / Note</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] resize-none"
                            placeholder="Reason for return..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Return'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
};
