export const statusStyles: Record<string, string> = {
  // ✅ SUCCESS / COMPLETED (green)
  "Order Paid": "bg-green-600/20 text-green-300 border-green-600/40",
  "Order Confirmed": "bg-green-600/20 text-green-300 border-green-600/40",
  "Completed": "bg-green-600/20 text-green-300 border-green-600/40",

  // ⏳ IN PROGRESS (yellow/amber)
  "Pending Review": "bg-yellow-600/20 text-yellow-300 border-yellow-600/40",
  "Verification Required": "bg-amber-600/20 text-amber-300 border-amber-600/40",
  "Order Confirmation Sent": "bg-yellow-600/20 text-yellow-300 border-yellow-600/40",
  "Delivering": "bg-blue-600/20 text-blue-300 border-blue-600/40",

  // ❌ NEGATIVE (red)
  "Customer Cancelled": "bg-red-600/20 text-red-300 border-red-600/40",
  "Customer Unreachable": "bg-red-600/20 text-red-300 border-red-600/40",
  "Order Rejected": "bg-red-600/20 text-red-300 border-red-600/40",
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

