import React from "react";

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    compact?: boolean;
    className?: string;
}

export const ChartCard = ({
    title,
    subtitle,
    children,
    compact,
    className,
}: ChartCardProps) => {
    return (
        <div
            tabIndex={-1}
            className={
                [
                    "rounded-2xl border border-white/10 bg-[#020617] p-4 flex flex-col gap-2",
                    "focus:outline-none focus-visible:outline-none",
                    className
                ].filter(Boolean).join(" ")
            }
        >
            {/* Header */}
            <div>
                <h2 className="text-white text-[18px] font-semibold">{title}</h2>
                {subtitle && (
                    <p className="text-white/60 text-[13px] -mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Chart container */}
            <div className={compact ? "h-[180px]" : "h-[240px]"}>
                {children}
            </div>
        </div>
    );
};
