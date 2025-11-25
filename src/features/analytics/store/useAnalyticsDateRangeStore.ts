// src/features/analytics/store/useAnalyticsDateRangeStore.ts
import { create } from 'zustand';
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface AnalyticsDateRangeState {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
    setDateRange: (value: DashboardDateRange) => void;
    setCustomFrom: (value?: string) => void;
    setCustomTo: (value?: string) => void;
    reset: () => void;
}

// Default của m hiện đang là "last_month" (Last 30 Days)
const DEFAULT_DATE_RANGE: DashboardDateRange = 'last_month';

export const useAnalyticsDateRangeStore = create<AnalyticsDateRangeState>((set) => ({
    dateRange: DEFAULT_DATE_RANGE,
    customFrom: undefined,
    customTo: undefined,

    setDateRange: (value) =>
        set({
            dateRange: value,
            // nếu user đổi sang Today / Last 7 Days / Last 30 Days thì clear custom
            ...(value !== 'custom' ? { customFrom: undefined, customTo: undefined } : {}),
        }),

    setCustomFrom: (value) =>
        set({
            customFrom: value,
            // khi đã chọn custom date thì preset phải là 'custom'
            dateRange: 'custom' as DashboardDateRange,
        }),

    setCustomTo: (value) =>
        set({
            customTo: value,
            dateRange: 'custom' as DashboardDateRange,
        }),

    reset: () =>
        set({
            dateRange: DEFAULT_DATE_RANGE,
            customFrom: undefined,
            customTo: undefined,
        }),
}));
