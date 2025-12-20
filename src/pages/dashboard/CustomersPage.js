import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../features/auth";
import { Card, CardContent, } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { RiskBadge } from "../../components/dashboard/RiskBadge";
import { fetchCustomerStatsForUser, fetchCustomerBlacklist, addToBlacklist, removeFromBlacklist, fetchCustomerOrdersForUser, } from "../../features/customers/services/customersService";
import { CustomerInsightPanel } from "../../features/customers/components/CustomerInsightPanel";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
const formatDate = (iso) => {
    if (!iso)
        return "N/A";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "N/A";
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};
export const CustomersPage = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [blacklistPhones, setBlacklistPhones] = useState(new Set());
    const [loadingBlacklist, setLoadingBlacklist] = useState(false);
    // filter All / Blacklisted / Not blacklisted
    const [blacklistFilter, setBlacklistFilter] = useState("all");
    // modal Reason
    const [blacklistModalPhone, setBlacklistModalPhone] = useState(null);
    const [blacklistReason, setBlacklistReason] = useState("");
    // Insight Panel State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [insightOpen, setInsightOpen] = useState(false);
    const [insightLoading, setInsightLoading] = useState(false);
    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 200;
    // Load customer stats
    useEffect(() => {
        if (!user)
            return;
        const load = async () => {
            setLoading(true);
            const { data, error } = await fetchCustomerStatsForUser(user.id);
            if (!error && data)
                setStats(data);
            setLoading(false);
        };
        load();
    }, [user]);
    // Load blacklist
    const reloadBlacklist = async () => {
        if (!user)
            return;
        setLoadingBlacklist(true);
        const { data } = await fetchCustomerBlacklist(user.id);
        setBlacklistPhones(new Set(data.map((b) => b.phone)));
        setLoadingBlacklist(false);
    };
    useEffect(() => {
        reloadBlacklist();
    }, [user]);
    const handleAdd = (phone) => {
        setBlacklistModalPhone(phone);
        setBlacklistReason("");
    };
    const handleRemove = async (phone) => {
        if (!user)
            return;
        await removeFromBlacklist(user.id, phone);
        reloadBlacklist();
    };
    const handleRowClick = async (customer) => {
        if (!user)
            return;
        setSelectedCustomer(customer);
        setInsightOpen(true);
        setInsightLoading(true);
        try {
            const { data, error } = await fetchCustomerOrdersForUser(user.id, customer.phone);
            if (!error && data) {
                setCustomerOrders(data);
            }
            else {
                setCustomerOrders([]);
                console.error("Error loading customer orders:", error);
            }
        }
        finally {
            setInsightLoading(false);
        }
    };
    const handleCloseInsight = () => {
        setInsightOpen(false);
        setSelectedCustomer(null);
        setCustomerOrders([]);
    };
    // 1. Filter theo search
    const filteredBySearch = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term)
            return stats;
        return stats.filter((c) => c.phone.toLowerCase().includes(term) ||
            (c.fullName || "").toLowerCase().includes(term));
    }, [stats, search]);
    // 2. Filter theo trạng thái blacklist
    const blacklistFiltered = useMemo(() => {
        if (blacklistFilter === "all")
            return filteredBySearch;
        if (blacklistFilter === "blacklisted") {
            return filteredBySearch.filter((c) => blacklistPhones.has(c.phone));
        }
        // not_blacklisted
        return filteredBySearch.filter((c) => !blacklistPhones.has(c.phone));
    }, [filteredBySearch, blacklistFilter, blacklistPhones]);
    // 3. Paginated list
    const paginated = useMemo(() => {
        const startIndex = (page - 1) * PAGE_SIZE;
        return blacklistFiltered.slice(startIndex, startIndex + PAGE_SIZE);
    }, [blacklistFiltered, page]);
    // Reset page khi search hoặc đổi filter
    useEffect(() => {
        setPage(1);
    }, [search, blacklistFilter]);
    return (_jsxs("div", { className: "flex flex-col h-full min-h-0 p-6", children: [_jsx(CardContent, { className: "!pt-0 !px-4 !pb-3", children: _jsxs("div", { className: "flex flex-col md:flex-row gap-3 items-stretch md:items-center", children: [_jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "Search by phone or customer name...", value: search, onChange: (e) => setSearch(e.target.value), className: "h-10 !py-2 w-full" }) }), _jsxs("div", { className: "flex gap-2 shrink-0", children: [_jsx("button", { type: "button", onClick: () => setBlacklistFilter("all"), className: `px-4 h-10 rounded-full border text-sm transition-all
          ${blacklistFilter === "all"
                                        ? "bg-[#1F2937] border-[#4C1D95] text-white"
                                        : "bg-[#020617] border-[#1E293B] text-white/70 hover:bg-[#020617]/80"}`, children: "All Customers" }), _jsx("button", { type: "button", onClick: () => setBlacklistFilter("blacklisted"), className: `px-4 h-10 rounded-full border text-sm transition-all
          ${blacklistFilter === "blacklisted"
                                        ? "bg-red-500/20 border-red-400 text-red-200"
                                        : "bg-[#020617] border-[#1E293B] text-white/70 hover:bg-[#020617]/80"}`, children: "Blacklisted" }), _jsx("button", { type: "button", onClick: () => setBlacklistFilter("not_blacklisted"), className: `px-4 h-10 rounded-full border text-sm transition-all
          ${blacklistFilter === "not_blacklisted"
                                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                                        : "bg-[#020617] border-[#1E293B] text-white/70 hover:bg-[#020617]/80"}`, children: "Not blacklisted" })] })] }) }), _jsxs(Card, { className: "flex-1 flex flex-col min-h-0 mt-6", children: [_jsx(CardContent, { className: "flex-1 min-h-0 overflow-y-auto p-0", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("p", { className: "text-[var(--text-muted)]", children: "Loading customers..." }) })) : blacklistFiltered.length === 0 ? (_jsx("div", { className: "p-12 text-center text-[var(--text-muted)]", children: "No customers found." })) : (_jsx("div", { className: "w-full max-w-full overflow-x-auto", children: _jsxs("table", { className: "min-w-[1100px] w-full border-separate border-spacing-0", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[#1E223D]", children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]", children: "Total Orders" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]", children: "Success" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]", children: "Failed" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]", children: "Customer Risk" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]", children: "Last Order" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]", children: "Blacklist" })] }) }), _jsx("tbody", { children: paginated.map((c) => (_jsxs("tr", { className: "border-b border-[#1E223D] hover:bg-white/5 transition cursor-pointer", onClick: () => handleRowClick(c), children: [_jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB]", children: c.phone }), _jsx("td", { className: "px-6 py-4 text-sm text-[#E5E7EB]", children: c.fullName || "—" }), _jsx("td", { className: "px-6 py-4 text-sm text-center", children: c.totalOrders }), _jsx("td", { className: "px-6 py-4 text-sm text-emerald-400 text-center", children: c.successCount }), _jsx("td", { className: "px-6 py-4 text-sm text-red-400 text-center", children: c.failedCount }), _jsx("td", { className: "px-6 py-4 text-center", children: _jsx(RiskBadge, { score: c.customerRiskScore }) }), _jsx("td", { className: "px-6 py-4 text-sm text-center", children: formatDate(c.lastOrderAt) }), _jsx("td", { className: "px-6 py-4 text-center", children: blacklistPhones.has(c.phone) ? (_jsx("button", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleRemove(c.phone);
                                                        }, disabled: loadingBlacklist, className: "px-3 py-1 text-xs bg-red-600/30 text-red-300 border border-red-400/50 rounded", children: "Unblacklist" })) : (_jsx("button", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleAdd(c.phone);
                                                        }, disabled: loadingBlacklist, className: "px-3 py-1 text-xs bg-purple-600/30 text-purple-300 border border-purple-400/50 rounded", children: "Blacklist" })) })] }, c.phone))) })] }) })) }), _jsx(Pagination, { currentPage: page, totalItems: blacklistFiltered.length, pageSize: PAGE_SIZE, onPageChange: setPage })] }), _jsx(CustomerInsightPanel, { customer: selectedCustomer, orders: customerOrders, isOpen: insightOpen, onClose: handleCloseInsight }), blacklistModalPhone && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4", onClick: () => !loadingBlacklist && setBlacklistModalPhone(null), children: _jsxs("div", { className: "bg-[#111827] border border-[#1F2937] rounded-xl p-6 max-w-md w-full", onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-2", children: "Add to blacklist" }), _jsxs("p", { className: "text-sm text-gray-300 mb-4", children: ["Phone number:", " ", _jsx("span", { className: "font-mono", children: blacklistModalPhone })] }), _jsx("label", { className: "block text-sm text-gray-200 mb-2", children: "Reason" }), _jsx("textarea", { className: "w-full rounded-lg border border-white/10 bg-white/5 text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]", rows: 4, value: blacklistReason, onChange: (e) => setBlacklistReason(e.target.value), placeholder: "Input reason...", disabled: loadingBlacklist }), _jsxs("div", { className: "flex justify-end gap-2 mt-4", children: [_jsx(Button, { variant: "outline", onClick: () => !loadingBlacklist && setBlacklistModalPhone(null), disabled: loadingBlacklist, children: "Cancel" }), _jsx(Button, { onClick: async () => {
                                        if (!user || !blacklistModalPhone)
                                            return;
                                        setLoadingBlacklist(true);
                                        const { error } = await addToBlacklist(user.id, blacklistModalPhone, blacklistReason.trim() || undefined);
                                        setLoadingBlacklist(false);
                                        if (error) {
                                            console.error("addToBlacklist error", error);
                                            showError("Thêm blacklist thất bại.");
                                            return;
                                        }
                                        showSuccess("Đã thêm vào blacklist.");
                                        setBlacklistModalPhone(null);
                                        setBlacklistReason("");
                                        reloadBlacklist();
                                    }, disabled: loadingBlacklist || !blacklistReason.trim(), children: "Confirm" })] })] }) }))] }));
};
