import { jsx as _jsx } from "react/jsx-runtime";
export const Card = ({ children, className = '', glass = true, }) => {
    return (_jsx("div", { className: `${glass ? 'bg-[var(--bg-card)] backdrop-blur-sm' : 'bg-[var(--bg-card-soft)]'} rounded-lg border border-[var(--border-subtle)] shadow-lg ${className}`, children: children }));
};
export const CardHeader = ({ children, className = '' }) => {
    return (_jsx("div", { className: `p-6 lg:p-8 pb-4 ${className}`, children: children }));
};
export const CardTitle = ({ children, className = '' }) => {
    return (_jsx("h3", { className: `text-lg font-semibold text-[var(--text-main)] ${className}`, children: children }));
};
export const CardDescription = ({ children, className = '' }) => {
    return (_jsx("p", { className: `text-sm text-[var(--text-muted)] mt-1 ${className}`, children: children }));
};
export const CardContent = ({ children, className = '' }) => {
    return (_jsx("div", { className: `p-6 lg:p-8 pt-0 ${className}`, children: children }));
};
