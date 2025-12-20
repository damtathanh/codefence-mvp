import { ORDER_STATUS } from '../constants/orderStatus';
export function mapStatusToLifecycle(status) {
    switch (status) {
        case ORDER_STATUS.PENDING_REVIEW:
        case ORDER_STATUS.VERIFICATION_REQUIRED:
            return 'Pending';
        case ORDER_STATUS.ORDER_CONFIRMATION_SENT:
            return 'Sent';
        case ORDER_STATUS.ORDER_APPROVED:
        case ORDER_STATUS.CUSTOMER_CONFIRMED:
            return 'Confirmed';
        case ORDER_STATUS.CUSTOMER_CANCELLED:
        case ORDER_STATUS.ORDER_REJECTED:
            return 'Cancelled';
        case ORDER_STATUS.ORDER_PAID:
            return 'Paid';
        case ORDER_STATUS.DELIVERING:
            return 'Delivering';
        case ORDER_STATUS.COMPLETED:
            return 'Completed';
        default:
            return 'Pending';
    }
}
