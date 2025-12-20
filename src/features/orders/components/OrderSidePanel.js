import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, MapPin, Save, AlertTriangle, ShieldAlert, RefreshCw, RotateCcw, Truck, CheckCircle, Ban, Banknote, QrCode } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';
import { RiskBadge } from '../../../components/dashboard/RiskBadge';
import { OrderTimeline } from './OrderTimeline';
import { ORDER_STATUS } from '../../../constants/orderStatus';
import { RefundModal } from './modals/RefundModal';
import { ReturnModal } from './modals/ReturnModal';
import { ExchangeModal } from './modals/ExchangeModal';
export const OrderSidePanel = ({ isOpen, onClose, order, orderEvents, addressForm, isAddressModified, onAddressChange, onSaveAddress, blacklistedPhones, onApprove, onReject, onMarkDelivered, onMarkCompleted, onSimulateConfirmed, onSimulateCancelled, onSimulatePaid, onSendQrPaymentLink, onOrderUpdated, }) => {
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    if (!isOpen || !order || typeof document === 'undefined')
        return null;
    const isBlacklisted = order.phone && blacklistedPhones.has(order.phone);
    const isCOD = (!order.payment_method || order.payment_method === 'COD');
    const isPrepaid = !isCOD;
    const hasPaid = !!order.paid_at || order.status === ORDER_STATUS.ORDER_PAID;
    const hasQrSent = !!order.qr_sent_at || orderEvents.some(e => e.event_type === 'QR_PAYMENT_LINK_SENT');
    const isLowRiskCOD = isCOD && order.risk_score !== null && order.risk_score <= 30;
    const wrapAction = async (action) => {
        if (isProcessing)
            return;
        setIsProcessing(true);
        try {
            await action();
        }
        finally {
            setTimeout(() => setIsProcessing(false), 500);
        }
    };
    const handleSuccess = () => {
        if (onOrderUpdated)
            onOrderUpdated();
    };
    // --- BUTTON LOGIC ---
    const renderActionButtons = () => {
        // 1. PREPAID (Thanh toán trước) hoặc ORDER_PAID
        if (isPrepaid || order.status === ORDER_STATUS.ORDER_PAID) {
            if (order.status !== ORDER_STATUS.DELIVERING && order.status !== ORDER_STATUS.COMPLETED) {
                return (_jsxs(Button, { className: "w-full bg-blue-600 hover:bg-blue-700", onClick: () => wrapAction(() => onMarkDelivered(order)), disabled: isProcessing, children: [_jsx(Truck, { size: 20, className: "mr-2" }), " Start Delivery"] }));
            }
            if (order.status === ORDER_STATUS.DELIVERING) {
                return (_jsxs(Button, { className: "w-full bg-green-600 hover:bg-green-700", onClick: () => wrapAction(() => onMarkCompleted(order)), disabled: isProcessing, children: [_jsx(CheckCircle, { size: 16, className: "mr-2" }), " Mark Completed"] }));
            }
            return null;
        }
        // 2. COD - LOW RISK (Approved)
        if (isLowRiskCOD && order.status === ORDER_STATUS.ORDER_APPROVED) {
            return (_jsxs("div", { className: "space-y-3", children: [!hasPaid && (_jsx(_Fragment, { children: !hasQrSent ? (_jsxs(Button, { variant: "outline", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSendQrPaymentLink(order)), disabled: isProcessing, children: [_jsx(QrCode, { size: 20, className: "mr-2" }), " Confirmation Sending Link"] })) : (_jsxs(Button, { variant: "outline", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulatePaid(order)), disabled: isProcessing, children: [_jsx(Banknote, { size: 20, className: "mr-2" }), " Simulate QR Paid"] })) })), _jsxs(Button, { className: "w-full bg-blue-600 hover:bg-blue-700", onClick: () => wrapAction(() => onMarkDelivered(order)), disabled: isProcessing, children: [_jsx(Truck, { size: 20, className: "mr-2" }), " Start Delivery"] })] }));
        }
        // 2b. COD - MEDIUM/HIGH RISK (Approved – no Start Delivery)
        if (!isLowRiskCOD && isCOD && order.status === ORDER_STATUS.ORDER_APPROVED) {
            return (_jsx("div", { className: "space-y-3", children: !hasPaid && (_jsx(_Fragment, { children: !hasQrSent ? (_jsxs(Button, { variant: "outline", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSendQrPaymentLink(order)), disabled: isProcessing, children: [_jsx(QrCode, { size: 20, className: "mr-2" }), " Confirmation Sending Link"] })) : (_jsxs(Button, { variant: "outline", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulatePaid(order)), disabled: isProcessing, children: [_jsx(Banknote, { size: 20, className: "mr-2" }), " Simulate QR Paid"] })) })) }));
        }
        // 3. COD - PENDING / VERIFICATION
        if (order.status === ORDER_STATUS.PENDING_REVIEW || order.status === ORDER_STATUS.VERIFICATION_REQUIRED) {
            return (_jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "danger", className: "flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onReject(order, "Verification Failed")), disabled: isProcessing, children: [_jsx(Ban, { size: 20 }), " Reject"] }), _jsxs(Button, { className: "flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onApprove(order)), disabled: isProcessing, children: [_jsx(CheckCircle, { size: 20 }), " Approve"] })] }));
        }
        // 4. CONFIRMATION SENT
        if (order.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT) {
            // 👉 LOW RISK COD: KHÔNG cần Customer Cancel/Confirm, chỉ cho Simulate Paid + Delivery
            if (isLowRiskCOD) {
                return (_jsxs("div", { className: "space-y-3", children: [!hasPaid && (_jsxs(Button, { variant: "outline", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulatePaid(order)), disabled: isProcessing, children: [_jsx(Banknote, { size: 20, className: "mr-2" }), " Simulate QR Paid"] })), _jsxs(Button, { className: "w-full bg-blue-600 hover:bg-blue-700", onClick: () => wrapAction(() => onMarkDelivered(order)), disabled: isProcessing, children: [_jsx(Truck, { size: 20, className: "mr-2" }), " Start Delivery"] })] }));
            }
            // 👉 Medium / High risk: vẫn giữ flow Customer Cancel / Confirm như cũ
            return (_jsxs("div", { className: "bg-blue-500/10 p-3 rounded-lg border border-blue-500/30", children: [_jsx("p", { className: "text-xs text-blue-300 font-bold uppercase mb-2 text-center", children: "Customer Response (Zalo)" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "danger", className: "flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulateCancelled(order)), disabled: isProcessing, children: "Customer Cancel" }), _jsx(Button, { size: "sm", className: "flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulateConfirmed(order)), disabled: isProcessing, children: "Customer Confirm" })] })] }));
        }
        // 5. CUSTOMER CONFIRMED
        if (order.status === ORDER_STATUS.CUSTOMER_CONFIRMED) {
            const allowSimulatePaid = !hasPaid && (!isLowRiskCOD || hasQrSent);
            return (_jsxs("div", { className: "space-y-3", children: [allowSimulatePaid && (_jsxs(Button, { variant: "outline", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulatePaid(order)), disabled: isProcessing, children: [_jsx(Banknote, { size: 20, className: "mr-2" }), " Simulate QR Paid"] })), _jsxs(Button, { className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onMarkDelivered(order)), disabled: isProcessing, children: [_jsx(Truck, { size: 20, className: "mr-2" }), " Start Delivery"] })] }));
        }
        // 6. DELIVERING / COMPLETED (COD)
        if (order.status === ORDER_STATUS.DELIVERING || order.status === ORDER_STATUS.COMPLETED) {
            const allowSimulatePaymentReceived = isCOD && !hasPaid;
            return (_jsxs("div", { className: "space-y-2", children: [allowSimulatePaymentReceived && (_jsxs(Button, { variant: "outline", size: "sm", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onSimulatePaid(order)), disabled: isProcessing, children: [_jsx(Banknote, { size: 20, className: "mr-2" }), "Simulate Payment Received"] })), order.status === ORDER_STATUS.DELIVERING && (_jsxs(Button, { size: "sm", className: "w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5b5eed] hover:to-[#7c53e6] text-white shadow-lg shadow-[#6366F1]/20 transition-all active:scale-[0.98]", onClick: () => wrapAction(() => onMarkCompleted(order)), disabled: isProcessing, children: [_jsx(CheckCircle, { size: 20, className: "mr-2" }), " Mark Completed"] }))] }));
        }
        return null;
    };
    const riskAnalysis = (() => {
        const riskEvents = orderEvents.filter((evt) => evt.event_type === 'RISK_EVALUATED');
        if (riskEvents.length === 0)
            return { score: order.risk_score ?? null, level: order.risk_level ?? null, reasons: [] };
        const latest = riskEvents[riskEvents.length - 1];
        const payload = (latest.payload_json || {});
        return {
            score: payload.score ?? order.risk_score ?? null,
            level: payload.level ?? order.risk_level ?? null,
            reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
        };
    })();
    return createPortal(_jsxs(_Fragment, { children: [_jsxs("div", { className: "fixed inset-0 z-[50] flex justify-end", children: [_jsx("div", { className: "flex-1 bg-black/60 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "w-[500px] h-full bg-[#131625] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1E223D]/50 flex-shrink-0", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Order Details" }), _jsxs("p", { className: "text-sm text-white/50", children: ["ID: ", order.order_id || order.id] })] }), _jsx("button", { onClick: onClose, className: "p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-6 space-y-8", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(StatusBadge, { status: order.status }), _jsx("div", { className: "text-xs text-white/50 uppercase tracking-wider font-bold", children: isCOD ? 'COD Order' : 'Prepaid Order' })] }), _jsx("div", { className: "p-4 bg-white/5 rounded-xl border border-white/10", children: renderActionButtons() })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-medium text-white/70 uppercase tracking-wider", children: "Customer Information" }), _jsxs("div", { className: "bg-white/5 rounded-xl p-4 space-y-4 border border-white/10", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]", children: _jsx("span", { className: "font-bold", children: order.customer_name.charAt(0).toUpperCase() }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[#E5E7EB] font-medium", children: order.customer_name }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-white/50 mt-1", children: [_jsx(Phone, { size: 14 }), " ", _jsx("span", { children: order.phone }), isBlacklisted && (_jsxs("span", { className: "flex items-center gap-1 text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded text-xs border border-red-400/20", children: [_jsx(AlertTriangle, { size: 10 }), " Blacklisted"] }))] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-white/50", children: [_jsx(MapPin, { size: 14 }), _jsx("span", { children: "Delivery Address" })] }), isAddressModified && (_jsxs(Button, { size: "sm", onClick: onSaveAddress, className: "h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border-0", children: [_jsx(Save, { size: 12, className: "mr-1" }), " Save"] }))] }), _jsxs("div", { className: "grid grid-cols-1 gap-2", children: [_jsx(Input, { placeholder: "House number, street...", value: addressForm.address_detail, onChange: (e) => onAddressChange('address_detail', e.target.value), className: "bg-black/20 border-white/10 text-sm" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsx(Input, { placeholder: "Ward", value: addressForm.ward, onChange: (e) => onAddressChange('ward', e.target.value), className: "bg-black/20 border-white/10 text-sm" }), _jsx(Input, { placeholder: "District", value: addressForm.district, onChange: (e) => onAddressChange('district', e.target.value), className: "bg-black/20 border-white/10 text-sm" }), _jsx(Input, { placeholder: "Province", value: addressForm.province, onChange: (e) => onAddressChange('province', e.target.value), className: "bg-black/20 border-white/10 text-sm" })] })] })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-medium text-white/70 uppercase tracking-wider", children: "Risk Analysis" }), _jsxs("div", { className: "bg-white/5 rounded-xl p-4 space-y-4 border border-white/10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-white/70", children: "Risk Score" }), _jsx(RiskBadge, { score: riskAnalysis.score })] }), riskAnalysis.reasons.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("span", { className: "text-xs text-white/50", children: "Risk Factors:" }), _jsx("ul", { className: "space-y-1", children: riskAnalysis.reasons.map((reason, idx) => (_jsxs("li", { className: "text-xs text-red-300 flex items-start gap-2", children: [_jsx(ShieldAlert, { size: 12, className: "mt-0.5 flex-shrink-0" }), typeof reason === 'string' ? (_jsx("span", { children: reason })) : (_jsxs("div", { className: "flex justify-between w-full", children: [_jsx("span", { children: reason.desc }), _jsxs("span", { className: "font-semibold text-rose-300", children: ["+", reason.score] })] }))] }, idx))) })] }))] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-medium text-white/70 uppercase tracking-wider", children: "Timeline" }), _jsx("div", { className: "bg-white/5 rounded-xl p-4 border border-white/10", children: _jsx(OrderTimeline, { events: orderEvents }) })] }), _jsx("div", { className: "pt-4 border-t border-white/10", children: _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { size: "sm", variant: "secondary", onClick: () => {
                                                        if (hasPaid)
                                                            setShowRefundModal(true);
                                                        else
                                                            setShowReturnModal(true);
                                                    }, className: "flex-1 gap-1 text-xs", children: [_jsx(RotateCcw, { size: 14 }), " Return"] }), _jsxs(Button, { size: "sm", variant: "secondary", onClick: () => setShowExchangeModal(true), className: "flex-1 gap-1 text-xs", children: [_jsx(RefreshCw, { size: 14 }), " Exchange"] })] }) })] })] })] }), _jsx(RefundModal, { isOpen: showRefundModal, onClose: () => setShowRefundModal(false), order: order, onSuccess: handleSuccess, title: hasPaid ? 'Return & Refund' : 'Refund Order' }), _jsx(ReturnModal, { isOpen: showReturnModal, onClose: () => setShowReturnModal(false), order: order, onSuccess: handleSuccess }), _jsx(ExchangeModal, { isOpen: showExchangeModal, onClose: () => setShowExchangeModal(false), order: order, onSuccess: handleSuccess, isPaid: hasPaid })] }), document.body);
};
