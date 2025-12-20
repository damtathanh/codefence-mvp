// src/features/analytics/store/useAnalyticsDateRangeStore.ts
import { create } from 'zustand';
// Default của m hiện đang là "last_month" (Last 30 Days)
const DEFAULT_DATE_RANGE = 'last_month';
export const useAnalyticsDateRangeStore = create((set) => ({
    dateRange: DEFAULT_DATE_RANGE,
    customFrom: undefined,
    customTo: undefined,
    setDateRange: (value) => set({
        dateRange: value,
        // nếu user đổi sang Today / Last 7 Days / Last 30 Days thì clear custom
        ...(value !== 'custom' ? { customFrom: undefined, customTo: undefined } : {}),
    }),
    setCustomFrom: (value) => set({
        customFrom: value,
        // khi đã chọn custom date thì preset phải là 'custom'
        dateRange: 'custom',
    }),
    setCustomTo: (value) => set({
        customTo: value,
        dateRange: 'custom',
    }),
    reset: () => set({
        dateRange: DEFAULT_DATE_RANGE,
        customFrom: undefined,
        customTo: undefined,
    }),
}));
