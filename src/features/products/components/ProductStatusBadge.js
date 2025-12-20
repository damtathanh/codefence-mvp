import { jsx as _jsx } from "react/jsx-runtime";
export function ProductStatusBadge({ status }) {
    const normalized = status?.toLowerCase() || "";
    if (normalized === "active") {
        return (_jsx("span", { className: "\n        inline-flex items-center px-2 py-0.5\n        rounded-md text-xs font-medium\n        bg-green-500/15 text-green-400 border border-green-500/20\n      ", children: "Active" }));
    }
    // Optional future states
    return (_jsx("span", { className: "\n      inline-flex items-center px-2 py-0.5\n      rounded-md text-xs font-medium\n      bg-zinc-500/10 text-zinc-300 border border-zinc-500/20\n    ", children: status }));
}
