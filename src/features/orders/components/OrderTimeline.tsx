import React from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    Truck,
    AlertTriangle,
    ShieldAlert,
} from 'lucide-react';
import type { OrderEvent } from '../../../types/supabase';

interface OrderTimelineProps {
    events: OrderEvent[];
}

// Những alias cần gom lại (cùng ý nghĩa nhưng khác tên)
const EVENT_ALIASES: Record<string, string> = {
    // MANUAL_APPROVED trong SQL -> xem như ORDER_APPROVED
    MANUAL_APPROVED: 'ORDER_APPROVED',

    // Lower level event name -> tên chuẩn
    ORDER_CONFIRMATION_SENT: 'CONFIRMATION_SENT',

    // Các tên QR khác nhau -> QR_PAYMENT_LINK_SENT
    QR_SENT: 'QR_PAYMENT_LINK_SENT',

    // Các trạng thái "đã trả tiền" khác nhau -> CUSTOMER_PAID
    PAID_CONFIRMED: 'CUSTOMER_PAID',
    PAID: 'CUSTOMER_PAID',
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
    const getEventDisplay = (evt: OrderEvent) => {
        const payload = (evt.payload_json || {}) as any;

        // 1) Chuẩn hóa event_type: trim + uppercase
        const rawType = evt.event_type || '';
        const upperType = rawType.trim().toUpperCase();

        // 2) Áp dụng alias nếu có, còn không giữ nguyên
        const type = EVENT_ALIASES[upperType] || upperType;

        switch (type) {
            case 'ORDER_APPROVED':
                return {
                    title: 'Order approved',
                    subtitle: '',
                    icon: <CheckCircle size={14} className="text-green-400" />,
                    color: 'bg-green-500/10 border-green-500/20 text-green-400',
                };

            case 'CONFIRMATION_SENT':
                return {
                    title: 'Order confirmation sent via Zalo',
                    subtitle: '',
                    icon: <CheckCircle size={14} className="text-blue-400" />,
                    color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                };

            case 'CUSTOMER_CONFIRMED':
                return {
                    title: 'Customer confirmed order',
                    subtitle: '',
                    icon: <CheckCircle size={14} className="text-green-400" />,
                    color: 'bg-green-500/10 border-green-500/20 text-green-400',
                };

            case 'QR_PAYMENT_LINK_SENT':
                return {
                    title: 'QR payment link sent',
                    subtitle: '',
                    icon: <CheckCircle size={14} className="text-purple-400" />,
                    color: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                };

            case 'CUSTOMER_PAID':
                return {
                    title: 'Customer paid',
                    subtitle: '',
                    icon: <CheckCircle size={14} className="text-emerald-400" />,
                    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                };

            case 'CUSTOMER_CANCELLED':
                return {
                    title: 'Customer cancelled order',
                    subtitle: payload.reason || '',
                    icon: <XCircle size={14} className="text-red-400" />,
                    color: 'bg-red-500/10 border-red-500/20 text-red-400',
                };

            case 'CUSTOMER_UNREACHABLE':
                return {
                    title: 'Customer unreachable',
                    subtitle: payload.reason || '',
                    icon: <XCircle size={14} className="text-orange-400" />,
                    color: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                };

            case 'ORDER_MARKED_DELIVERING':
                return {
                    title: 'Order marked as delivering',
                    subtitle: '',
                    icon: <Truck size={14} className="text-blue-400" />,
                    color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                };

            case 'ORDER_SHIPPED':
                return {
                    title: 'Order shipped (Delivering)',
                    subtitle: payload.shipped_at
                        ? new Date(payload.shipped_at).toLocaleString('vi-VN')
                        : '',
                    icon: <Truck size={14} className="text-blue-400" />,
                    color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                };

            case 'ORDER_COMPLETED':
                return {
                    title: 'Order completed',
                    subtitle: payload.completed_at
                        ? new Date(payload.completed_at).toLocaleString('vi-VN')
                        : '',
                    icon: <CheckCircle size={14} className="text-green-400" />,
                    color: 'bg-green-500/10 border-green-500/20 text-green-400',
                };

            case 'VERIFICATION_REQUIRED':
                return {
                    title: 'Verification required',
                    subtitle: payload.reason || '',
                    icon: <AlertTriangle size={14} className="text-yellow-400" />,
                    color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                };

            case 'ORDER_REJECTED':
                return {
                    title: 'Order rejected',
                    subtitle: payload.reason || '',
                    icon: <XCircle size={14} className="text-red-400" />,
                    color: 'bg-red-500/10 border-red-500/20 text-red-400',
                };

            case 'RISK_EVALUATED':
                return {
                    title: 'Risk evaluated',
                    subtitle:
                        payload.level && payload.score != null
                            ? `${payload.level} (${payload.score})`
                            : '',
                    icon: <ShieldAlert size={14} className="text-purple-400" />,
                    color: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                };

            default:
                // Fallback: format lại cho đỡ xấu
                const prettyTitle =
                    type
                        .toLowerCase()
                        .replace(/_/g, ' ')
                        .replace(/^\w/, (c) => c.toUpperCase()) || 'Unknown event';

                return {
                    title: prettyTitle,
                    subtitle: '',
                    icon: <Clock size={14} className="text-gray-400" />,
                    color: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
                };
        }
    };

    if (events.length === 0) {
        return (
            <div className="text-sm text-white/40 italic">
                No events recorded
            </div>
        );
    }

    // Deduplicate: nếu 2 event cùng type + cùng timestamp -> chỉ giữ 1
    const uniqueEventsMap = new Map<string, OrderEvent>();
    events.forEach((evt) => {
        const key = `${evt.event_type}__${evt.created_at}`;
        if (!uniqueEventsMap.has(key)) {
            uniqueEventsMap.set(key, evt);
        }
    });
    const uniqueEvents = Array.from(uniqueEventsMap.values());

    // Sort theo thời gian tăng dần
    const sortedEvents = [...uniqueEvents].sort(
        (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
    );

    return (
        <div className="space-y-4">
            {sortedEvents.map((evt) => {
                const display = getEventDisplay(evt);
                return (
                    <div
                        key={evt.id}
                        className="relative pl-6 pb-4 last:pb-0 border-l border-white/10 last:border-0"
                    >
                        <div
                            className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full border ${display.color.split(' ')[1]
                                } bg-[#0B0E14] flex items-center justify-center`}
                        >
                            {display.icon}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-[#E5E7EB]">
                                {display.title}
                            </span>
                            {display.subtitle && (
                                <span className="text-xs text-white/50">
                                    {display.subtitle}
                                </span>
                            )}
                            <span className="text-[10px] text-white/30">
                                {new Date(evt.created_at).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
