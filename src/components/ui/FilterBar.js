import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from 'lucide-react';
import { Input } from './Input';
export const FilterBar = ({ onSearch, searchValue, searchPlaceholder = "Search...", children, className = "" }) => {
    return (_jsxs("div", { className: `
            relative z-0
            flex flex-col gap-4
            md:flex-row md:items-center md:justify-between
            w-full
            overflow-visible
            ${className}
        `, children: [onSearch && (_jsxs("div", { className: "relative flex-1 min-w-[250px] max-w-full", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]", size: 18 }), _jsx(Input, { value: searchValue, onChange: (e) => onSearch(e.target.value), placeholder: searchPlaceholder, className: "pl-10 h-10 w-full" })] })), children && (_jsx("div", { className: "flex flex-wrap items-center justify-end gap-3 flex-shrink-0", children: children }))] }));
};
