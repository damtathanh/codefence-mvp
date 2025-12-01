import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Phone, MapPin, Save, AlertTriangle, ShieldAlert,
    RefreshCw, RotateCcw, Truck, CheckCircle, Ban, Banknote, QrCode
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';
import { RiskBadge } from '../../../components/dashboard/RiskBadge';
import { OrderTimeline } from './OrderTimeline';
import { ORDER_STATUS } from '../../../constants/orderStatus';
import type { Order, OrderEvent } from '../../../types/supabase';
import { RefundModal } from './modals/RefundModal';
import { ReturnModal } from './modals/ReturnModal';
import { ExchangeModal } from './modals/ExchangeModal';

interface OrderSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    orderEvents: OrderEvent[];
    addressForm: { address_detail: string; ward: string; district: string; province: string; };
    isAddressModified: boolean;
    onAddressChange: (field: string, value: string) => void;
    onSaveAddress: () => void;
    blacklistedPhones: Set<string>;
    // Callback props (Handlers) – KHÔNG còn onSuccess
    onApprove: (order: Order) => void;
    onReject: (order: Order, reason: string) => void;
    onMarkDelivered: (order: Order) => void;
    onMarkCompleted: (order: Order) => void;
    onSimulateConfirmed: (order: Order) => void;
    onSimulateCancelled: (order: Order) => void;
    onSimulatePaid: (order: Order) => void;
    onSendQrPaymentLink: (order: Order) => void;
    onOrderUpdated?: () => void;
    onMarkMissed?: (order: Order) => void;
}

export const OrderSidePanel: React.FC<OrderSidePanelProps> = ({
    isOpen, onClose, order, orderEvents, addressForm, isAddressModified,
    onAddressChange, onSaveAddress, blacklistedPhones,
    onApprove, onReject, onMarkDelivered, onMarkCompleted,
    onSimulateConfirmed, onSimulateCancelled, onSimulatePaid, onSendQrPaymentLink,
    onOrderUpdated,
}) => {
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !order || typeof document === 'undefined') return null;

    const isBlacklisted = order.phone && blacklistedPhones.has(order.phone);
    const isCOD = (!order.payment_method || order.payment_method === 'COD');
    const isPrepaid = !isCOD;
    const hasPaid = !!order.paid_at || order.status === ORDER_STATUS.ORDER_PAID;
    const hasQrSent = !!order.qr_sent_at || orderEvents.some(e => e.event_type === 'QR_PAYMENT_LINK_SENT');
    const isLowRiskCOD = isCOD && order.risk_score !== null && order.risk_score <= 30;

    const wrapAction = async (action: () => Promise<void> | void) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await action();
        } finally {
            setTimeout(() => setIsProcessing(false), 500);
        }
    };

    const handleSuccess = () => {
        if (onOrderUpdated) onOrderUpdated();
    };

    // --- BUTTON LOGIC ---
    const renderActionButtons = () => {
        // 1. PREPAID (Thanh toán trước) hoặc ORDER_PAID
        if (isPrepaid || order.status === ORDER_STATUS.ORDER_PAID) {
            if (order.status !== ORDER_STATUS.DELIVERING && order.status !== ORDER_STATUS.COMPLETED) {
                return (
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => wrapAction(() => onMarkDelivered(order))}
                        disabled={isProcessing}
                    >
                        <Truck size={20} className="mr-2" /> Start Delivery
                    </Button>
                );
            }
            if (order.status === ORDER_STATUS.DELIVERING) {
                return (
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => wrapAction(() => onMarkCompleted(order))}
                        disabled={isProcessing}
                    >
                        <CheckCircle size={16} className="mr-2" /> Mark Completed
                    </Button>
                );
            }
            return null;
        }

        // 2. COD - LOW RISK (Approved)
        if (isLowRiskCOD && order.status === ORDER_STATUS.ORDER_APPROVED) {
            return (
                <div className="space-y-3">
                    {/* Chỉ khi CHƯA paid mới hiện Send / Simulate QR */}
                    {!hasPaid && (
                        <>
                            {!hasQrSent ? (
                                <Button
                                    variant="outline"
                                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                                    onClick={() => wrapAction(() => onSendQrPaymentLink(order))}
                                    disabled={isProcessing}
                                >
                                    <QrCode size={20} className="mr-2" /> Confirmation Sending Link
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                                    onClick={() => wrapAction(() => onSimulatePaid(order))}
                                    disabled={isProcessing}
                                >
                                    <Banknote size={20} className="mr-2" /> Simulate QR Paid
                                </Button>
                            )}
                        </>
                    )}

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => wrapAction(() => onMarkDelivered(order))}
                        disabled={isProcessing}
                    >
                        <Truck size={20} className="mr-2" /> Start Delivery
                    </Button>
                </div>
            );
        }

        // 2b. COD - MEDIUM/HIGH RISK (Approved – no Start Delivery)
        if (!isLowRiskCOD && isCOD && order.status === ORDER_STATUS.ORDER_APPROVED) {
            return (
                <div className="space-y-3">
                    {!hasPaid && (
                        <>
                            {!hasQrSent ? (
                                <Button
                                    variant="outline"
                                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                                    onClick={() => wrapAction(() => onSendQrPaymentLink(order))}
                                    disabled={isProcessing}
                                >
                                    <QrCode size={20} className="mr-2" /> Confirmation Sending Link
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                                    onClick={() => wrapAction(() => onSimulatePaid(order))}
                                    disabled={isProcessing}
                                >
                                    <Banknote size={20} className="mr-2" /> Simulate QR Paid
                                </Button>
                            )}
                        </>
                    )}
                </div>
            );
        }

        // 3. COD - PENDING / VERIFICATION
        if (order.status === ORDER_STATUS.PENDING_REVIEW || order.status === ORDER_STATUS.VERIFICATION_REQUIRED) {
            return (
                <div className="flex gap-2">
                    <Button
                        variant="danger"
                        className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all active:scale-[0.98]"
                        onClick={() => wrapAction(() => onReject(order, "Verification Failed"))}
                        disabled={isProcessing}
                    >
                        <Ban size={20} /> Reject
                    </Button>
                    <Button
                        className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]"
                        onClick={() => wrapAction(() => onApprove(order))}
                        disabled={isProcessing}
                    >
                        <CheckCircle size={20} /> Approve
                    </Button>
                </div>
            );
        }

        // 4. CONFIRMATION SENT
        if (order.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT) {
            // 👉 LOW RISK COD: KHÔNG cần Customer Cancel/Confirm, chỉ cho Simulate Paid + Delivery
            if (isLowRiskCOD) {
                return (
                    <div className="space-y-3">
                        {!hasPaid && (
                            <Button
                                variant="outline"
                                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                                onClick={() => wrapAction(() => onSimulatePaid(order))}
                                disabled={isProcessing}
                            >
                                <Banknote size={20} className="mr-2" /> Simulate QR Paid
                            </Button>
                        )}

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => wrapAction(() => onMarkDelivered(order))}
                            disabled={isProcessing}
                        >
                            <Truck size={20} className="mr-2" /> Start Delivery
                        </Button>
                    </div>
                );
            }

            // 👉 Medium / High risk: vẫn giữ flow Customer Cancel / Confirm như cũ
            return (
                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                    <p className="text-xs text-blue-300 font-bold uppercase mb-2 text-center">
                        Customer Response (Zalo)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="danger"
                            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulateCancelled(order))}
                            disabled={isProcessing}
                        >
                            Customer Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulateConfirmed(order))}
                            disabled={isProcessing}
                        >
                            Customer Confirm
                        </Button>
                    </div>
                </div>
            );
        }

        // 5. CUSTOMER CONFIRMED
        if (order.status === ORDER_STATUS.CUSTOMER_CONFIRMED) {
            const allowSimulatePaid = !hasPaid && (!isLowRiskCOD || hasQrSent);

            return (
                <div className="space-y-3">
                    {allowSimulatePaid && (
                        <Button
                            variant="outline"
                            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulatePaid(order))}
                            disabled={isProcessing}
                        >
                            <Banknote size={20} className="mr-2" /> Simulate QR Paid
                        </Button>
                    )}
                    <Button
                        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]"
                        onClick={() => wrapAction(() => onMarkDelivered(order))}
                        disabled={isProcessing}
                    >
                        <Truck size={20} className="mr-2" /> Start Delivery
                    </Button>
                </div>
            );
        }

        // 6. DELIVERING / COMPLETED (COD)
        if (order.status === ORDER_STATUS.DELIVERING || order.status === ORDER_STATUS.COMPLETED) {
            const allowSimulatePaymentReceived = isCOD && !hasPaid;

            return (
                <div className="space-y-2">
                    {allowSimulatePaymentReceived && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulatePaid(order))}
                            disabled={isProcessing}
                        >
                            <Banknote size={20} className="mr-2" />
                            Simulate Payment Received
                        </Button>
                    )}

                    {order.status === ORDER_STATUS.DELIVERING && (
                        <Button
                            size="sm"
                            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]"
                            onClick={() => wrapAction(() => onMarkCompleted(order))}
                            disabled={isProcessing}
                        >
                            <CheckCircle size={20} className="mr-2" /> Mark Completed
                        </Button>
                    )}
                </div>
            );
        }

        return null;
    };

    const riskAnalysis = (() => {
        const riskEvents = orderEvents.filter((evt) => evt.event_type === 'RISK_EVALUATED');
        if (riskEvents.length === 0)
            return { score: order.risk_score ?? null, level: order.risk_level ?? null, reasons: [] };
        const latest = riskEvents[riskEvents.length - 1];
        const payload = (latest.payload_json || {}) as any;
        return {
            score: payload.score ?? order.risk_score ?? null,
            level: payload.level ?? order.risk_level ?? null,
            reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
        };
    })();

    return createPortal(
        <>
            <div className="fixed inset-0 z-[50] flex justify-end">
                <div
                    className="flex-1 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div className="w-[500px] h-full bg-[#131625] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1E223D]/50 flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Order Details</h2>
                            <p className="text-sm text-white/50">
                                ID: {order.order_id || order.id}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <StatusBadge status={order.status} />
                                <div className="text-xs text-white/50 uppercase tracking-wider font-bold">
                                    {isCOD ? 'COD Order' : 'Prepaid Order'}
                                </div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                {renderActionButtons()}
                            </div>
                        </div>

                        {/* CUSTOMER INFO */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                                Customer Information
                            </h3>
                            <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]">
                                        <span className="font-bold">
                                            {order.customer_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[#E5E7EB] font-medium">
                                            {order.customer_name}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                                            <Phone size={14} /> <span>{order.phone}</span>
                                            {isBlacklisted && (
                                                <span className="flex items-center gap-1 text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded text-xs border border-red-400/20">
                                                    <AlertTriangle size={10} /> Blacklisted
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-white/50">
                                            <MapPin size={14} />
                                            <span>Delivery Address</span>
                                        </div>
                                        {isAddressModified && (
                                            <Button
                                                size="sm"
                                                onClick={onSaveAddress}
                                                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                                            >
                                                <Save size={12} className="mr-1" /> Save
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input
                                            placeholder="House number, street..."
                                            value={addressForm.address_detail}
                                            onChange={(e) =>
                                                onAddressChange('address_detail', e.target.value)
                                            }
                                            className="bg-black/20 border-white/10 text-sm"
                                        />
                                        <div className="grid grid-cols-3 gap-2">
                                            <Input
                                                placeholder="Ward"
                                                value={addressForm.ward}
                                                onChange={(e) =>
                                                    onAddressChange('ward', e.target.value)
                                                }
                                                className="bg-black/20 border-white/10 text-sm"
                                            />
                                            <Input
                                                placeholder="District"
                                                value={addressForm.district}
                                                onChange={(e) =>
                                                    onAddressChange('district', e.target.value)
                                                }
                                                className="bg-black/20 border-white/10 text-sm"
                                            />
                                            <Input
                                                placeholder="Province"
                                                value={addressForm.province}
                                                onChange={(e) =>
                                                    onAddressChange('province', e.target.value)
                                                }
                                                className="bg-black/20 border-white/10 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RISK ANALYSIS */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                                Risk Analysis
                            </h3>
                            <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Risk Score</span>
                                    <RiskBadge score={riskAnalysis.score} />
                                </div>
                                {riskAnalysis.reasons.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-xs text-white/50">Risk Factors:</span>
                                        <ul className="space-y-1">
                                            {riskAnalysis.reasons.map((reason, idx) => (
                                                <li
                                                    key={idx}
                                                    className="text-xs text-red-300 flex items-start gap-2"
                                                >
                                                    <ShieldAlert
                                                        size={12}
                                                        className="mt-0.5 flex-shrink-0"
                                                    />
                                                    {typeof reason === 'string' ? (
                                                        <span>{reason}</span>
                                                    ) : (
                                                        <div className="flex justify-between w-full">
                                                            <span>{reason.desc}</span>
                                                            <span className="font-semibold text-rose-300">
                                                                +{reason.score}
                                                            </span>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TIMELINE */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                                Timeline
                            </h3>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <OrderTimeline events={orderEvents} />
                            </div>
                        </div>

                        {/* AFTER-SALE */}
                        <div className="pt-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        if (hasPaid) setShowRefundModal(true);
                                        else setShowReturnModal(true);
                                    }}
                                    className="flex-1 gap-1 text-xs"
                                >
                                    <RotateCcw size={14} /> Return
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setShowExchangeModal(true)}
                                    className="flex-1 gap-1 text-xs"
                                >
                                    <RefreshCw size={14} /> Exchange
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <RefundModal
                isOpen={showRefundModal}
                onClose={() => setShowRefundModal(false)}
                order={order}
                onSuccess={handleSuccess}
                title={hasPaid ? 'Return & Refund' : 'Refund Order'}
            />
            <ReturnModal
                isOpen={showReturnModal}
                onClose={() => setShowReturnModal(false)}
                order={order}
                onSuccess={handleSuccess}
            />
            <ExchangeModal
                isOpen={showExchangeModal}
                onClose={() => setShowExchangeModal(false)}
                order={order}
                onSuccess={handleSuccess}
                isPaid={hasPaid}
            />
        </>,
        document.body
    );
};
