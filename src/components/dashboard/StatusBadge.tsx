import React from "react";
import { getStatusBadge } from "../../utils/statusStyles";

// Mapping of full status labels to short labels
const shortLabelMap: Record<string, string> = {
  "Customer Confirmed": "Confirmed",
  "Customer Cancelled": "Cancelled",
  "Pending Review": "Pending",
  "Order Paid": "Paid",
  "Verification Required": "Checking",
  "Order Confirmation Sent": "Sent",
  "Customer Unreachable": "Missed",
  "Order Rejected": "Rejected",
};

export const StatusBadge = ({ status }: { status: string | null | undefined }) => {
  const { className, label } = getStatusBadge(status);
  const shortLabel = shortLabelMap[label] || label;

  return (
    <span
      className={[
        "inline-flex items-center justify-center",
        "rounded-full border",
        "px-3 py-1",
        "text-xs font-medium",
        "whitespace-nowrap",
        "truncate max-w-[90px] text-center",
        className,
      ].join(" ")}
    >
      {shortLabel}
    </span>
  );
};

