import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { isAllSelected, toggleAllOption, toggleSingleOption, getMultiSelectDisplayText, } from '../../utils/multiSelectUtils';
/**
 * Unified multi-select filter dropdown component
 *
 * Features:
 * - "All {label}" option that selects/deselects all options
 * - Individual option selection
 * - Automatic "All" unchecking when any option is deselected
 * - z-index 50 to render above tables/cards
 * - Click-outside-to-close behavior
 */
export const MultiSelectFilter = ({ label, options, selectedValues, onChange, placeholder = 'Select...', className = '', }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    // Get all option values for "All" logic
    const allOptionValues = options.map(opt => opt.value);
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);
    const handleToggleAll = () => {
        const allSelected = isAllSelected(selectedValues, allOptionValues);
        if (allSelected) {
            // If all is selected, deselect all (empty array = no filter)
            onChange([]);
        }
        else {
            // Select all individual options
            onChange(toggleAllOption(allOptionValues));
        }
    };
    const handleToggleSingle = (value) => {
        const newValues = toggleSingleOption(selectedValues, value, allOptionValues);
        onChange(newValues);
    };
    const allSelected = isAllSelected(selectedValues, allOptionValues);
    const displayValue = getMultiSelectDisplayText(selectedValues, allOptionValues, label);
    return (_jsxs("div", { className: `relative z-[70] overflow-visible ${className}`, ref: containerRef, children: [_jsxs("button", { type: "button", onClick: () => setIsOpen(!isOpen), className: `flex items-center justify-between px-3 py-2 text-sm text-[#E5E7EB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] 
                    bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg
                    whitespace-nowrap min-w-[180px] h-10`, children: [_jsx("span", { className: "truncate", children: displayValue }), _jsx(ChevronDown, { size: 16, className: `text-[#9CA3AF] flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}` })] }), isOpen && (_jsxs("div", { className: "absolute left-0 top-full mt-1 z-[9999] origin-top w-full bg-[#1F2937] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto", children: [_jsxs("div", { className: "px-3 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-sm text-[#E5E7EB] border-b border-white/5", onClick: handleToggleAll, children: [_jsx("div", { className: `w-4 h-4 border rounded flex items-center justify-center transition-colors ${allSelected
                                    ? 'bg-[#8B5CF6] border-[#8B5CF6]'
                                    : 'border-white/30'}`, children: allSelected && _jsx(Check, { size: 12, className: "text-white" }) }), _jsxs("span", { className: "font-medium", children: ["All ", label] })] }), options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (_jsxs("div", { className: "px-3 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-sm text-[#E5E7EB] transition-colors", onClick: () => handleToggleSingle(option.value), children: [_jsx("div", { className: `w-4 h-4 border rounded flex items-center justify-center transition-colors ${isSelected
                                        ? 'bg-[#8B5CF6] border-[#8B5CF6]'
                                        : 'border-white/30'}`, children: isSelected && _jsx(Check, { size: 12, className: "text-white" }) }), _jsx("span", { children: option.label })] }, option.value));
                    })] }))] }));
};
