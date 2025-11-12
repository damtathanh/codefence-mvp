import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Filter } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useAuth } from '../../features/auth';
import { formatToGMT7 } from '../../utils/formatTimezone';
import type { History } from '../../types/supabase';

interface HistoryWithFormatted extends History {
  date?: string;
  displayDate?: string;
  time?: string;
}

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const {
    data: logs,
    loading,
    error,
  } = useSupabaseTable<History>({ tableName: 'history', enableRealtime: true });
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Format history logs with date/time and filter by current user
  const formattedLogs: HistoryWithFormatted[] = logs
    .filter(log => user && log.user_id === user.id) // Only show current user's actions
    .map(log => {
      const { date, displayDate, time } = formatToGMT7(log.created_at);
      return {
        ...log,
        date, // YYYY-MM-DD for filter
        displayDate, // DD/MM/YYYY for display
        time,
      };
    });

  const filteredLogs = formattedLogs.filter(log => {
    const matchesDate = !dateFilter || log.date === dateFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return { variant: 'success' as const, label: 'Success' };
      case 'failed':
        return { variant: 'danger' as const, label: 'Failed' };
      default:
        return { variant: 'warning' as const, label: status };
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">

      {/* Filters */}
      <Card>
        <CardHeader className="!pt-4 !pb-3 !px-6">
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pr-10 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/70" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <Input
              label="Date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* History Logs */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent">
            {error ? (
              <div className="p-12 text-center">
                <p className="text-red-400 mb-4">Error: {error}</p>
              </div>
            ) : loading && logs.length === 0 ? (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                Loading history...
              </div>
            ) : (
              <>
                <table className="min-w-[800px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-[#1E223D]">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Date & Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Action</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Order/Product ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const statusBadge = getStatusBadge(log.status);
                      return (
                        <tr key={log.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap">
                            <div>{log.displayDate}</div>
                            <div className="text-xs text-[#E5E7EB]/70 mt-1">{log.time} (GMT+7)</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap">{log.action}</td>
                          <td className="px-6 py-4 text-sm text-[#E5E7EB] font-medium align-middle">
                            <span className="block truncate whitespace-nowrap max-w-[200px]" title={log.order_id || 'N/A'}>
                              {log.order_id || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredLogs.length === 0 && !loading && (
                  <div className="p-12 text-center text-[#E5E7EB]/70">
                    {logs.length === 0
                      ? 'No history records found.'
                      : 'No records match your filters.'}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

