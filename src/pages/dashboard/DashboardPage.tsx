import React, { useState } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { useDashboardStats } from '../../features/dashboard/useDashboardStats';
import type { DashboardDateRange } from '../../features/dashboard/useDashboardStats';
import { DateRangeSelector } from '../../components/dashboard/DateRangeSelector';
import { OrdersStatusChart } from '../../features/dashboard/components/OrdersStatusChart';
import { RevenueChart } from '../../features/dashboard/components/RevenueChart';
import { RiskDistributionChart } from '../../features/dashboard/components/RiskDistributionChart';
import { HighRiskOrdersCard } from '../../features/dashboard/components/HighRiskOrdersCard';
import { Package, DollarSign, Clock, CheckCircle, TrendingUp, XCircle } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export const DashboardPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DashboardDateRange>('last_month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  const { loading, error, stats, ordersChart, revenueChart, riskDistribution, highRiskOrders } = useDashboardStats(
    dateRange,
    customFrom || undefined,
    customTo || undefined
  );

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Overview</h2>
          <p className="text-sm text-white/60">
            Overview of orders, verification, risk and revenue.
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

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse border border-white/5" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 6 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Total Orders */}
            <div className="rounded-2xl bg-[#0B1120] p-5 border border-white/5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">Total Orders</h3>
                  <p className="text-3xl font-semibold text-[#8B5CF6] mt-1">{stats.totalOrders}</p>
                  <p className="text-xs text-white/50 mt-1">
                    COD: {stats.codOrders} | Prepaid: {stats.prepaidOrders}
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-3">
                  <Package className="w-5 h-5 text-[#8B5CF6]" />
                </div>
              </div>
            </div>

            {/* Card 2: Total Revenue */}
            <div className="rounded-2xl bg-[#0B1120] p-5 border border-white/5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">Total Revenue</h3>
                  <p className="text-3xl font-semibold text-green-400 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-white/50 mt-1">
                    Avg: {formatCurrency(stats.avgOrderValue)}
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </div>

            {/* Card 3: Pending Verification */}
            <div className="rounded-2xl bg-[#0B1120] p-5 border border-white/5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">Pending Verification</h3>
                  <p className="text-3xl font-semibold text-yellow-400 mt-1">{stats.pendingVerification}</p>
                  <p className="text-xs text-white/50 mt-1">
                    Orders waiting to be processed
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-3">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Card 4: Verified Orders */}
            <div className="rounded-2xl bg-[#0B1120] p-5 border border-white/5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">Verified Orders (COD)</h3>
                  <p className="text-3xl font-semibold text-blue-400 mt-1">{stats.verifiedOutcomeCount}</p>
                  <p className="text-xs text-white/50 mt-1">
                    Verified rate: {formatPercent(stats.verifiedOutcomeRate)}
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Card 5: Converted Revenue */}
            <div className="rounded-2xl bg-[#0B1120] p-5 border border-white/5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">Converted Revenue (COD → Paid)</h3>
                  <p className="text-3xl font-semibold text-emerald-400 mt-1">{formatCurrency(stats.convertedRevenue)}</p>
                  <p className="text-xs text-white/50 mt-1">
                    Converted COD: {stats.convertedOrders} ({formatPercent(stats.convertedRate)})
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-3">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Card 6: Cancelled Rate */}
            <div className="rounded-2xl bg-[#0B1120] p-5 border border-white/5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">Cancelled Rate (COD)</h3>
                  <p className="text-3xl font-semibold text-red-400 mt-1">{formatPercent(stats.cancelRate)}</p>
                  <p className="text-xs text-white/50 mt-1">
                    Cancelled COD: {stats.codCancelled} / {stats.verifiedOutcomeCount}
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-6">
            {/* Chart 1: Orders Status - Full Width */}
            <OrdersStatusChart data={ordersChart} />

            {/* Chart 2 & 3: Revenue + Risk Distribution + High Risk Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart - 2 cols */}
              <div className="lg:col-span-2">
                <RevenueChart data={revenueChart} />
              </div>

              {/* Risk Distribution + High Risk Card - 1 col */}
              <div className="space-y-6">
                <RiskDistributionChart data={riskDistribution} />
                <HighRiskOrdersCard orders={highRiskOrders} />
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
