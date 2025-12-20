import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const PageLayout = ({ title, subtitle, children, actions }) => {
    return (_jsxs("div", { className: "flex flex-col gap-4 p-6 h-full min-h-0", children: [(title || actions) && (_jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4", children: [title && (_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: title }), subtitle && _jsx("p", { className: "text-[#E5E7EB]/60 mt-1", children: subtitle })] })), actions && _jsx("div", { className: "flex items-center gap-3 ml-auto", children: actions })] })), _jsx("div", { className: "flex-1 min-h-0", children: children })] }));
};
