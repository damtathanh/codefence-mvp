import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight } from 'lucide-react';
export const Pagination = ({ currentPage, totalPages, onPageChange, startIndex, endIndex, totalCount, }) => {
    if (totalPages <= 1)
        return null;
    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            // Show all pages if there are few enough
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        }
        else {
            // Always show first page
            pages.push(1);
            if (currentPage > 3) {
                pages.push('...');
            }
            // Show pages around current
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            // Always show last page
            pages.push(totalPages);
        }
        return pages.map((page, index) => {
            if (page === '...') {
                return (_jsx("span", { className: "px-3 py-1 text-[#9CA3AF]", children: "..." }, `ellipsis-${index}`));
            }
            const pageNum = page;
            const isActive = pageNum === currentPage;
            return (_jsx("button", { onClick: () => onPageChange(pageNum), className: `px-3 py-1 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#E5E7EB] hover:bg-white/10'}`, children: pageNum }, pageNum));
        });
    };
    return (_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-t border-white/10", children: [_jsxs("div", { className: "text-sm text-[#9CA3AF]", children: ["Showing ", startIndex, "\u2013", endIndex, " of ", totalCount, " products"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => onPageChange(currentPage - 1), disabled: currentPage === 1, className: "p-2 rounded-lg text-[#E5E7EB] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all", "aria-label": "Previous page", children: _jsx(ChevronLeft, { size: 18 }) }), renderPageNumbers(), _jsx("button", { onClick: () => onPageChange(currentPage + 1), disabled: currentPage === totalPages, className: "p-2 rounded-lg text-[#E5E7EB] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all", "aria-label": "Next page", children: _jsx(ChevronRight, { size: 18 }) })] })] }));
};
