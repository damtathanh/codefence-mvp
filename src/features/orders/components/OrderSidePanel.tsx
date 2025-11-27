import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Phone,
    MapPin,
    CreditCard,
    Save,
    AlertTriangle,
    ShieldAlert,
    RefreshCw,
    RotateCcw,
    Truck,
    CheckCircle,
    Ban,
    Banknote,
    QrCode
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
    addressForm: {
        address_detail: string;
        ward: string;
        district: string;
        province: string;
    };
    isAddressModified: boolean;
    onAddressChange: (field: string, value: string) => void;
    onSaveAddress: () => void;
    blacklistedPhones: Set<string>;
    // Updated handlers
    onApprove: (order: Order) => void;
    onReject: (order: Order, reason: string) => void;
    onMarkDelivered: (order: Order) => void;
    onMarkCompleted: (order: Order) => void;
    onMarkMissed?: (order: Order) => void; // Optional if needed
    onSimulateConfirmed: (order: Order) => void;
    onSimulateCancelled: (order: Order) => void;
    onSimulatePaid: (order: Order) => void;
    onOrderUpdated?: () => void;
}

export const OrderSidePanel: React.FC<OrderSidePanelProps> = ({
    isOpen,
    onClose,
    order,
    orderEvents,
    addressForm,
    isAddressModified,
    onAddressChange,
    onSaveAddress,
    blacklistedPhones,
    onApprove,
    onReject,
    onMarkDelivered,
    onMarkCompleted,
    onMarkMissed,
    onSimulateConfirmed,
    onSimulateCancelled,
    onSimulatePaid,
    onOrderUpdated,
}) => {
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);

    if (!isOpen || !order || typeof document === 'undefined') return null;

    const isBlacklisted = order.phone && blacklistedPhones.has(order.phone);
    const isCOD = (!order.payment_method || order.payment_method === 'COD');
    const hasPaid = !!order.paid_at || order.status === ORDER_STATUS.ORDER_PAID;

    const getLatestRiskEvent = () => {
        const riskEvents = orderEvents.filter(
            (evt) => evt.event_type === 'RISK_EVALUATED',
        );
        if (riskEvents.length === 0) {
            return {
                score: order.risk_score ?? null,
                level: order.risk_level ?? null,
                reasons: [],
            };
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

    const handleSuccess = () => {
        if (onOrderUpdated) onOrderUpdated();
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-50 flex justify-end">
                {/* Overlay */}
                <div
                    className="flex-1 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Side Panel */}
                <div className="w-[500px] h-full bg-[#131625] border-l border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
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

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                        {/* --- MAIN ACTION AREA --- */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <StatusBadge status={order.status} />
                                <div className="text-xs text-white/50 uppercase tracking-wider font-bold">
                                    {isCOD ? "COD Order" : "Prepaid Order"}
                                </div>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-3">

                                {/* 1. REVIEW STAGE */}
                                {(order.status === ORDER_STATUS.PENDING_REVIEW) && (
                                    <>
                                        <p className="text-sm text-yellow-200 mb-1">⚠️ This order needs risk review.</p>
                                        <div className="flex gap-2">
                                            <Button variant="danger" className="flex-1" onClick={() => onReject(order, "Shop rejected risk")}>
                                                <Ban size={16} className="mr-2" /> Reject
                                            </Button>
                                            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => onApprove(order)}>
                                                <CheckCircle size={16} className="mr-2" /> Approve & Send Zalo
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {/* 2. VERIFICATION REQUIRED STAGE */}
                                {order.status === ORDER_STATUS.VERIFICATION_REQUIRED && (
                                    <>
                                        <p className="text-sm text-red-200 mb-1">🚫 No Zalo / High Risk. Manual check required.</p>
                                        <div className="flex gap-2">
                                            <Button variant="danger" className="flex-1" onClick={() => onReject(order, "Verification failed")}>
                                                Reject
                                            </Button>
                                            <Button variant="secondary" className="flex-1" onClick={() => onApprove(order)}>
                                                Approve (Called)
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {/* 3. WAITING FOR CUSTOMER (Simulation Zone) */}
                                {order.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT && (
                                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                                        <p className="text-xs text-blue-300 font-bold uppercase mb-2">Customer Simulation (Zalo)</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="danger" className="flex-1" onClick={() => onSimulateCancelled(order)}>
                                                Customer Cancels
                                            </Button>
                                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onSimulateConfirmed(order)}>
                                                Customer Confirms
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* 4. READY TO SHIP / PAY */}
                                {(order.status === ORDER_STATUS.CUSTOMER_CONFIRMED || order.status === ORDER_STATUS.ORDER_PAID) && (
                                    <div className="space-y-2">
                                        {!hasPaid && (
                                            <Button variant="outline" size="sm" className="w-full border-purple-500 text-purple-300 hover:bg-purple-500/10" onClick={() => onSimulatePaid(order)}>
                                                <QrCode size={16} className="mr-2" /> Simulate: Customer Paid (QR)
                                            </Button>
                                        )}

                                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onMarkDelivered(order)}>
                                            <Truck size={16} className="mr-2" /> Start Delivery
                                        </Button>
                                    </div>
                                )}

                                {/* 5. DELIVERING */}
                                {order.status === ORDER_STATUS.DELIVERING && (
                                    <div className="space-y-2">
                                        {!hasPaid && (
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => onSimulatePaid(order)}>
                                                <Banknote size={16} className="mr-2" /> Mark Paid (Collected on Delivery)
                                            </Button>
                                        )}
                                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => onMarkCompleted(order)}>
                                            <CheckCircle size={16} className="mr-2" /> Complete Order
                                        </Button>
                                    </div>
                                )}

                                {/* 6. COMPLETED (Late Payment Collection) */}
                                {order.status === ORDER_STATUS.COMPLETED && !hasPaid && isCOD && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-white/50 text-center">Order delivered but COD payment pending.</p>
                                        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => onSimulatePaid(order)}>
                                            <Banknote size={16} className="mr-2" /> Confirm COD Received
                                        </Button>
                                    </div>
                                )}

                                {/* AFTER-SALE ACTIONS (Always available for terminal states) */}
                                {((order.status === ORDER_STATUS.DELIVERING || order.status === ORDER_STATUS.COMPLETED)) && (
                                    <>
                                        <div className="w-full h-px bg-white/10 my-2" />
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
                                    </>
                                )}

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

                        {/* ORDER DETAILS */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                                Order Details
                            </h3>
                            <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">Product</span>
                                    <span className="text-[#E5E7EB] font-medium">
                                        {order.products?.name || order.product || 'Unknown Product'}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">Amount</span>
                                    <span className="text-[#E5E7EB] font-medium">
                                        {order.amount.toLocaleString('vi-VN')} VND
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">Payment Method</span>
                                    <div className="flex items-center gap-2 text-[#E5E7EB]">
                                        <CreditCard size={14} />
                                        <span>{order.payment_method || 'COD'}</span>
                                    </div>
                                </div>

                                {(order.refunded_amount || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-red-400">
                                        <span>Refunded</span>
                                        <span>
                                            -{order.refunded_amount?.toLocaleString('vi-VN')} VND
                                        </span>
                                    </div>
                                )}

                                {(order.customer_shipping_paid || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-green-400">
                                        <span>Cust. Shipping Paid</span>
                                        <span>
                                            +
                                            {order.customer_shipping_paid?.toLocaleString('vi-VN')}{' '}
                                            VND
                                        </span>
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
                    </div>
                </div>
            </div>

            {/* MODALS */}
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
        document.body,
    );
};