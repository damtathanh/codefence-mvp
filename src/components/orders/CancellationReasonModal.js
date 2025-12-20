import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
const REASON_OPTIONS = [
    { value: 'Đổi shop', label: 'Tôi muốn đổi mua ở shop khác' },
    { value: 'Đổi ý', label: 'Tôi không muốn mua nữa' },
    { value: 'Giá cao', label: 'Tôi thấy giá cao' },
    { value: 'Sai địa chỉ', label: 'Tôi đặt nhầm địa chỉ / thông tin nhận hàng' },
    { value: 'Sai thông tin sản phẩm', label: 'Tôi đặt lộn sản phẩm' },
    { value: 'Khác', label: 'Lý do khác' },
];
export const CancellationReasonModal = ({ isOpen, onClose, onConfirm, order, }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    if (!isOpen)
        return null;
    const handleConfirm = async () => {
        const finalReason = selectedReason === 'Khác' ? customReason.trim() : selectedReason;
        if (!finalReason) {
            return; // Don't submit if no reason selected/entered
        }
        setIsSubmitting(true);
        try {
            await onConfirm(finalReason);
            // Reset state
            setSelectedReason('');
            setCustomReason('');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleClose = () => {
        setSelectedReason('');
        setCustomReason('');
        onClose();
    };
    const isCustomReasonSelected = selectedReason === 'Khác';
    const canSubmit = selectedReason && (!isCustomReasonSelected || customReason.trim());
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-50", onClick: handleClose }), _jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-w-md w-full", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-white/10", children: [_jsx("h2", { className: "text-xl font-semibold text-white", children: "L\u00FD do h\u1EE7y \u0111\u01A1n" }), _jsx("button", { onClick: handleClose, className: "p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsx("div", { className: "bg-slate-800/30 border border-white/5 rounded-lg p-4 mb-4", children: _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-white/60", children: "M\u00E3 \u0111\u01A1n h\u00E0ng:" }), _jsxs("span", { className: "text-white font-mono", children: ["#", order.id.slice(0, 8)] })] }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-white/80 mb-3", children: "Ch\u1ECDn l\u00FD do h\u1EE7y \u0111\u01A1n (theo l\u1EDDi kh\u00E1ch):" }), REASON_OPTIONS.map((option) => (_jsxs("label", { className: "flex items-center p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors", children: [_jsx("input", { type: "radio", name: "cancellation-reason", value: option.value, checked: selectedReason === option.value, onChange: (e) => setSelectedReason(e.target.value), className: "w-4 h-4 text-purple-600 bg-slate-700 border-white/20 focus:ring-purple-500 focus:ring-2" }), _jsx("span", { className: "ml-3 text-white/90", children: option.label })] }, option.value)))] }), isCustomReasonSelected && (_jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "block text-sm font-medium text-white/80 mb-2", children: "Nh\u1EADp l\u00FD do c\u1EE5 th\u1EC3:" }), _jsx("textarea", { value: customReason, onChange: (e) => setCustomReason(e.target.value), placeholder: "Nh\u1EADp l\u00FD do h\u1EE7y \u0111\u01A1n...", className: "w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none", rows: 3, disabled: isSubmitting })] }))] }), _jsxs("div", { className: "p-6 border-t border-white/10 flex gap-3", children: [_jsx(Button, { variant: "secondary", onClick: handleClose, disabled: isSubmitting, className: "flex-1", children: "H\u1EE7y" }), _jsx(Button, { onClick: handleConfirm, disabled: !canSubmit || isSubmitting, className: "flex-1", children: isSubmitting ? 'Đang xử lý...' : 'Xác nhận' })] })] }) })] }));
};
