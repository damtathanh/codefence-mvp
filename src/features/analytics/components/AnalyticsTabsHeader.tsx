import React from 'react';

export type AnalyticsTabKey =
    | "overview"
    | "orders"
    | "cod"
    | "risk"
    | "funnel"
    | "geo"
    | "customers"
    | "products"
    | "channels"
    | "financial";

interface AnalyticsTabsHeaderProps {
    activeTab: AnalyticsTabKey;
    onChange: (tab: AnalyticsTabKey) => void;
}

const tabs: { key: AnalyticsTabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "orders", label: "Orders" },
    { key: "cod", label: "COD & Boom" },
    { key: "risk", label: "Risk" },
    { key: "funnel", label: "Verification" },
    { key: "geo", label: "Geo Risk" },
    { key: "customers", label: "Customers" },
    { key: "products", label: "Products" },
    { key: "channels", label: "Channels" },
    { key: "financial", label: "Financial" },
];

export const AnalyticsTabsHeader: React.FC<AnalyticsTabsHeaderProps> = ({ activeTab, onChange }) => {
    return (
        <div className="border-b border-white/10 overflow-x-auto">
            <div className="flex gap-6 min-w-max">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onChange(tab.key)}
                        className={`pb-4 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === tab.key
                                ? "text-[#8B5CF6]"
                                : "text-[#E5E7EB]/60 hover:text-white"
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8B5CF6] rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
