import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const ChartCard = ({ title, subtitle, children, compact, className, }) => {
    return (_jsxs("div", { tabIndex: -1, className: [
            "rounded-2xl border border-white/10 bg-[#020617] p-4 flex flex-col gap-2",
            "focus:outline-none focus-visible:outline-none",
            className
        ].filter(Boolean).join(" "), children: [_jsxs("div", { children: [_jsx("h2", { className: "text-white text-[18px] font-semibold", children: title }), subtitle && (_jsx("p", { className: "text-white/60 text-[13px] -mt-0.5", children: subtitle }))] }), _jsx("div", { className: compact ? "h-[180px]" : "h-[240px]", children: children })] }));
};
