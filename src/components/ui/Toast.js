import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
const ToastContext = createContext(undefined);
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { id, message, type, duration };
        setToasts((prev) => [...prev, newToast]);
        // If duration is 0 or undefined, the toast is persistent (no auto-dismiss)
        if (duration !== undefined && duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== id));
            }, duration);
        }
    }, []);
    const showSuccess = useCallback((message, duration) => {
        showToast(message, 'success', duration);
    }, [showToast]);
    const showError = useCallback((message, duration) => {
        showToast(message, 'error', duration);
    }, [showToast]);
    const showInfo = useCallback((message, duration) => {
        showToast(message, 'info', duration);
    }, [showToast]);
    const showWarning = useCallback((message, duration) => {
        showToast(message, 'warning', duration);
    }, [showToast]);
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);
    return (_jsxs(ToastContext.Provider, { value: { showToast, showSuccess, showError, showInfo, showWarning }, children: [children, _jsx(ToastContainer, { toasts: toasts, onRemove: removeToast })] }));
};
const ToastContainer = ({ toasts, onRemove }) => {
    if (toasts.length === 0)
        return null;
    return (_jsx("div", { className: "fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full", children: toasts.map((toast) => (_jsx(ToastItem, { toast: toast, onRemove: onRemove }, toast.id))) }));
};
const ToastItem = ({ toast, onRemove }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        // Trigger animation
        setTimeout(() => setIsVisible(true), 10);
    }, []);
    const handleRemove = () => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
    };
    const typeStyles = {
        success: 'bg-green-500/20 border-green-500/50 text-green-300',
        error: 'bg-red-500/20 border-red-500/50 text-red-300',
        info: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
        warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    };
    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertTriangle,
    };
    const Icon = icons[toast.type];
    return (_jsxs("div", { className: `
        ${typeStyles[toast.type]}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm
        flex items-start gap-3
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `, children: [_jsx(Icon, { className: "w-5 h-5 mt-0.5 flex-shrink-0" }), _jsx("div", { className: "flex-1 min-w-0", children: typeof toast.message === 'string' ? (_jsx("p", { className: "text-sm font-medium break-words", children: toast.message })) : (_jsx("div", { className: "text-sm font-medium break-words", children: toast.message })) }), _jsx("button", { onClick: handleRemove, className: "text-white/70 hover:text-white transition-colors flex-shrink-0", children: _jsx(X, { className: "w-4 h-4" }) })] }));
};
