import React from 'react';
import { X, Phone, MapPin, CreditCard, Save, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StatusBadge } from '../../../components/dashboard/StatusBadge';
import { RiskBadge } from '../../../components/dashboard/RiskBadge';
import { OrderTimeline } from './OrderTimeline';
import { ORDER_STATUS } from '../../../constants/orderStatus';
import type { Order, OrderEvent } from '../../../types/supabase';

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
    onSimulateConfirmed?: (order: Order) => void;
    onSimulateCancelled?: (order: Order) => void;
    onSimulatePaid?: (order: Order) => void;
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
    onSimulateConfirmed,
    onSimulateCancelled,
    onSimulatePaid,
}) => {
    if (!isOpen || !order) return null;

    const isBlacklisted = order.phone && blacklistedPhones.has(order.phone);

    const getLatestRiskEvent = () => {
        const riskEvents = orderEvents.filter((evt) => evt.event_type === 'RISK_EVALUATED');
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

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 w-[500px] bg-[#131625] border-l border-white/10 shadow-2xl z-[51] flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1E223D]/50">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Order Details</h2>
                        <p className="text-sm text-white/50">ID: {order.order_id || order.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Status & Actions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <StatusBadge status={order.status} />
                            <div className="flex gap-2 flex-wrap">
                                {/* Terminal states - no actions */}
                                {(order.status === ORDER_STATUS.COMPLETED ||
                                    order.status === ORDER_STATUS.ORDER_REJECTED ||
                                    order.status === ORDER_STATUS.CUSTOMER_CANCELLED) ? null : (
                                    <>
                                        {/* COD Flow */}
                                        {(order.payment_method === 'COD' || !order.payment_method) && (
                                            <>
                                                {/* Pending Review: Approve/Reject */}
                                                {order.status === ORDER_STATUS.PENDING_REVIEW && (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => onReject(order)}>
                                                            Reject
                                                        </Button>
                                                        <Button size="sm" onClick={() => onApprove(order)}>
                                                            Approve
                                                        </Button>
                                                    </>
                                                )}

                                                {/* Order Confirmation Sent: Simulate Confirmed/Cancelled */}
                                                {order.status === ORDER_STATUS.ORDER_CONFIRMATION_SENT && (
                                                    <>
                                                        {onSimulateConfirmed && (
                                                            <Button size="sm" variant="secondary" onClick={() => onSimulateConfirmed(order)}>
                                                                Simulate Confirmed
                                                            </Button>
                                                        )}
                                                        {onSimulateCancelled && (
                                                            <Button size="sm" variant="secondary" onClick={() => onSimulateCancelled(order)}>
                                                                Simulate Cancelled
                                                            </Button>
                                                        )}
                                                    </>
                                                )}

                                                {/* Customer Confirmed: Mark Delivered / Simulate Paid */}
                                                {order.status === ORDER_STATUS.CUSTOMER_CONFIRMED && (
                                                    <>
                                                        <Button size="sm" onClick={() => onMarkDelivered(order)}>
                                                            Mark as Delivered
                                                        </Button>
                                                        {onSimulatePaid && (
                                                            <Button size="sm" variant="secondary" onClick={() => onSimulatePaid(order)}>
                                                                Simulate Paid
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {/* Non-COD Flow */}
                                        {order.payment_method && order.payment_method !== 'COD' && (
                                            <>
                                                {/* Order Paid: Mark as Delivered */}
                                                {order.status === ORDER_STATUS.ORDER_PAID && (
                                                    <Button size="sm" onClick={() => onMarkDelivered(order)}>
                                                        Mark as Delivered
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {/* Both COD and Non-COD: Delivering → Mark Completed */}
                                        {order.status === ORDER_STATUS.DELIVERING && (
                                            <Button size="sm" onClick={() => onMarkCompleted(order)}>
                                                Mark as Completed
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Customer Information</h3>
                        <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]">
                                    <span className="font-bold">{order.customer_name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <p className="text-[#E5E7EB] font-medium">{order.customer_name}</p>
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
                                        onChange={(e) => onAddressChange('address_detail', e.target.value)}
                                        className="bg-black/20 border-white/10 text-sm"
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            placeholder="Ward"
                                            value={addressForm.ward}
                                            onChange={(e) => onAddressChange('ward', e.target.value)}
                                            className="bg-black/20 border-white/10 text-sm"
                                        />
                                        <Input
                                            placeholder="District"
                                            value={addressForm.district}
                                            onChange={(e) => onAddressChange('district', e.target.value)}
                                            className="bg-black/20 border-white/10 text-sm"
                                        />
                                        <Input
                                            placeholder="Province"
                                            value={addressForm.province}
                                            onChange={(e) => onAddressChange('province', e.target.value)}
                                            className="bg-black/20 border-white/10 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Risk Analysis */}
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
                                        {riskAnalysis.reasons.map((reason: any, idx: number) => {
                                            // case cũ: chuỗi đơn giản
                                            if (typeof reason === "string") {
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

                                            // case mới: object { factor, score, desc }
                                            if (reason && typeof reason === "object") {
                                                const { desc, score } = reason as {
                                                    desc?: string;
                                                    score?: number;
                                                };

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
                                                            <span>{desc ?? "Risk factor"}</span>
                                                            {typeof score === "number" && (
                                                                <span className="font-semibold text-rose-300">
                                                                    {score > 0 ? `+${score}` : score}
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

                    {/* Order Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Order Details</h3>
                        <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">Product</span>
                                <span className="text-[#E5E7EB] font-medium">
                                    {order.products?.name || order.product || 'Unknown Product'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">Amount</span>
                                <span className="text-[#E5E7EB] font-medium">{order.amount.toLocaleString('vi-VN')} VND</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">Payment Method</span>
                                <div className="flex items-center gap-2 text-[#E5E7EB]">
                                    <CreditCard size={14} />
                                    <span>{order.payment_method || 'COD'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Timeline</h3>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <OrderTimeline events={orderEvents} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
