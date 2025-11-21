import React from 'react';
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
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={onClose}
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
                            Xác nhận đơn hàng
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Message */}
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                                <svg
                                    className="w-8 h-8 text-green-500"
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
                            <p className="text-white/90 text-lg mb-2">
                                Đơn hàng đã được khách xác nhận.
                            </p>
                            <p className="text-white/60">
                                Dự kiến giao trong 3–5 ngày tới.
                            </p>
                        </div>

                        {/* QR Code Placeholder */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-8">
                            <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="w-48 h-48 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20">
                                    <div className="text-center">
                                        <svg
                                            className="w-16 h-16 text-white/40 mx-auto mb-2"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <rect x="3" y="3" width="7" height="7" />
                                            <rect x="14" y="3" width="7" height="7" />
                                            <rect x="14" y="14" width="7" height="7" />
                                            <rect x="3" y="14" width="7" height="7" />
                                        </svg>
                                        <p className="text-white/40 text-sm font-medium">QR Code</p>
                                    </div>
                                </div>
                                <p className="text-white/60 text-sm">
                                    Mã QR thanh toán (placeholder)
                                </p>
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className="bg-slate-800/30 border border-white/5 rounded-lg p-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-white/60">Mã đơn hàng:</span>
                                <span className="text-white font-mono">#{order.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Tổng tiền:</span>
                                <span className="text-white font-semibold">
                                    {order.amount?.toLocaleString('vi-VN')} ₫
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10">
                        <Button
                            onClick={onClose}
                            className="w-full"
                        >
                            Đóng
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};
