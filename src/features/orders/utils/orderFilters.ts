import type { Order } from '../../../types/supabase';

/**
 * Check if a filter array is effectively "all" (empty or contains 'all')
 */
export function isAllFilter(selected: string[] | undefined | null): boolean {
    return !selected || selected.length === 0 || selected.includes('all');
}

/**
 * Check if an order's status matches the status filter
 */
export function matchesStatusFilter(
    orderStatus: string | null | undefined,
    statusFilter: string[] | undefined | null
): boolean {
    if (isAllFilter(statusFilter)) return true;
    if (!orderStatus || !statusFilter) return false;
    return statusFilter.includes(orderStatus);
}

/**
 * Check if an order's payment method matches the payment method filter
 * COD logic: when 'COD' is selected, it matches both 'COD' and null/empty payment methods
 */
export function matchesPaymentMethodFilter(
    order: Order,
    paymentMethods: string[] | undefined | null
): boolean {
    if (isAllFilter(paymentMethods)) return true;
    if (!paymentMethods) return false;

    const method = (order.payment_method || 'COD').trim() || 'COD';
    const hasCOD = paymentMethods.includes('COD');
    const nonCodMethods = paymentMethods.filter((m) => m !== 'COD');

    // Match if it's COD and filter includes COD
    if (hasCOD && method === 'COD') return true;

    // Match if it's a non-COD method and filter includes it
    if (nonCodMethods.includes(method)) return true;

    return false;
}

/**
 * Check if an order's risk score matches the risk filter buckets
 * Buckets: low (0-30), medium (30-70), high (70+)
 */
export function matchesRiskFilter(
    riskScore: number | null | undefined,
    riskBuckets: string[] | undefined | null
): boolean {
    if (isAllFilter(riskBuckets)) return true;
    if (!riskBuckets) return false;

    const score = riskScore || 0;

    // Check if score falls into any selected bucket
    if (riskBuckets.includes('low') && score <= 30) return true;
    if (riskBuckets.includes('medium') && score > 30 && score <= 70) return true;
    if (riskBuckets.includes('high') && score > 70) return true;

    return false;
}
