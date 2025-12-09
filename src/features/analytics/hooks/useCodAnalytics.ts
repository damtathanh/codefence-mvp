import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface AnalyticsHookOptions {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export function useCodAnalytics({ dateRange, customFrom, customTo }: AnalyticsHookOptions) {
    return {
        loading: false,
        error: null,
        data: null,
    };
}
