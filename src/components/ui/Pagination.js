import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, className = '', }) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    return (_jsxs("div", { className: `flex items-center justify-between text-xs text-white/60 px-4 pb-4 ${className}`, children: [_jsxs("div", { children: ["Showing", " ", totalItems === 0
                        ? 0
                        : (currentPage - 1) * pageSize + 1, " ", "\u2013", " ", Math.min(currentPage * pageSize, totalItems), " ", "of ", totalItems, " items"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { className: "px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors", disabled: currentPage === 1, onClick: () => onPageChange(Math.max(1, currentPage - 1)), children: "Prev" }), Array.from({ length: totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                        .map((page) => (_jsx("button", { className: `px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors ${page === currentPage ? "bg-[#4C1D95] border-[#7C3AED] text-white" : ""}`, onClick: () => onPageChange(page), children: page }, page))), _jsx("button", { className: "px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors", disabled: currentPage === totalPages, onClick: () => onPageChange(Math.min(totalPages, currentPage + 1)), children: "Next" })] })] }));
};
