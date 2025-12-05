import React from "react";

interface AnalyticsLayoutProps {
    /** 4 thẻ summary phía trên */
    summaryCards: React.ReactNode[];

    /** Tối đa 6 chart (2 hàng x 3) phía dưới */
    charts: React.ReactNode[];

    /** Chiều cao mỗi chart (px) – mặc định 200 */
    chartHeight?: number;
}

/**
 * Layout chuẩn cho tất cả tabs Analytics:
 * - Hàng trên: 4 summary cards (1–4 tùy bạn, nhưng thường là 4)
 * - Hàng dưới: grid 3 cột, tối đa 6 chart, mỗi chart có chiều cao cố định
 */
export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
    summaryCards,
    charts,
    chartHeight = 200,
}) => {
    return (
        <div className="flex h-full min-h-0 flex-col gap-3">
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card, idx) => (
                    <div key={idx}>{card}</div>
                ))}
            </div>

            {/* CHART GRID: 2 rows x 3 (trên màn hình rộng) */}
            <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 xl:grid-cols-3">
                {charts.map((chart, idx) => (
                    <div
                        key={idx}
                        className="h-[200px]"           // để Tailwind giữ đúng chiều cao cơ bản
                        style={{ height: chartHeight }} // chartHeight có thể custom khi cần
                    >
                        {chart}
                    </div>
                ))}
            </div>
        </div>
    );
};
