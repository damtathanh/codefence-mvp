import React from 'react';
import type { DashboardDateRange } from '../../features/dashboard/useDashboardStats';

interface DateRangeSelectorProps {
    value: DashboardDateRange;
    onChange: (value: DashboardDateRange) => void;
    customFrom?: string;
    customTo?: string;
    onChangeCustomFrom: (value?: string) => void;
    onChangeCustomTo: (value?: string) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
    value,
    onChange,
    customFrom,
    customTo,
    onChangeCustomFrom,
    onChangeCustomTo,
}) => {
    const handleClick = (range: DashboardDateRange) => {
        onChange(range);
    };

    const isCustom = value === "custom";

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-white/60 hidden sm:inline-block">
                Date Range
            </span>

            {/* Button group */}
            <div className="inline-flex rounded-full bg-slate-900/80 p-1 text-xs border border-white/10">
                <button
                    type="button"
                    onClick={() => handleClick("today")}
                    className={`px-3 py-1 rounded-full transition-all ${value === "today"
                            ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                >
                    Today
                </button>
                <button
                    type="button"
                    onClick={() => handleClick("last_week")}
                    className={`px-3 py-1 rounded-full transition-all ${value === "last_week"
                            ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                >
                    Last 7 Days
                </button>
                <button
                    type="button"
                    onClick={() => handleClick("last_month")}
                    className={`px-3 py-1 rounded-full transition-all ${value === "last_month"
                            ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                >
                    Last 30 Days
                </button>
                <button
                    type="button"
                    onClick={() => handleClick("custom")}
                    className={`px-3 py-1 rounded-full transition-all ${value === "custom"
                            ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                >
                    Custom
                </button>
            </div>

            {/* Custom range pickers */}
            {isCustom && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                    <input
                        type="date"
                        className="h-8 rounded-lg border border-white/10 bg-slate-950/80 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                        value={customFrom ?? ""}
                        onChange={(e) =>
                            onChangeCustomFrom(e.target.value || undefined)
                        }
                    />
                    <span className="text-xs text-white/50">→</span>
                    <input
                        type="date"
                        className="h-8 rounded-lg border border-white/10 bg-slate-950/80 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                        value={customTo ?? ""}
                        onChange={(e) => onChangeCustomTo(e.target.value || undefined)}
                    />
                </div>
            )}
        </div>
    );
};
