import React from "react";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    valueColor?: string;
    className?: string;
    titleClass?: string;
    valueClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    valueColor,
    className,
    titleClass,
    valueClass,
}) => {
    return (
        <div
            className={
                "rounded-2xl bg-[#020617] border border-white/20 shadow-[0_0_0_1px_rgba(148,163,184,0.25)] p-4 flex items-start justify-between " +
                (className ?? "")
            }
        >
            <div className="flex-1">
                <h3
                    className={
                        "text-xs font-medium text-white/60 uppercase tracking-wide " +
                        (titleClass ?? "")
                    }
                >
                    {title}
                </h3>
                <p
                    className={
                        "mt-1 text-2xl font-semibold drop-shadow-sm " +
                        (valueClass ?? "")
                    }
                    style={{ color: valueColor ?? "#FFFFFF" }}
                >
                    {value}
                </p>
                {subtitle && (
                    <p className="mt-1 text-xs text-white/50">{subtitle}</p>
                )}
            </div>
            {icon && (
                <div className="ml-3 flex-shrink-0 rounded-xl bg-white/5 p-2">
                    {icon}
                </div>
            )}
        </div>
    );
};
