import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    className = '',
}) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return (
        <div className={`flex items-center justify-between text-xs text-white/60 px-4 pb-4 ${className}`}>
            <div>
                Showing{" "}
                {totalItems === 0
                    ? 0
                    : (currentPage - 1) * pageSize + 1}{" "}
                –{" "}
                {Math.min(currentPage * pageSize, totalItems)}{" "}
                of {totalItems} items
            </div>

            <div className="flex items-center gap-1">
                <button
                    className="px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                >
                    Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                    )
                    .map((page) => (
                        <button
                            key={page}
                            className={`px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors ${page === currentPage ? "bg-[#4C1D95] border-[#7C3AED] text-white" : ""
                                }`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    ))}

                <button
                    className="px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5 transition-colors"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                >
                    Next
                </button>
            </div>
        </div>
    );
};
