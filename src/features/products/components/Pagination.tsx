import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    startIndex: number;
    endIndex: number;
    totalCount: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    startIndex,
    endIndex,
    totalCount,
}) => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            // Show all pages if there are few enough
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
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
                return (
                    <span key={`ellipsis-${index}`} className="px-3 py-1 text-[#9CA3AF]">
                        ...
                    </span>
                );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
                <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${isActive
                            ? 'bg-[#8B5CF6] text-white'
                            : 'text-[#E5E7EB] hover:bg-white/10'
                        }`}
                >
                    {pageNum}
                </button>
            );
        });
    };

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            {/* Results info */}
            <div className="text-sm text-[#9CA3AF]">
                Showing {startIndex}–{endIndex} of {totalCount} products
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-[#E5E7EB] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={18} />
                </button>

                {renderPageNumbers()}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-[#E5E7EB] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    aria-label="Next page"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};
