import React from "react";
import { getStatusBadge } from "../../utils/statusStyles";

export const StatusBadge = ({ status }: { status: string | null | undefined }) => {
  const { className, label } = getStatusBadge(status);

  return (
    <span
      className={[
        "inline-flex items-center justify-center",
        "rounded-full border",
        "px-3 py-1",
        "text-xs font-medium",
        "whitespace-nowrap",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
};

