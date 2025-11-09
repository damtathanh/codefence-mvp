import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Filter } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import type { History } from '../../types/supabase';

interface HistoryWithFormatted extends History {
  date?: string;
  time?: string;
  user_display?: string;
}

export const HistoryPage: React.FC = () => {
  const {
    data: logs,
    loading,
    error,
  } = useSupabaseTable<History>({ tableName: 'history', enableRealtime: true });
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');

  // Format history logs with date/time
  const formattedLogs: HistoryWithFormatted[] = logs.map(log => {
    const date = new Date(log.created_at);
    return {
      ...log,
      date: date.toISOString().split('T')[0],
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      user_display: 'Admin', // Could be fetched from user profile if needed
    };
  });

  const filteredLogs = formattedLogs.filter(log => {
    const matchesDate = !dateFilter || log.date === dateFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesUser = !userFilter || (log.user_display?.toLowerCase().includes(userFilter.toLowerCase()) || false);
    return matchesDate && matchesStatus && matchesUser;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { variant: 'success' as const, label: 'Verified' };
      case 'rejected':
        return { variant: 'danger' as const, label: 'Rejected' };
      default:
        return { variant: 'warning' as const, label: 'Flagged' };
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Loading history...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-400">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Filters */}
      <Card>
        <CardHeader className="!pt-4 !pb-3 !px-6">
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="User"
              placeholder="Search by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="flagged">Flagged</option>
              </select>
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
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E223D]">
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Date & Time</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Order ID</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">User</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Action</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const statusBadge = getStatusBadge(log.status);
                  return (
                    <tr key={log.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                        <div>{log.date}</div>
                        <div className="text-xs text-[#E5E7EB]/70 mt-1">{log.time}</div>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB] font-medium">{log.order_id}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{log.user_display || 'Admin'}</td>
                      <td className="px-6 py-5 text-sm text-[#E5E7EB]">{log.action}</td>
                      <td className="px-6 py-5">
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                {logs.length === 0
                  ? 'No history records found.'
                  : 'No records match your filters.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

