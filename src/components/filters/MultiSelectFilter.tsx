import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
    isAllSelected,
    toggleAllOption,
    toggleSingleOption,
    getMultiSelectDisplayText,
} from '../../utils/multiSelectUtils';

export interface MultiSelectOption {
    value: string;
    label: string;
}

export interface MultiSelectFilterProps {
    label: string;
    options: MultiSelectOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    className?: string;
}

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
export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    placeholder = 'Select...',
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get all option values for "All" logic
    const allOptionValues = options.map(opt => opt.value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
        } else {
            // Select all individual options
            onChange(toggleAllOption(allOptionValues));
        }
    };

    const handleToggleSingle = (value: string) => {
        const newValues = toggleSingleOption(selectedValues, value, allOptionValues);
        onChange(newValues);
    };

    const allSelected = isAllSelected(selectedValues, allOptionValues);
    const displayValue = getMultiSelectDisplayText(selectedValues, allOptionValues, label);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-sm text-[#E5E7EB] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] transition-colors"
            >
                <span className="truncate">{displayValue}</span>
                <ChevronDown
                    size={16}
                    className={`text-[#9CA3AF] flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-[#1F2937] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {/* "All" option */}
                    <div
                        className="px-3 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-sm text-[#E5E7EB] border-b border-white/5"
                        onClick={handleToggleAll}
                    >
                        <div
                            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${allSelected
                                    ? 'bg-[#8B5CF6] border-[#8B5CF6]'
                                    : 'border-white/30'
                                }`}
                        >
                            {allSelected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="font-medium">All {label}</span>
                    </div>

                    {/* Individual options */}
                    {options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                className="px-3 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-sm text-[#E5E7EB] transition-colors"
                                onClick={() => handleToggleSingle(option.value)}
                            >
                                <div
                                    className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${isSelected
                                            ? 'bg-[#8B5CF6] border-[#8B5CF6]'
                                            : 'border-white/30'
                                        }`}
                                >
                                    {isSelected && <Check size={12} className="text-white" />}
                                </div>
                                <span>{option.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
