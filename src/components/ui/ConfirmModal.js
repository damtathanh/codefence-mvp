import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
export const ConfirmModal = ({ isOpen, message, confirmText = 'Delete', cancelText = 'Cancel', variant = 'danger', onConfirm, onCancel, loading = false, }) => {
    // Handle ESC key to close modal
    useEffect(() => {
        if (!isOpen)
            return;
        const handleEsc = (event) => {
            if (event.key === 'Escape' && !loading) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, loading, onCancel]);
    // Handle click outside to close modal
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onCancel();
        }
    };
    if (!isOpen)
        return null;
    const variantStyles = {
        danger: {
            icon: 'text-red-400',
            border: 'border-red-500/30',
            bg: 'bg-red-500/10',
            button: 'bg-red-500 hover:bg-red-600',
        },
        warning: {
            icon: 'text-yellow-400',
            border: 'border-yellow-500/30',
            bg: 'bg-yellow-500/10',
            button: 'bg-yellow-500 hover:bg-yellow-600',
        },
        info: {
            icon: 'text-blue-400',
            border: 'border-blue-500/30',
            bg: 'bg-blue-500/10',
            button: 'bg-blue-500 hover:bg-blue-600',
        },
    };
    const styles = variantStyles[variant];
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-[50] p-4 backdrop-blur-sm", onClick: handleOverlayClick, role: "dialog", "aria-modal": "true", "aria-labelledby": "confirm-modal-title", children: _jsxs("div", { className: "bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-md w-full shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-start gap-4 mb-6", children: [_jsx("div", { className: `flex-shrink-0 w-12 h-12 rounded-full ${styles.bg} ${styles.border} border flex items-center justify-center`, children: _jsx(AlertTriangle, { size: 24, className: styles.icon }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { id: "confirm-modal-title", className: "text-lg font-semibold text-[#E5E7EB] mb-2", children: "Confirm Action" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/80", children: message })] })] }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, disabled: loading, children: cancelText }), _jsx("button", { type: "button", onClick: onConfirm, disabled: loading, className: `px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F28] disabled:opacity-50 disabled:cursor-not-allowed ${variant === 'danger'
                                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                                : variant === 'warning'
                                    ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
                                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'}`, children: loading ? (_jsxs("span", { className: "flex items-center", children: [_jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" }), "Processing..."] })) : (confirmText) })] })] }) }));
};
