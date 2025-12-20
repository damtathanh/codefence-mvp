import { ORDER_STATUS, OrderStatus } from "../../../constants/orderStatus";

type TransitionMap = Record<OrderStatus, OrderStatus[]>;

/**
 * Defines allowed transitions for each order status.
 * This is a strict enforcement of the business logic flow.
 */
const VALID_TRANSITIONS: TransitionMap = {
    [ORDER_STATUS.PENDING_REVIEW]: [
        ORDER_STATUS.VERIFICATION_REQUIRED,
        ORDER_STATUS.ORDER_APPROVED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_PAID, // If paid via other channel immediately
    ],
    [ORDER_STATUS.VERIFICATION_REQUIRED]: [
        ORDER_STATUS.ORDER_APPROVED,
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_PAID,
    ],
    [ORDER_STATUS.ORDER_CONFIRMATION_SENT]: [
        ORDER_STATUS.CUSTOMER_CONFIRMED,
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.ORDER_REJECTED, // Can still reject if something comes up
        ORDER_STATUS.DELIVERING,
    ],
    [ORDER_STATUS.ORDER_APPROVED]: [
        ORDER_STATUS.ORDER_CONFIRMATION_SENT, // If manual flow
        ORDER_STATUS.CUSTOMER_CONFIRMED, // If auto flow or direct confirm
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.DELIVERING, // Skip confirm step?
        ORDER_STATUS.ORDER_REJECTED,
    ],
    [ORDER_STATUS.CUSTOMER_CONFIRMED]: [
        ORDER_STATUS.DELIVERING,
        ORDER_STATUS.ORDER_PAID,
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED, // Last minute reject
    ],
    [ORDER_STATUS.DELIVERING]: [
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.ORDER_PAID, // Can happen during delivery (COD)
        ORDER_STATUS.CUSTOMER_CANCELLED, // Return?
        ORDER_STATUS.CUSTOMER_UNREACHABLE,
        ORDER_STATUS.ORDER_REJECTED, // Failed delivery -> Rejected/Returned?
        ORDER_STATUS.RETURNED,
        ORDER_STATUS.EXCHANGED,
    ],
    [ORDER_STATUS.ORDER_PAID]: [
        ORDER_STATUS.DELIVERING,
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CUSTOMER_CANCELLED, // Refund needed
        ORDER_STATUS.ORDER_REJECTED, // Refund needed
    ],
    [ORDER_STATUS.COMPLETED]: [
        // Terminal state, but maybe allow reopening or refund?
        // For now, allow nothing or specific admin overrides?
        // Let's allow moving to Refund/Return statuses if they existed, but they don't seem to be in ORDER_STATUS enum (Refunded was removed).
        // So COMPLETED is mostly terminal.
        ORDER_STATUS.ORDER_PAID, // Just in case
        ORDER_STATUS.RETURNED,
        ORDER_STATUS.EXCHANGED,
    ],
    [ORDER_STATUS.CUSTOMER_CANCELLED]: [
        // Terminal usually, but maybe reopen?
        ORDER_STATUS.PENDING_REVIEW, // Reopen
    ],
    [ORDER_STATUS.ORDER_REJECTED]: [
        // Terminal usually, but maybe reopen?
        ORDER_STATUS.PENDING_REVIEW, // Reopen
    ],
    [ORDER_STATUS.CUSTOMER_UNREACHABLE]: [
        ORDER_STATUS.PENDING_REVIEW, // Retry
        ORDER_STATUS.ORDER_REJECTED,
        ORDER_STATUS.CUSTOMER_CANCELLED,
    ],
    [ORDER_STATUS.RETURNED]: [
        ORDER_STATUS.PENDING_REVIEW, // Allow reopening if mistake
    ],
    [ORDER_STATUS.EXCHANGED]: [
        ORDER_STATUS.PENDING_REVIEW, // Allow reopening if mistake
    ],
};

/**
 * Validates if a transition from currentStatus to newStatus is allowed.
 * @param currentStatus The current status of the order.
 * @param newStatus The target status.
 * @returns true if valid, false otherwise.
 */
export function canTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    if (currentStatus === newStatus) return true;

    // If current status is not in map (e.g. unknown/legacy), allow transition to get out of it
    if (!VALID_TRANSITIONS[currentStatus]) return true;

    const allowed = VALID_TRANSITIONS[currentStatus];
    return allowed.includes(newStatus);
}

/**
 * Throws an error if the transition is invalid.
 */
export function validateOrderTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    if (!canTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid order status transition from "${currentStatus}" to "${newStatus}"`);
    }
}
