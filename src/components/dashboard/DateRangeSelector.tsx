import React, { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
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
    const [customOpen, setCustomOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const isCustom = value === "custom";

    const handleClick = (range: DashboardDateRange) => {
        onChange(range);
        if (range === "custom") {
            setCustomOpen(true);
        } else {
            setCustomOpen(false);
        }
    };

    // đóng popover khi click ra ngoài
    useEffect(() => {
        if (!customOpen) return;

        const handler = (e: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                setCustomOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [customOpen]);

    return (
        // relative để popover absolute mà không đẩy layout
        <div ref={containerRef} className="relative flex items-center gap-3">
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
                    className={`px-3 py-1 rounded-full transition-all ${isCustom
                        ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                >
                    Custom
                </button>
            </div>

            {/* Popover Custom – nổi bên dưới group, không đẩy header */}
            {customOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-[260px] rounded-xl border border-white/10 bg-slate-950/95 shadow-xl shadow-black/40 backdrop-blur-xl p-3 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="mb-2 text-xs font-medium text-white/70">
                        Custom range
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* From */}
                        <label className="flex items-center gap-2 text-[11px] text-white/60">
                            <span className="w-10">From</span>
                            <div className="relative flex-1">
                                <input
                                    type="date"
                                    className="h-9 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 pr-7 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent appearance-none"
                                    value={customFrom ?? ""}
                                    onChange={(e) =>
                                        onChangeCustomFrom(e.target.value || undefined)
                                    }
                                />
                                <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
                            </div>
                        </label>

                        {/* To */}
                        <label className="flex items-center gap-2 text-[11px] text-white/60">
                            <span className="w-10">To</span>
                            <div className="relative flex-1">
                                <input
                                    type="date"
                                    className="h-9 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 pr-7 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent appearance-none"
                                    value={customTo ?? ""}
                                    onChange={(e) =>
                                        onChangeCustomTo(e.target.value || undefined)
                                    }
                                />
                                <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
                            </div>
                        </label>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            className="px-2 py-1 text-[11px] rounded-md text-white/60 hover:text-white hover:bg-white/5"
                            onClick={() => {
                                onChangeCustomFrom(undefined);
                                onChangeCustomTo(undefined);
                            }}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1 text-[11px] rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                            onClick={() => setCustomOpen(false)}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
