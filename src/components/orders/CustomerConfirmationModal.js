import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/orders/CustomerConfirmationModal.tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
export const CustomerConfirmationModal = ({ isOpen, onClose, order, }) => {
    if (!isOpen || !order)
        return null;
    // Đóng modal khi bấm ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    return (
    // Backdrop + click ra ngoài để tắt
    _jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm", onClick: onClose, children: _jsxs("div", { className: "bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-white/10", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "X\u00E1c nh\u1EADn \u0111\u01A1n h\u00E0ng" }), _jsx("button", { onClick: onClose, className: "p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "px-5 py-5 space-y-5", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3", children: _jsx("svg", { className: "w-6 h-6 text-green-500", fill: "none", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { d: "M5 13l4 4L19 7" }) }) }), _jsx("h3", { className: "text-base font-semibold text-white mb-1", children: "\u0110\u01A1n h\u00E0ng \u0111\u00E3 \u0111\u01B0\u1EE3c kh\u00E1ch x\u00E1c nh\u1EADn." }), _jsx("p", { className: "text-sm text-white/60", children: "D\u1EF1 ki\u1EBFn giao trong 3\u20135 ng\u00E0y t\u1EDBi." })] }), _jsx("div", { className: "bg-slate-800/50 border border-white/10 rounded-lg p-6", children: _jsxs("div", { className: "flex flex-col items-center justify-center space-y-3", children: [_jsx("div", { className: "w-40 h-40 bg-slate-900 flex items-center justify-center border-2 border-dashed border-white/20", children: _jsxs("div", { className: "text-center", children: [_jsxs("svg", { className: "w-12 h-12 text-white/40 mx-auto mb-2", fill: "none", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", stroke: "currentColor", children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1.5" }), _jsx("path", { d: "M14 14h.01" }), _jsx("path", { d: "M18 14h3v3" }), _jsx("path", { d: "M14 18h3v3" })] }), _jsx("p", { className: "text-sm text-white/70 font-medium", children: "QR Code" })] }) }), _jsx("p", { className: "text-xs text-white/60 text-center", children: "Qu\u00E9t m\u00E3 QR \u0111\u1EC3 thanh to\u00E1n v\u00E0 nh\u1EADn chi\u1EBFt kh\u1EA5u 5%." })] }) }), _jsxs("div", { className: "bg-slate-800/40 border border-white/5 rounded-lg p-4 space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-white/60", children: "M\u00E3 \u0111\u01A1n h\u00E0ng:" }), _jsxs("span", { className: "text-white font-medium", children: ["#", order.order_id] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-white/60", children: "T\u1ED5ng ti\u1EC1n:" }), _jsxs("span", { className: "text-white font-semibold", children: [order.amount?.toLocaleString('vi-VN'), " \u20AB"] })] })] })] }), _jsx("div", { className: "px-5 py-4 border-t border-white/10", children: _jsx(Button, { onClick: onClose, className: "w-full", children: "\u0110\u00F3ng" }) })] }) }));
};
