// src/components/orders/CustomerConfirmationModal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Order } from '../../types/supabase';

interface CustomerConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
}

export const CustomerConfirmationModal: React.FC<CustomerConfirmationModalProps> = ({
    isOpen,
    onClose,
    order,
}) => {
    if (!isOpen || !order) return null;

    // Đóng modal khi bấm ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        // Backdrop + click ra ngoài để tắt
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Khung modal – chặn click bubble lên backdrop */}
            <div
                className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">
                        Xác nhận đơn hàng
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 py-5 space-y-5">
                    {/* Message + icon */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
                            <svg
                                className="w-6 h-6 text-green-500"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-1">
                            Đơn hàng đã được khách xác nhận.
                        </h3>
                        <p className="text-sm text-white/60">
                            Dự kiến giao trong 3–5 ngày tới.
                        </p>
                    </div>

                    {/* QR Code */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-40 h-40 bg-slate-900 flex items-center justify-center border-2 border-dashed border-white/20">
                                <div className="text-center">
                                    <svg
                                        className="w-12 h-12 text-white/40 mx-auto mb-2"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                        <path d="M14 14h.01" />
                                        <path d="M18 14h3v3" />
                                        <path d="M14 18h3v3" />
                                    </svg>
                                    <p className="text-sm text-white/70 font-medium">
                                        QR Code
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-white/60 text-center">
                                Quét mã QR để thanh toán và nhận chiết khấu 5%.
                            </p>
                        </div>
                    </div>

                    {/* Order info */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-lg p-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/60">Mã đơn hàng:</span>
                            <span className="text-white font-medium">
                                #{order.order_id}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Tổng tiền:</span>
                            <span className="text-white font-semibold">
                                {order.amount?.toLocaleString('vi-VN')} ₫
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-white/10">
                    <Button onClick={onClose} className="w-full">
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
};
