import React, { useState } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { DateRangeSelector } from '../../components/dashboard/DateRangeSelector';
import type { DashboardDateRange } from '../../features/dashboard/useDashboardStats';
import { AnalyticsTabsHeader, type AnalyticsTabKey } from '../../features/analytics/components/AnalyticsTabsHeader';
import { OverviewTab } from '../../features/analytics/components/OverviewTab';
import { OrdersTab } from '../../features/analytics/components/OrdersTab';
import { CodTab } from '../../features/analytics/components/CodTab';
import { RiskTab } from '../../features/analytics/components/RiskTab';
import { FunnelTab } from '../../features/analytics/components/FunnelTab';
import { GeoTab } from '../../features/analytics/components/GeoTab';
import { CustomersTab } from '../../features/analytics/components/CustomersTab';
import { ProductsTab } from '../../features/analytics/components/ProductsTab';
import { ChannelsTab } from '../../features/analytics/components/ChannelsTab';
import { FinancialTab } from '../../features/analytics/components/FinancialTab';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>("overview");
  const [dateRange, setDateRange] = useState<DashboardDateRange>("last_month");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();

  return (
    <PageLayout>
      {/* Header row: title + date range on right */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <p className="text-sm text-white/60">
            Key insights about your orders, risk and performance.
          </p>
        </div>

        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          customFrom={customFrom}
          customTo={customTo}
          onChangeCustomFrom={setCustomFrom}
          onChangeCustomTo={setCustomTo}
        />
      </div>

      {/* Tab bar */}
      <AnalyticsTabsHeader
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === "overview" && (
          <OverviewTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "orders" && (
          <OrdersTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "cod" && (
          <CodTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "risk" && (
          <RiskTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "funnel" && (
          <FunnelTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
        {activeTab === "geo" && (
          <GeoTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
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
        {activeTab === "financial" && (
          <FinancialTab dateRange={dateRange} customFrom={customFrom} customTo={customTo} />
        )}
      </div>
    </PageLayout>
  );
};
