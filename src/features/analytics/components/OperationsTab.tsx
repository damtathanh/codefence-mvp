import React from "react";
import type { DashboardDateRange } from '../../dashboard/useDashboardStats';

interface OperationsTabProps {
    dateRange: DashboardDateRange;
    customFrom?: string;
    customTo?: string;
}

export const OperationsTab: React.FC<OperationsTabProps> = ({ dateRange, customFrom, customTo }) => {
    return (
        <div className="space-y-6 min-h-0">
            <h3 className="text-lg font-semibold text-white">Operations Overview</h3>
            <p className="text-sm text-white/60">
                Cost structure, expenses and operational efficiency analytics.
            </p>

            <div className="bg-[#111827] border border-white/10 rounded-lg p-6 text-white/80">
                <h4 className="text-md font-semibold mb-2">Coming soon</h4>
                <p className="text-sm text-white/60">
                    Soon you will be able to track staff salary, marketing cost, shipping fees,
                    return cost, COD fee and overall operational efficiency.
                </p>
            </div>
        </div>
    );
};
