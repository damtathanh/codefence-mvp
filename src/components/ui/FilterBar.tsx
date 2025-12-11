import React, { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';

interface FilterBarProps {
    onSearch?: (term: string) => void;
    searchValue?: string;
    searchPlaceholder?: string;
    children?: ReactNode; // For extra filters like Status Dropdown, DatePicker, etc.
    className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    onSearch,
    searchValue,
    searchPlaceholder = "Search...",
    children,
    className = ""
}) => {
    return (
        <div className={`
            relative z-0
            flex flex-col gap-4
            md:flex-row md:items-center md:justify-between
            w-full
            overflow-visible
            ${className}
        `}>
            {onSearch && (
                <div className="relative flex-1 min-w-[250px] max-w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <Input
                        value={searchValue}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-10 h-10 w-full"
                    />
                </div>
            )}
            {children && (
                <div className="flex flex-wrap items-center justify-end gap-3 flex-shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
};
