import { ORDER_STATUS } from "../constants/orderStatus";
export const INVOICE_STATUS_STYLES = {
    Pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    Paid: "bg-green-500/20 text-green-300 border-green-500/40",
    Cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};
export const statusStyles = {
    // ✅ SUCCESS / COMPLETED (green)
    [ORDER_STATUS.ORDER_PAID]: "bg-green-600/20 text-green-300 border-green-600/40",
    [ORDER_STATUS.ORDER_APPROVED]: "bg-green-600/20 text-green-300 border-green-600/40",
    [ORDER_STATUS.CUSTOMER_CONFIRMED]: "bg-green-600/20 text-green-300 border-green-600/40",
    [ORDER_STATUS.COMPLETED]: "bg-green-600/20 text-green-300 border-green-600/40",
    // ⏳ IN PROGRESS (yellow/amber)
    [ORDER_STATUS.PENDING_REVIEW]: "bg-yellow-600/20 text-yellow-300 border-yellow-600/40",
    [ORDER_STATUS.VERIFICATION_REQUIRED]: "bg-amber-600/20 text-amber-300 border-amber-600/40",
    [ORDER_STATUS.ORDER_CONFIRMATION_SENT]: "bg-yellow-600/20 text-yellow-300 border-yellow-600/40",
    [ORDER_STATUS.DELIVERING]: "bg-blue-600/20 text-blue-300 border-blue-600/40",
    // ❌ NEGATIVE (red)
    [ORDER_STATUS.CUSTOMER_CANCELLED]: "bg-red-600/20 text-red-300 border-red-600/40",
    [ORDER_STATUS.CUSTOMER_UNREACHABLE]: "bg-red-600/20 text-red-300 border-red-600/40",
    [ORDER_STATUS.ORDER_REJECTED]: "bg-red-600/20 text-red-300 border-red-600/40",
    [ORDER_STATUS.RETURNED]: "bg-purple-600/20 text-purple-300 border-purple-600/40",
    [ORDER_STATUS.EXCHANGED]: "bg-indigo-600/20 text-indigo-300 border-indigo-600/40",
};
export function getStatusBadge(status) {
    const key = status || "";
    // 1️⃣ Invoice Status (ưu tiên nếu trùng)
    if (INVOICE_STATUS_STYLES[key]) {
        return { className: INVOICE_STATUS_STYLES[key], label: key };
    }
    // 2️⃣ Order Status (mapping cũ)
    const badgeClass = statusStyles[key] ||
        "bg-gray-600/20 text-gray-300 border-gray-600/40";
    return {
        className: badgeClass,
        label: key,
    };
}
