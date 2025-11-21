import React from 'react';

export function ProductStatusBadge({ status }: { status: string }) {
    const normalized = status?.toLowerCase() || "";

    if (normalized === "active") {
        return (
            <span className="
        inline-flex items-center px-2 py-0.5
        rounded-md text-xs font-medium
        bg-green-500/15 text-green-400 border border-green-500/20
      ">
                Active
            </span>
        );
    }

    // Optional future states
    return (
        <span className="
      inline-flex items-center px-2 py-0.5
      rounded-md text-xs font-medium
      bg-zinc-500/10 text-zinc-300 border border-zinc-500/20
    ">
            {status}
        </span>
    );
}
