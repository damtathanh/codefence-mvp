import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Order } from '../../types/supabase';

interface CancellationReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    order: Order;
}

const REASON_OPTIONS = [
    { value: 'Đổi shop', label: 'Tôi muốn đổi mua ở shop khác' },
    { value: 'Đổi ý', label: 'Tôi không muốn mua nữa' },
    { value: 'Giá cao', label: 'Tôi thấy giá cao' },
    { value: 'Sai địa chỉ', label: 'Tôi đặt nhầm địa chỉ / thông tin nhận hàng' },
    { value: 'Sai thông tin sản phẩm', label: 'Tôi đặt lộn sản phẩm' },
    { value: 'Khác', label: 'Lý do khác' },
];

export const CancellationReasonModal: React.FC<CancellationReasonModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    order,
}) => {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        const finalReason = selectedReason === 'Khác' ? customReason.trim() : selectedReason;

        if (!finalReason) {
            return; // Don't submit if no reason selected/entered
        }

        setIsSubmitting(true);
        try {
            await onConfirm(finalReason);
            // Reset state
            setSelectedReason('');
            setCustomReason('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason('');
        setCustomReason('');
        onClose();
    };

    const isCustomReasonSelected = selectedReason === 'Khác';
    const canSubmit = selectedReason && (!isCustomReasonSelected || customReason.trim());

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold text-white">
                            Lý do hủy đơn
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Order Info */}
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Mã đơn hàng:</span>
                                <span className="text-white font-mono">#{order.id.slice(0, 8)}</span>
                            </div>
                        </div>

                        {/* Reason Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white/80 mb-3">
                                Chọn lý do hủy đơn (theo lời khách):
                            </label>
                            {REASON_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="cancellation-reason"
                                        value={option.value}
                                        checked={selectedReason === option.value}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        className="w-4 h-4 text-purple-600 bg-slate-700 border-white/20 focus:ring-purple-500 focus:ring-2"
                                    />
                                    <span className="ml-3 text-white/90">{option.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Custom Reason Input */}
                        {isCustomReasonSelected && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Nhập lý do cụ thể:
                                </label>
                                <textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Nhập lý do hủy đơn..."
                                    className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    rows={3}
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!canSubmit || isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};
