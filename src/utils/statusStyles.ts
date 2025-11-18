import type { OrderStatus } from "../constants/orderStatus";
import { ORDER_STATUS } from "../constants/orderStatus";

export const statusStyles: Record<OrderStatus, string> = {
  // ✅ SUCCESS / COMPLETED (green)
  [ORDER_STATUS.ORDER_PAID]: "bg-green-600/20 text-green-300 border-green-600/40",
  [ORDER_STATUS.ORDER_CONFIRMED]: "bg-green-600/20 text-green-300 border-green-600/40",
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
};

export function getStatusBadge(status: string | null | undefined) {
  const badgeClass =
    statusStyles[status || ""] ||
    "bg-gray-600/20 text-gray-300 border-gray-600/40";

  return {
    className: badgeClass,
    label: status || "Unknown",
  };
}

