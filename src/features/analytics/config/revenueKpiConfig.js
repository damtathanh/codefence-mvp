// Target theo mode (tạm hard-code, sau này có thể cho user chỉnh)
export const REVENUE_KPI_TARGETS = {
    month: 100000000,
    quarter: 300000000,
    year: 1200000000,
};
// Label hiển thị cho button
export const REVENUE_KPI_LABELS = {
    month: "Monthly",
    quarter: "Quarterly",
    year: "Yearly",
};
// Các chip hiển thị bên dưới – hiện tại chỉ là text, sau này có thể bind số liệu
export const REVENUE_KPI_CHIPS = {
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    quarter: ["Q1", "Q2", "Q3", "Q4"],
    year: ["This Year"],
};
export const calculateRevenueKpi = (actual, target) => {
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
