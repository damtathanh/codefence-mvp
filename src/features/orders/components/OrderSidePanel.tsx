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
    DollarSign,
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
    onApprove: (order: Order) => void;
    onReject: (order: Order) => void;
    onMarkDelivered: (order: Order) => void;
    onMarkCompleted: (order: Order) => void;
    onMarkMissed?: (order: Order) => void;
    onSimulateConfirmed?: (order: Order) => void;
    onSimulateCancelled?: (order: Order) => void;
    onSimulatePaid?: (order: Order) => void;
    onOrderUpdated?: () => void; // Callback to refresh data
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
            {/* Wrapper full màn hình giống CustomerInsightPanel */}
            <div className="fixed inset-0 z-50 flex justify-end">
                {/* Overlay */}
                <div
                    className="flex-1 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Side Panel FULL HEIGHT */}
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

                    {/* BODY scrollable, chiếm full chiều cao */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                        {/* STATUS & ACTIONS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <StatusBadge status={order.status} />
                                <div className="flex gap-2 flex-wrap">
                                    {(order.status === ORDER_STATUS.COMPLETED ||
                                        order.status === ORDER_STATUS.ORDER_REJECTED ||
                                        order.status === ORDER_STATUS.CUSTOMER_CANCELLED) ? null : (
                                        <>
                                            {(() => {
                                                const rawMethod = order.payment_method || 'COD';
                                                const isCod = rawMethod.toUpperCase() === 'COD';
                                                const hasCustomerPaid =
                                                    order.status === ORDER_STATUS.ORDER_PAID ||
                                                    orderEvents.some(
                                                        (e) =>
                                                            e.event_type === 'CUSTOMER_PAID' ||
                                                            e.event_type === 'PAYMENT_CONFIRMED',
                                                    );

                                                if (isCod) {
                                                    return (
                                                        <>
                                                            {order.status ===
                                                                ORDER_STATUS.PENDING_REVIEW && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="secondary"
                                                                            onClick={() => onReject(order)}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => onApprove(order)}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                    </>
                                                                )}

                                                            {order.status ===
                                                                ORDER_STATUS.VERIFICATION_REQUIRED && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="secondary"
                                                                            onClick={() => onReject(order)}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                        {onMarkMissed && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="secondary"
                                                                                onClick={() => onMarkMissed(order)}
                                                                                className="bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-600/40 text-yellow-300"
                                                                            >
                                                                                Mark as Missed
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => onApprove(order)}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                    </>
                                                                )}

                                                            {order.status ===
                                                                ORDER_STATUS.ORDER_CONFIRMATION_SENT && (
                                                                    <>
                                                                        {onSimulateConfirmed && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="secondary"
                                                                                onClick={() =>
                                                                                    onSimulateConfirmed(order)
                                                                                }
                                                                            >
                                                                                Simulate Confirmed
                                                                            </Button>
                                                                        )}
                                                                        {onSimulateCancelled && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="secondary"
                                                                                onClick={() =>
                                                                                    onSimulateCancelled(order)
                                                                                }
                                                                            >
                                                                                Simulate Cancelled
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}

                                                            {(order.status ===
                                                                ORDER_STATUS.CUSTOMER_CONFIRMED ||
                                                                order.status === ORDER_STATUS.ORDER_PAID) && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => onMarkDelivered(order)}
                                                                    >
                                                                        Mark as Delivered
                                                                    </Button>
                                                                )}

                                                            {order.status ===
                                                                ORDER_STATUS.DELIVERING && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => onMarkCompleted(order)}
                                                                    >
                                                                        Mark as Completed
                                                                    </Button>
                                                                )}

                                                            {onSimulatePaid &&
                                                                !hasCustomerPaid &&
                                                                (order.status ===
                                                                    ORDER_STATUS.CUSTOMER_CONFIRMED ||
                                                                    order.status ===
                                                                    ORDER_STATUS.DELIVERING) && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        onClick={() => onSimulatePaid(order)}
                                                                    >
                                                                        Simulate Paid
                                                                    </Button>
                                                                )}
                                                        </>
                                                    );
                                                }

                                                // Non-COD
                                                return (
                                                    <>
                                                        {order.status === ORDER_STATUS.ORDER_PAID && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onMarkDelivered(order)}
                                                            >
                                                                Mark as Delivered
                                                            </Button>
                                                        )}
                                                        {order.status === ORDER_STATUS.DELIVERING && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onMarkCompleted(order)}
                                                            >
                                                                Mark as Completed
                                                            </Button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </>
                                    )}

                                    {/* AFTER-SALE (Return / Exchange) */}
                                    {(() => {
                                        const isDelivering =
                                            order.status === ORDER_STATUS.DELIVERING;
                                        const isCompleted =
                                            order.status === ORDER_STATUS.COMPLETED;
                                        const canAfterSale = isDelivering || isCompleted;
                                        if (!canAfterSale) return null;

                                        const isOrderPaid =
                                            !!order.paid_at ||
                                            order.status === ORDER_STATUS.ORDER_PAID;

                                        return (
                                            <>
                                                <div className="w-full h-px bg-white/10 my-2" />
                                                <div className="flex gap-3 w-full mt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            if (isOrderPaid) setShowRefundModal(true);
                                                            else setShowReturnModal(true);
                                                        }}
                                                        className="flex-1 gap-1 bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border-red-500/20 text-red-200"
                                                    >
                                                        <RotateCcw size={14} /> Return
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setShowExchangeModal(true)}
                                                        className="flex-1 gap-1 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-blue-500/20 text-blue-200"
                                                    >
                                                        <RefreshCw size={14} /> Exchange
                                                    </Button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
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
                                            {order.phone &&
                                                blacklistedPhones.has(order.phone) && (
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
                                            -{order.refunded_amount.toLocaleString('vi-VN')} VND
                                        </span>
                                    </div>
                                )}

                                {(order.customer_shipping_paid || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-green-400">
                                        <span>Cust. Shipping Paid</span>
                                        <span>
                                            +
                                            {order.customer_shipping_paid.toLocaleString('vi-VN')}{' '}
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
                title={
                    !!order.paid_at || order.status === ORDER_STATUS.ORDER_PAID
                        ? 'Return & Refund'
                        : 'Refund Order'
                }
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
                isPaid={!!order.paid_at || order.status === ORDER_STATUS.ORDER_PAID}
            />
        </>,
        document.body,
    );
};
