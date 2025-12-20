import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const PageHeader = ({ title, description, actions, className = "" }) => {
    return (_jsxs("div", { className: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`, children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--text-main)] tracking-tight", children: title }), description && (_jsx("p", { className: "text-[var(--text-muted)] mt-1 text-sm", children: description }))] }), actions && (_jsx("div", { className: "flex items-center gap-3 flex-wrap", children: actions }))] }));
};
