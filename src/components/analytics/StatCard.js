import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const StatCard = ({ title, value, subtitle, icon, valueColor, className, titleClass, valueClass, }) => {
    return (_jsxs("div", { className: "rounded-2xl bg-[#020617] border border-white/20 shadow-[0_0_0_1px_rgba(148,163,184,0.25)] p-4 flex items-start justify-between " +
            (className ?? ""), children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-xs font-medium text-white/60 uppercase tracking-wide " +
                            (titleClass ?? ""), children: title }), _jsx("p", { className: "mt-1 text-2xl font-semibold drop-shadow-sm " +
                            (valueClass ?? ""), style: { color: valueColor ?? "#FFFFFF" }, children: value }), subtitle && (_jsx("p", { className: "mt-1 text-xs text-white/50", children: subtitle }))] }), icon && (_jsx("div", { className: "ml-3 flex-shrink-0 rounded-xl bg-white/5 p-2", children: icon }))] }));
};
