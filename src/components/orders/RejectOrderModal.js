import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';
const RejectOrderModal = ({ isOpen, mode, reason, onModeChange, onReasonChange, onConfirm, onCancel, loading = false, }) => {
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
    const isConfirmDisabled = !reason.trim() || loading;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm", onClick: handleOverlayClick, role: "dialog", "aria-modal": "true", "aria-labelledby": "reject-modal-title", children: _jsxs("div", { className: "bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-md w-full shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { id: "reject-modal-title", className: "text-lg font-semibold text-[#E5E7EB]", children: "Handle this order" }), _jsx("button", { onClick: onCancel, disabled: loading, className: "text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors disabled:opacity-50", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-[#E5E7EB] mb-3", children: "Action Type" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors", children: [_jsx("input", { type: "radio", name: "rejectMode", value: "VERIFICATION_REQUIRED", checked: mode === 'VERIFICATION_REQUIRED', onChange: () => onModeChange('VERIFICATION_REQUIRED'), disabled: loading, className: "w-4 h-4 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50" }), _jsx("span", { className: "text-sm text-[#E5E7EB]", children: "Verification Required" })] }), _jsxs("label", { className: "flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors", children: [_jsx("input", { type: "radio", name: "rejectMode", value: "ORDER_REJECTED", checked: mode === 'ORDER_REJECTED', onChange: () => onModeChange('ORDER_REJECTED'), disabled: loading, className: "w-4 h-4 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50" }), _jsx("span", { className: "text-sm text-[#E5E7EB]", children: "Order Rejected" })] })] })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("label", { htmlFor: "reason-textarea", className: "block text-sm font-medium text-[#E5E7EB] mb-2", children: ["Reason ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsx("textarea", { id: "reason-textarea", value: reason, onChange: (e) => onReasonChange(e.target.value), disabled: loading, placeholder: "Enter the reason for verification or rejection...", rows: 4, className: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed" })] }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, disabled: loading, children: "Cancel" }), _jsx(Button, { type: "button", onClick: onConfirm, disabled: isConfirmDisabled || loading, className: "w-full", children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Processing..."] })) : ('Confirm') })] })] }) }));
};
export default RejectOrderModal;
