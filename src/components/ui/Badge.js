import { jsx as _jsx } from "react/jsx-runtime";
export const Badge = ({ children, variant = 'info', className = '', }) => {
    const variantStyles = {
        success: 'bg-green-500/20 text-green-300 border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-300 border-red-500/30',
        info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
    return (_jsx("span", { className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`, children: children }));
};
