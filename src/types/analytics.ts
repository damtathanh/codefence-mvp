// src/types/analytics.ts
// Standardized Analytics Type Definitions for CodFence MVP

/**
 * Placeholder marker for analytics features coming in Phase 3
 */
export interface ComingSoonPlaceholder {
    comingSoon: true;
}

/**
 * Generic analytics state wrapper
 */
export interface AnalyticsState<T> {
    loading: boolean;
    error: string | null;
    data: T | null;
}

/**
 * Date range for analytics queries
 */
export interface AnalyticsDateRange {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
}

// ============================================================================
// SPECIFIC ANALYTICS DATA TYPES
// ============================================================================

/**
 * Overview/Dashboard Analytics
 */
export interface OverviewAnalytics {
    totalOrders: number;
    codPending: number;
    codConfirmed: number;
    codCancelled: number;
    revenueConverted: number;
    revenueOther: number;
    dateRange: AnalyticsDateRange;
}

/**
 * Revenue Analytics (Daily breakdown + categories)
 */
export interface RevenueAnalytics {
    daily: Array<{
        date: string;
        revenue: number;
    }>;
    breakdown: Array<{
        label: string;
        value: number;
    }>;
}

/**
 * Funnel Analytics (Verification flow steps)
 */
export interface FunnelAnalytics {
    steps: Array<{
        name: string;
        count: number;
        percentage?: number;
    }>;
}

/**
 * Customer Analytics (Segments,demographics)
 */
export interface CustomerAnalytics {
    segments: Array<{
        label: string;
        count: number;
    }>;
    topCustomers?: Array<{
        phone: string;
        orderCount: number;
        totalRevenue: number;
    }>;
}

/**
 * COD-specific Analytics
 */
export interface CodAnalytics {
    totalCodOrders: number;
    pendingReview: number;
    confirmed: number;
    cancelled: number;
    conversionRate: number;
}

/**
 * Risk Analytics
 */
export interface RiskAnalytics {
    averageRiskScore: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    riskDistribution: Array<{
        range: string;
        count: number;
    }>;
}

/**
 * Geographic Analytics
 */
export interface GeoAnalytics {
    provinces: Array<{
        name: string;
        orderCount: number;
        averageRiskScore: number;
        totalRevenue: number;
    }>;
}

/**
 * Order Analytics (Trends, statuses)
 */
export interface OrdersAnalytics {
    statusBreakdown: Array<{
        status: string;
        count: number;
    }>;
    trends: Array<{
        date: string;
        count: number;
    }>;
}

/**
 * Product Analytics
 */
export interface ProductAnalytics {
    topProducts: Array<{
        productId: string;
        productName: string;
        orderCount: number;
        revenue: number;
    }>;
}

/**
 * Channel Analytics
 */
export interface ChannelAnalytics {
    channels: Array<{
        name: string;
        orderCount: number;
        revenue: number;
    }>;
}

/**
 * Financial Analytics
 */
export interface FinancialAnalytics {
    grossRevenue: number;
    netRevenue: number;
    refunds: number;
    shippingProfit: number;
    breakdown: Array<{
        label: string;
        amount: number;
    }>;
}

// ============================================================================
// UNION TYPES FOR ALL ANALYTICS
// ============================================================================

export type AnyAnalyticsData =
    | OverviewAnalytics
    | RevenueAnalytics
    | FunnelAnalytics
    | CustomerAnalytics
    | CodAnalytics
    | RiskAnalytics
    | GeoAnalytics
    | OrdersAnalytics
    | ProductAnalytics
    | ChannelAnalytics
    | FinancialAnalytics
    | ComingSoonPlaceholder;

/**
 * Helper to check if analytics data is a "coming soon" placeholder
 */
export function isComingSoon(data: any): data is ComingSoonPlaceholder {
    return data?.comingSoon === true;
}
