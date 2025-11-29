import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Phone, MapPin, CreditCard, Save, AlertTriangle, ShieldAlert,
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
    // Handlers with onSuccess callback
    onApprove: (order: Order, onSuccess: () => void) => void;
    onReject: (order: Order, reason: string, onSuccess: () => void) => void;
    onMarkDelivered: (order: Order, onSuccess: () => void) => void;
    onMarkCompleted: (order: Order, onSuccess: () => void) => void;
    onSimulateConfirmed: (order: Order, onSuccess: () => void) => void;
    onSimulateCancelled: (order: Order, onSuccess: () => void) => void;
    onSimulatePaid: (order: Order, onSuccess: () => void) => void;
    onSendQrPaymentLink: (order: Order, onSuccess: () => void) => void;
    onOrderUpdated?: () => void;
    // Optional legacy props (can be ignored or removed if not used)
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

    // Check if QR was sent (either by timestamp or event log)
    const hasQrSent = !!order.qr_sent_at || orderEvents.some(e => e.event_type === 'QR_PAYMENT_LINK_SENT');

    // Helper to wrap async actions and prevent double clicks
    const wrapAction = async (action: () => void) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await action();
        } finally {
            // Small delay to prevent flickering
            setTimeout(() => setIsProcessing(false), 500);
        }
    };

    // --- LOGIC HIỂN THỊ NÚT BẤM ---
    const renderActionButtons = () => {
        // CASE 1: PREPAID (Đã thanh toán trước)
        // Status: Order Paid -> Delivering -> Completed
        if (isPrepaid || order.status === ORDER_STATUS.ORDER_PAID) {
            // Chưa giao -> Start Delivery
            if (order.status !== ORDER_STATUS.DELIVERING && order.status !== ORDER_STATUS.COMPLETED) {
                return (
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => wrapAction(() => onMarkDelivered(order, onClose))}
                        disabled={isProcessing}
                    >
                        <Truck size={20} className="mr-2" /> Start Delivery
                    </Button>
                );
            }
            // Đang giao -> Completed
            if (order.status === ORDER_STATUS.DELIVERING) {
                return (
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => wrapAction(() => onMarkCompleted(order, onClose))}
                        disabled={isProcessing}
                    >
                        <CheckCircle size={16} className="mr-2" /> Mark Completed
                    </Button>
                );
            }
            // Completed -> No main actions (Only after-sale actions below)
            return null;
        }

        // CASE 2: COD - LOW RISK (Approved automatically)
        // Status: Order Approved -> (Send QR) -> (Simulate Paid) -> Start Delivery
        if (isCOD && order.risk_score !== null && order.risk_score <= 30 && order.status === ORDER_STATUS.ORDER_APPROVED) {
            return (
                <div className="space-y-3">
                    {/* QR Logic: Send -> Simulate Paid */}
                    {!hasQrSent ? (
                        <Button
                            variant="outline" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSendQrPaymentLink(order, () => { }))} // Keep open
                            disabled={isProcessing}
                        >
                            <QrCode size={20} className="mr-2" /> Send QR Payment Link
                        </Button>
                    ) : !hasPaid && (
                        <Button
                            variant="outline" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulatePaid(order, onClose))}
                            disabled={isProcessing}
                        >
                            <Banknote size={20} className="mr-2" /> Simulate QR Paid
                        </Button>
                    )}

                    {/* Delivery Logic */}
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => wrapAction(() => onMarkDelivered(order, onClose))}
                        disabled={isProcessing}
                    >
                        <Truck size={20} className="mr-2" /> Start Delivery
                    </Button>
                </div>
            );
        }

        // CASE 3: COD - HIGH/MEDIUM RISK
        // A. Pending Review -> Reject / Approve
        if (order.status === ORDER_STATUS.PENDING_REVIEW || order.status === ORDER_STATUS.VERIFICATION_REQUIRED) {
            return (
                <div className="flex gap-2">
                    <Button
                        variant="danger" className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-200 active:scale-[0.98]"
                        onClick={() => onReject(order, "Verification Failed", onClose)} // Triggers modal in parent logic
                        disabled={isProcessing}
                    >
                        <Ban size={20} /> Reject
                    </Button>
                    <Button
                        className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all duration-200 active:scale-[0.98]"
                        onClick={() => wrapAction(() => onApprove(order, onClose))}
                        disabled={isProcessing}
                    >
                        <CheckCircle size={20} /> Approve
                    </Button>
                </div>
            );
        }

        // B. Confirmation Sent -> Confirm / Cancel
        if (order.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT) {
            return (
                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                    <p className="text-xs text-blue-300 font-bold uppercase mb-2 text-center">Customer Response (Zalo)</p>
                    <div className="flex gap-2">
                        <Button
                            size="sm" variant="danger" className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => onSimulateCancelled(order, onClose)} // Triggers modal
                            disabled={isProcessing}
                        >
                            Customer Cancel
                        </Button>
                        <Button
                            size="sm" className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulateConfirmed(order, onClose))}
                            disabled={isProcessing}
                        >
                            Customer Confirm
                        </Button>
                    </div>
                </div>
            );
        }

        // C. Customer Confirmed -> Simulate Paid / Delivery
        if (order.status === ORDER_STATUS.CUSTOMER_CONFIRMED) {
            return (
                <div className="space-y-3">
                    {!hasPaid && (
                        <Button
                            variant="outline" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulatePaid(order, onClose))}
                            disabled={isProcessing}
                        >
                            <Banknote size={20} className="mr-2" /> Simulate QR Paid
                        </Button>
                    )}
                    <Button
                        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all duration-200 active:scale-[0.98]"
                        onClick={() => wrapAction(() => onMarkDelivered(order, onClose))}
                        disabled={isProcessing}
                    >
                        <Truck size={20} className="mr-2" /> Start Delivery
                    </Button>
                </div>
            );
        }

        // D. Delivering / Completed -> Late Payment Check (COD only)
        // If Delivering or Completed, allow payment mark if not paid yet
        if (order.status === ORDER_STATUS.DELIVERING || order.status === ORDER_STATUS.COMPLETED) {
            return (
                <div className="space-y-2">
                    {!hasPaid && isCOD && (
                        <Button
                            variant="outline" size="sm" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => wrapAction(() => onSimulatePaid(order, onClose))}
                            disabled={isProcessing}
                        >
                            <Banknote size={20} className="mr-2" /> Simulate Payment Received
                        </Button>
                    )}
                    {order.status === ORDER_STATUS.DELIVERING && (
                        <Button
                            size="sm" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all duration-200 active:scale-[0.98]"
                            onClick={() => wrapAction(() => onMarkCompleted(order, onClose))}
                            disabled={isProcessing}
                        >
                            <CheckCircle size={20} className="mr-2" /> Mark Completed
                        </Button>
                    )}
                </div>
            );
        }

        return null; // Default fallback
    };

    const handleSuccess = () => {
        if (onOrderUpdated) onOrderUpdated();
    };

    const getLatestRiskEvent = () => {
        const riskEvents = orderEvents.filter((evt) => evt.event_type === 'RISK_EVALUATED');
        if (riskEvents.length === 0) {
            return { score: order.risk_score ?? null, level: order.risk_level ?? null, reasons: [] };
        }
        const latest = riskEvents[riskEvents.length - 1];
        const payload = (latest.payload_json || {}) as any;
        return {
            score: payload.score ?? order.risk_score ?? null,
            level: payload.level ?? order.risk_level ?? null,
            reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
        };
    };

    const riskAnalysis = getLatestRiskEvent();

    return createPortal(
        <>
            <div className="fixed inset-0 z-[50] flex justify-end">
                <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="w-[500px] h-full bg-[#131625] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1E223D]/50 flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Order Details</h2>
                            <p className="text-sm text-white/50">ID: {order.order_id || order.id}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                        {/* MAIN ACTIONS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <StatusBadge status={order.status} />
                                <div className="text-xs text-white/50 uppercase tracking-wider font-bold">
                                    {isCOD ? "COD Order" : "Prepaid Order"}
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
                                            <Phone size={14} />
                                            <span>{order.phone}</span>
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
                                                <Save size={12} className="mr-1" />
                                                Save
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
                                        <span className="text-xs text-white/50">
                                            Risk Factors:
                                        </span>
                                        <ul className="space-y-1">
                                            {riskAnalysis.reasons.map((reason, idx) => {
                                                if (typeof reason === 'string') {
                                                    return (
                                                        <li
                                                            key={idx}
                                                            className="text-xs text-red-300 flex items-start gap-2"
                                                        >
                                                            <ShieldAlert
                                                                size={12}
                                                                className="mt-0.5 flex-shrink-0"
                                                            />
                                                            <span>{reason}</span>
                                                        </li>
                                                    );
                                                }

                                                if (reason && typeof reason === 'object') {
                                                    return (
                                                        <li
                                                            key={idx}
                                                            className="text-xs text-red-300 flex items-start gap-2"
                                                        >
                                                            <ShieldAlert
                                                                size={12}
                                                                className="mt-0.5 flex-shrink-0"
                                                            />
                                                            <div className="flex justify-between w-full">
                                                                <span>{reason.desc}</span>
                                                                {typeof reason.score === 'number' && (
                                                                    <span className="font-semibold text-rose-300">
                                                                        {reason.score > 0
                                                                            ? `+${reason.score}`
                                                                            : reason.score}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                }

                                                return null;
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TIMELINE */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Timeline</h3>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <OrderTimeline events={orderEvents} />
                            </div>
                        </div>

                        {/* AFTER-SALE ACTIONS */}
                        <div className="pt-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => { if (hasPaid) setShowRefundModal(true); else setShowReturnModal(true); }} className="flex-1 gap-1 text-xs">
                                    <RotateCcw size={14} /> Return
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowExchangeModal(true)} className="flex-1 gap-1 text-xs">
                                    <RefreshCw size={14} /> Exchange
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <RefundModal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} order={order} onSuccess={handleSuccess} title={hasPaid ? 'Return & Refund' : 'Refund Order'} />
            <ReturnModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} order={order} onSuccess={handleSuccess} />
            <ExchangeModal isOpen={showExchangeModal} onClose={() => setShowExchangeModal(false)} order={order} onSuccess={handleSuccess} isPaid={hasPaid} />
        </>,
        document.body
    );
};