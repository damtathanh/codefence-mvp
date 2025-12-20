import { jsx as _jsx } from "react/jsx-runtime";
export const RiskBadge = ({ score }) => {
    if (score === null || score === undefined) {
        return (_jsx("span", { className: "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap bg-slate-700/40 text-slate-300 border-slate-600/50", children: "N/A" }));
    }
    const roundedScore = Math.round(score);
    let className = "";
    if (roundedScore <= 30) {
        // Green
        className = "bg-emerald-600/20 text-emerald-300 border-emerald-500/60";
    }
    else if (roundedScore <= 70) {
        // Yellow/Amber
        className = "bg-amber-600/20 text-amber-200 border-amber-500/60";
    }
    else {
        // Red
        className = "bg-red-600/20 text-red-300 border-red-500/60";
    }
    return (_jsx("span", { className: [
            "inline-flex items-center justify-center",
            "rounded-full border",
            "px-3 py-1",
            "text-xs font-medium",
            "whitespace-nowrap",
            className,
        ].join(" "), children: roundedScore }));
};
