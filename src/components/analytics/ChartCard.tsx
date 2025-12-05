import React from "react";

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    compact?: boolean;
    className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
    title,
    subtitle,
    children,
    compact,
    className,
}) => {
    const contentHeight = compact ? "h-[150px]" : "h-52 md:h-64";

    return (
        <div
            className={
                "rounded-2xl bg-[#020617] border border-white/20 shadow-[0_0_0_1px_rgba(148,163,184,0.25)] p-4 h-full " +
                (className ?? "")
            }
        >
            <div className="mb-2">
                <h3 className="text-sm font-medium text-white">{title}</h3>
                {subtitle && (
                    <p className="text-xs text-white/50">{subtitle}</p>
                )}
            </div>
            <div className={contentHeight}>{children}</div>
        </div>
    );
};
