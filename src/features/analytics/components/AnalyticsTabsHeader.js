import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const tabs = [
    { key: "revenue", label: "Revenue" },
    { key: "orders", label: "Orders" },
    { key: "risk", label: "Risk" },
    { key: "customers", label: "Customers" },
    { key: "products", label: "Products" },
    { key: "channels", label: "Channels" },
    { key: "geo", label: "Geo Risk" },
    { key: "funnel", label: "Verification" },
    { key: "operations", label: "Operations" },
];
export const AnalyticsTabsHeader = ({ activeTab, onChange, }) => {
    return (_jsx("nav", { className: "overflow-x-auto", children: _jsx("div", { className: "flex gap-6 min-w-max", children: tabs.map((tab) => (_jsxs("button", { onClick: () => onChange(tab.key), className: `relative whitespace-nowrap text-sm font-medium transition-all py-2 ${activeTab === tab.key
                    ? "text-[#8B5CF6]"
                    : "text-[#E5E7EB]/60 hover:text-white"}`, children: [tab.label, activeTab === tab.key && (_jsx("span", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#8B5CF6] rounded-t-full" }))] }, tab.key))) }) }));
};
