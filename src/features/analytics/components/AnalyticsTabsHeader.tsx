import React from 'react';

export type AnalyticsTabKey =
    | "revenue"
    | "orders"
    | "cod"
    | "risk"
    | "operations"
    | "customers"
    | "products"
    | "channels"
    | "geo"
    | "funnel";

interface AnalyticsTabsHeaderProps {
    activeTab: AnalyticsTabKey;
    onChange: (tab: AnalyticsTabKey) => void;
}

const tabs: { key: AnalyticsTabKey; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "orders", label: "Orders" },
    { key: "cod", label: "COD & Boom" },
    { key: "risk", label: "Risk" },
    { key: "customers", label: "Customers" },
    { key: "products", label: "Products" },
    { key: "channels", label: "Channels" },
    { key: "geo", label: "Geo Risk" },
    { key: "funnel", label: "Verification" },
    { key: "operations", label: "Operations" },
];

export const AnalyticsTabsHeader: React.FC<AnalyticsTabsHeaderProps> = ({
    activeTab,
    onChange,
}) => {
    return (
        <nav className="overflow-x-auto">
            <div className="flex gap-6 min-w-max">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onChange(tab.key)}
                        className={`relative whitespace-nowrap text-sm font-medium transition-all py-2 ${activeTab === tab.key
                                ? "text-[#8B5CF6]"
                                : "text-[#E5E7EB]/60 hover:text-white"
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#8B5CF6] rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
};

