import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DateRangeSelector } from '../../components/dashboard/DateRangeSelector';
import { AnalyticsTabsHeader } from '../../features/analytics/components/AnalyticsTabsHeader';
import { RevenueTab } from '../../features/analytics/components/RevenueTab';
import { OrdersTab } from '../../features/analytics/components/OrdersTab';
import { RiskTab } from '../../features/analytics/components/RiskTab';
import { OperationsTab } from '../../features/analytics/components/OperationsTab';
import { FunnelTab } from '../../features/analytics/components/FunnelTab';
import { GeoTab } from '../../features/analytics/components/GeoTab';
import { CustomersTab } from '../../features/analytics/components/CustomersTab';
import { ProductsTab } from '../../features/analytics/components/ProductsTab';
import { ChannelsTab } from '../../features/analytics/components/ChannelsTab';
import { useAnalyticsDateRangeStore } from '../../features/analytics/store/useAnalyticsDateRangeStore';
export const AnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState('revenue');
    const { dateRange, customFrom, customTo, setDateRange, setCustomFrom, setCustomTo, } = useAnalyticsDateRangeStore();
    return (
    // ⬇️ Layout riêng cho Analytics: full height, KHÔNG padding top
    _jsxs("div", { className: "flex flex-col h-full min-h-0 px-6 pt-0 pb-4", children: [_jsx("div", { className: "border-b border-slate-800", children: _jsxs("div", { className: "flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6", children: [_jsx("div", { className: "flex-1 overflow-x-auto", children: _jsx(AnalyticsTabsHeader, { activeTab: activeTab, onChange: setActiveTab }) }), _jsx("div", { className: "shrink-0", children: _jsx(DateRangeSelector, { value: dateRange, onChange: setDateRange, customFrom: customFrom, customTo: customTo, onChangeCustomFrom: setCustomFrom, onChangeCustomTo: setCustomTo }) })] }) }), _jsxs("div", { className: "mt-3 min-h-0 flex-1 overflow-hidden", children: [activeTab === "revenue" && (_jsx(RevenueTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "orders" && (_jsx(OrdersTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "risk" && (_jsx(RiskTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "operations" && (_jsx(OperationsTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "customers" && (_jsx(CustomersTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "products" && (_jsx(ProductsTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "channels" && (_jsx(ChannelsTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "geo" && (_jsx(GeoTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo })), activeTab === "funnel" && (_jsx(FunnelTab, { dateRange: dateRange, customFrom: customFrom, customTo: customTo }))] })] }));
};
