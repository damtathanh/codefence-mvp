import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { processRefund } from '../../services/ordersService';
import { useAuth } from '../../../../features/auth'; // 👈 THÊM DÒNG NÀY
export const RefundModal = ({ isOpen, onClose, order, onSuccess, title = 'Refund Order', }) => {
    const { user } = useAuth(); // 👈 LẤY user TỪ AUTH
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    if (!isOpen)
        return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (!user) {
                throw new Error('User not authenticated');
            }
            const refundAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
            if (isNaN(refundAmount) || refundAmount <= 0) {
                throw new Error('Invalid refund amount');
            }
            // 👇 TRUYỀN user.id VÀO processRefund THEO SIGNATURE MỚI
            await processRefund(user.id, order.id, refundAmount, note);
            onSuccess();
            onClose();
        }
        catch (err) {
            console.error('Refund failed:', err);
            setError(err.message || 'Failed to process refund');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]", onClick: onClose }), _jsxs("div", { className: "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#131625] border border-white/10 rounded-xl shadow-2xl z-[61] p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: title }), _jsx("button", { onClick: onClose, className: "text-white/50 hover:text-white transition-colors", children: _jsx(X, { size: 20 }) })] }), error && (_jsxs("div", { className: "mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm", children: [_jsx(AlertCircle, { size: 16 }), error] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-white/70 mb-1", children: "Refund Amount (VND)" }), _jsx(Input, { type: "number", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "Enter amount...", className: "bg-white/5 border-white/10 text-white", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-white/70 mb-1", children: "Reason / Note" }), _jsx("textarea", { value: note, onChange: (e) => setNote(e.target.value), className: "w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] resize-none", placeholder: "Why is this order being refunded?", required: true })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, disabled: loading, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? 'Processing...' : 'Confirm Refund' })] })] })] })] }));
};
