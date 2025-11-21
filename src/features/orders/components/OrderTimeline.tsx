import React from 'react';
import { CheckCircle, XCircle, Clock, Truck, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { OrderEvent } from '../../../types/supabase';

interface OrderTimelineProps {
    events: OrderEvent[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
    const getEventDisplay = (evt: OrderEvent) => {
        const type = evt.event_type;
        const payload = (evt.payload_json || {}) as any;

        switch (type) {
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
            case 'ORDER_SHIPPED':
                return {
                    title: 'Order shipped (Delivering)',
                    subtitle: payload.shipped_at ? new Date(payload.shipped_at).toLocaleString('vi-VN') : '',
                    icon: <Truck size={14} className="text-blue-400" />,
                    color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                };
            case 'ORDER_COMPLETED':
                return {
                    title: 'Order completed',
                    subtitle: payload.completed_at ? new Date(payload.completed_at).toLocaleString('vi-VN') : '',
                    icon: <CheckCircle size={14} className="text-green-400" />,
                    color: 'bg-green-500/10 border-green-500/20 text-green-400',
                };
            case 'RISK_EVALUATED':
                return {
                    title: 'Risk evaluated',
                    subtitle: payload.level && payload.score != null
                        ? `${payload.level} (${payload.score})`
                        : '',
                    icon: <ShieldAlert size={14} className="text-purple-400" />,
                    color: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                };
            default:
                return {
                    title: type,
                    subtitle: '',
                    icon: <Clock size={14} className="text-gray-400" />,
                    color: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
                };
        }
    };

    if (events.length === 0) {
        return <div className="text-sm text-white/40 italic">No events recorded</div>;
    }

    return (
        <div className="space-y-4">
            {events.map((evt) => {
                const display = getEventDisplay(evt);
                return (
                    <div key={evt.id} className="relative pl-6 pb-4 last:pb-0 border-l border-white/10 last:border-0">
                        <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full border ${display.color.split(' ')[1]} bg-[#0B0E14] flex items-center justify-center`}>
                            {display.icon}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-[#E5E7EB]">{display.title}</span>
                            {display.subtitle && (
                                <span className="text-xs text-white/50">{display.subtitle}</span>
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
