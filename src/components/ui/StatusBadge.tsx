import React from 'react';

interface StatusBadgeProps {
    status: string;
    className?: string;
    variant?: 'default' | 'outline';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    className = "",
    variant = 'default'
}) => {
    const getStatusColor = (statusVal: string) => {
        const s = statusVal?.toLowerCase() || '';

        // Success / Green
        if (['completed', 'paid', 'delivered', 'active', 'approved', 'success'].includes(s)) {
            return 'bg-green-500/10 text-green-400 border-green-500/20';
        }

        // Warning / Yellow
        if (['pending', 'processing', 'delivering', 'verification_required', 'pending_review', 'warning'].includes(s)) {
            return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        }

        // Error / Red
        if (['cancelled', 'rejected', 'inactive', 'customer_cancelled', 'customer_unreachable', 'error', 'banned'].includes(s)) {
            return 'bg-red-500/10 text-red-400 border-red-500/20';
        }

        // Info / Blue
        if (['new', 'info', 'order_confirmation_sent'].includes(s)) {
            return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        }

        // Default / Gray
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    const formatStatus = (s: string) => {
        if (!s) return 'UNKNOWN';
        return s.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <span className={`
      inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border
      ${getStatusColor(status)} 
      ${className}
    `}>
            {formatStatus(status)}
        </span>
    );
};
