import React from "react";

interface AnalyticsLayoutProps {
    /** 4 summary cards at the top */
    summaryCards: React.ReactNode[];

    /** Optional: simple chart grid (up to 6 items) */
    charts?: React.ReactNode[];

    /** Height for each chart in the grid (px) – default 200 */
    chartHeight?: number;

    /** Optional: custom content under the grid (map, "coming soon", etc.) */
    children?: React.ReactNode;
}

export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
    summaryCards,
    charts,
    chartHeight = 200,
    children,
}) => {
    const hasCharts = charts && charts.length > 0;

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 px-[10px] pb-[10px]">
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card, idx) => (
                    <div key={idx}>{card}</div>
                ))}
            </div>

            {/* Body: chart grid + optional custom content */}
            <div className="flex-1 min-h-0 flex flex-col gap-3">
                {hasCharts && (
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        {charts!.map((chart, idx) => (
                            <div
                                key={idx}
                                className="h-[200px]"
                                style={{ height: chartHeight }}
                            >
                                {chart}
                            </div>
                        ))}
                    </div>
                )}

                {children && (
                    <div className="flex-1 min-h-0">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};
