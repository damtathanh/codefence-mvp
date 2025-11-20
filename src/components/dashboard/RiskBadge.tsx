import React from "react";

interface RiskBadgeProps {
    score: number | null | undefined;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score }) => {
    if (score === null || score === undefined) {
        return (
            <span className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap bg-slate-700/40 text-slate-300 border-slate-600/50">
                N/A
            </span>
        );
    }

    const roundedScore = Math.round(score);
    let className = "";

    if (roundedScore <= 30) {
        // Green
        className = "bg-emerald-600/20 text-emerald-300 border-emerald-500/60";
    } else if (roundedScore <= 70) {
        // Yellow/Amber
        className = "bg-amber-600/20 text-amber-200 border-amber-500/60";
    } else {
        // Red
        className = "bg-red-600/20 text-red-300 border-red-500/60";
    }

    return (
        <span
            className={[
                "inline-flex items-center justify-center",
                "rounded-full border",
                "px-3 py-1",
                "text-xs font-medium",
                "whitespace-nowrap",
                className,
            ].join(" ")}
        >
            {roundedScore}
        </span>
    );
};
