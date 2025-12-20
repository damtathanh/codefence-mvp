// src/types/analytics.ts
// Standardized Analytics Type Definitions for CodFence MVP
/**
 * Helper to check if analytics data is a "coming soon" placeholder
 */
export function isComingSoon(data) {
    return data?.comingSoon === true;
}
