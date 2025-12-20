import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { FilterBar } from '../../components/ui/FilterBar';
import { MultiSelectFilter } from '../../components/filters/MultiSelectFilter';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { useAuth } from '../../features/auth';
import { formatToGMT7 } from '../../utils/formatTimezone';
import { ORDER_STATUS } from '../../constants/orderStatus';
const getStatusLabel = (status) => {
    if (!status)
        return '';
    switch (status) {
        case ORDER_STATUS.PENDING_REVIEW:
            return 'Pending Review';
        case ORDER_STATUS.VERIFICATION_REQUIRED:
            return 'Verification Required';
        case ORDER_STATUS.ORDER_REJECTED:
            return 'Order Rejected';
        case ORDER_STATUS.ORDER_APPROVED:
            return 'Order Approved';
        case ORDER_STATUS.ORDER_CONFIRMATION_SENT:
            return 'Order Confirmation Sent';
        case ORDER_STATUS.CUSTOMER_CONFIRMED:
            return 'Customer Confirmed';
        case ORDER_STATUS.CUSTOMER_CANCELLED:
            return 'Customer Cancelled';
        case ORDER_STATUS.ORDER_PAID:
            return 'Order Paid';
        case ORDER_STATUS.DELIVERING:
            return 'Delivering';
        case ORDER_STATUS.COMPLETED:
            return 'Completed';
        default:
            // fallback: tự format "ORDER_WHATEVER" → "Order Whatever"
            return status
                .toLowerCase()
                .split('_')
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join(' ');
    }
};
export const HistoryPage = () => {
    const { user } = useAuth();
    const { data: logs, loading, error, } = useSupabaseTable({ tableName: 'history', enableRealtime: true });
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState([]);
    const [eventTypeFilter, setEventTypeFilter] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const clearAllFilters = () => {
        setDateFilter('');
        setStatusFilter([]);
        setEventTypeFilter([]);
        setSearchQuery('');
    };
    // Format history logs with date/time and filter by current user
    const formattedLogs = logs
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
    // Get unique event types for filter
    const eventTypeOptions = Array.from(new Set(formattedLogs.map(log => log.action))).map(action => ({
        value: action,
        label: action
    }));
    const filteredLogs = formattedLogs.filter(log => {
        const matchesDate = !dateFilter || log.date === dateFilter;
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(log.status);
        const matchesEventType = eventTypeFilter.length === 0 || eventTypeFilter.includes(log.action);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            (log.order_id && log.order_id.toLowerCase().includes(searchLower)) ||
            (log.action && log.action.toLowerCase().includes(searchLower)) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower));
        return matchesDate && matchesStatus && matchesEventType && matchesSearch;
    });
    const getStatusBadge = (status) => {
        switch (status) {
            case 'success':
                return { variant: 'success', label: 'Success' };
            case 'failed':
                return { variant: 'danger', label: 'Failed' };
            default:
                return { variant: 'warning', label: status };
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6 h-full flex flex-col min-h-0", children: [_jsxs(FilterBar, { searchValue: searchQuery, onSearch: setSearchQuery, searchPlaceholder: "Search by Order ID / Product / Phone / Name...", children: [_jsx(MultiSelectFilter, { label: "Status", options: [
                            { value: 'success', label: 'Success' },
                            { value: 'failed', label: 'Failed' },
                        ], selectedValues: statusFilter, onChange: setStatusFilter }), _jsx(MultiSelectFilter, { label: "Event Type", options: eventTypeOptions, selectedValues: eventTypeFilter, onChange: setEventTypeFilter }), _jsx("input", { type: "date", value: dateFilter, onChange: (e) => setDateFilter(e.target.value), className: "h-10 w-auto min-w-[180px] whitespace-nowrap px-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)]" }), _jsx("button", { type: "button", onClick: clearAllFilters, className: "text-sm text-[var(--text-muted)] whitespace-nowrap hover:text-white transition", children: "Clear filters" })] }), _jsxs(Card, { className: "flex-1 flex flex-col min-h-0 relative z-0", children: [_jsx(CardHeader, { className: "!pt-4 !pb-3 !px-6 flex-shrink-0", children: _jsx(CardTitle, { children: "History Logs" }) }), _jsx(CardContent, { className: "flex-1 min-h-0 overflow-y-auto p-0", children: _jsx("div", { className: "w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E223D] scrollbar-track-transparent", children: error ? (_jsx("div", { className: "p-12 text-center", children: _jsxs("p", { className: "text-red-400 mb-4", children: ["Error: ", error] }) })) : loading && logs.length === 0 ? (_jsx("div", { className: "p-12 text-center text-[#E5E7EB]/70", children: "Loading history..." })) : (_jsxs(_Fragment, { children: [_jsxs("table", { className: "min-w-[1000px] w-full border-separate border-spacing-0", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[#1E223D]", children: [_jsx("th", { className: "px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Date & Time" }), _jsx("th", { className: "px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Action" }), _jsx("th", { className: "px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Order/Product ID" }), _jsx("th", { className: "px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Changes" }), _jsx("th", { className: "px-6 py-4 text-left text-sm font-semibold text-[#E5E7EB] whitespace-nowrap", children: "Status" })] }) }), _jsx("tbody", { children: filteredLogs.map((log) => {
                                                    return (_jsxs("tr", { className: "border-b border-[#1E223D] hover:bg-white/5 transition", children: [_jsxs("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap", children: [_jsx("div", { children: log.displayDate }), _jsxs("div", { className: "text-xs text-[#E5E7EB]/70 mt-1", children: [log.time, " (GMT+7)"] })] }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] whitespace-nowrap", children: log.action }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] font-medium align-middle", children: _jsx("span", { className: "block truncate whitespace-nowrap max-w-[200px]", title: log.order_id || 'N/A', children: log.order_id || 'N/A' }) }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB] align-middle", children: log.details && Object.keys(log.details).length > 0 ? (_jsxs("div", { className: "space-y-1", children: [log.details.status_from && log.details.status_to && (_jsxs("div", { className: "text-sm font-medium text-purple-300 mb-1", children: ["Status: ", getStatusLabel(log.details.status_from), " \u2192", ' ', getStatusLabel(log.details.status_to)] })), Object.entries(log.details)
                                                                            .filter(([key]) => key !== 'status_from' && key !== 'status_to')
                                                                            .map(([key, value]) => (_jsxs("div", { className: "text-xs", children: [_jsxs("span", { className: "font-medium text-[#E5E7EB]/90", children: [key, ":"] }), ' ', _jsx("span", { className: "text-[#E5E7EB]/70", children: String(value) })] }, key)))] })) : (_jsx("span", { className: "text-[#E5E7EB]/50 text-xs", children: "\u2014" })) }), _jsx("td", { className: "px-6 py-4 align-middle", children: _jsx(StatusBadge, { status: log.status }) })] }, log.id));
                                                }) })] }), filteredLogs.length === 0 && !loading && (_jsx("div", { className: "p-12 text-center text-[var(--text-muted)]", children: logs.length === 0
                                            ? 'No history records found.'
                                            : 'No records match your filters.' }))] })) }) })] })] }));
};
