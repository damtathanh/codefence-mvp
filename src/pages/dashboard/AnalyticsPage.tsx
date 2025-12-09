import React, { useState } from 'react';
import { DateRangeSelector } from '../../components/dashboard/DateRangeSelector';
import { AnalyticsTabsHeader, type AnalyticsTabKey } from '../../features/analytics/components/AnalyticsTabsHeader';
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

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>('revenue');

  const {
    dateRange,
    customFrom,
    customTo,
    setDateRange,
    setCustomFrom,
    setCustomTo,
  } = useAnalyticsDateRangeStore();

  return (
    // ⬇️ Layout riêng cho Analytics: full height, KHÔNG padding top
    <div className="flex flex-col h-full min-h-0 px-6 pt-0 pb-4">
      {/* Hàng Tabs + DateRange cùng 1 row, dính sát topbar */}
      <div className="border-b border-slate-800">
        <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          {/* Tabs bên trái, có scroll ngang nếu 10 tabs nhiều */}
          <div className="flex-1 overflow-x-auto">
            <AnalyticsTabsHeader
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* Date range sát bên phải */}
          <div className="shrink-0">
            <DateRangeSelector
              value={dateRange}
              onChange={setDateRange}
              customFrom={customFrom}
              customTo={customTo}
              onChangeCustomFrom={setCustomFrom}
              onChangeCustomTo={setCustomTo}
            />
          </div>
        </div>
      </div>

      {/* Tab content chiếm phần còn lại của viewport */}
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {activeTab === "revenue" && (
          <RevenueTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "orders" && (
          <OrdersTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "risk" && (
          <RiskTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "operations" && (
          <OperationsTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "customers" && (
          <CustomersTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "products" && (
          <ProductsTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "channels" && (
          <ChannelsTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "geo" && (
          <GeoTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "funnel" && (
          <FunnelTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
      </div>
    </div>
  );
};
