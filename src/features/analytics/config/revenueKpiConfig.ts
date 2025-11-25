import type { DashboardDateRange } from "../../dashboard/useDashboardStats";

// Mode cho KPI selector
export type RevenueKpiMode = "month" | "quarter" | "year";

// Target theo mode (tạm hard-code, sau này có thể cho user chỉnh)
export const REVENUE_KPI_TARGETS: Record<RevenueKpiMode, number> = {
    month: 100_000_000,
    quarter: 300_000_000,
    year: 1_200_000_000,
};

// Label hiển thị cho button
export const REVENUE_KPI_LABELS: Record<RevenueKpiMode, string> = {
    month: "Monthly",
    quarter: "Quarterly",
    year: "Yearly",
};

// Các chip hiển thị bên dưới – hiện tại chỉ là text, sau này có thể bind số liệu
export const REVENUE_KPI_CHIPS: Record<RevenueKpiMode, string[]> = {
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    quarter: ["Q1", "Q2", "Q3", "Q4"],
    year: ["This Year"],
};

export interface RevenueKpiResult {
    percent: number;        // Real percentage (e.g. 134)
    clampedPercent: number; // Clamped for gauge (e.g. 100 or 120)
    isOverTarget: boolean;
}

export const calculateRevenueKpi = (actual: number, target: number): RevenueKpiResult => {
    if (!target || target <= 0) {
        return { percent: 0, clampedPercent: 0, isOverTarget: false };
    }

    const percent = Math.round((actual / target) * 100);
    const isOverTarget = percent >= 100;

    // Clamp for gauge display: max 100% (full circle) or slightly more if we want to show overflow
    // User requested: clamp display at 120% max
    const clampedPercent = Math.min(percent, 120);

    return { percent, clampedPercent, isOverTarget };
};
