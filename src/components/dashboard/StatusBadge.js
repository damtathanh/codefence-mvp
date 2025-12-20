import { jsx as _jsx } from "react/jsx-runtime";
import { getStatusBadge } from "../../utils/statusStyles";
// Mapping of full status labels to short labels
const shortLabelMap = {
    "Customer Confirmed": "Confirmed",
    "Customer Cancelled": "Cancelled",
    "Pending Review": "Pending",
    "Order Paid": "Paid",
    "Verification Required": "Checking",
    "Order Confirmation Sent": "Sent",
    "Customer Unreachable": "Missed",
    "Order Rejected": "Rejected",
    "Delivering": "Delivering",
    "Completed": "Completed",
    "Order Approved": "Approved",
    "Returned": "Return ed",
    "Exchanged": "Exchanged"
};
export const StatusBadge = ({ status }) => {
    const { className, label } = getStatusBadge(status);
    const shortLabel = shortLabelMap[label] || label;
    return (_jsx("span", { className: [
            "inline-flex items-center justify-center",
            "rounded-full border",
            "px-3 py-1",
            "text-xs font-medium",
            "whitespace-nowrap",
            "truncate max-w-[90px] text-center",
            className,
        ].join(" "), children: shortLabel }));
};
