import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../features/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Search } from "lucide-react";
import { RiskBadge } from "../../components/dashboard/RiskBadge";
import {
  fetchCustomerStatsForUser,
  fetchCustomerBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  type CustomerStats,
  fetchCustomerOrdersForUser,
} from "../../features/customers/services/customersService";
import { CustomerInsightPanel } from "../../features/customers/components/CustomerInsightPanel";
import type { Order } from "../../types/supabase";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

const formatDate = (iso: string | null) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [stats, setStats] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [blacklistPhones, setBlacklistPhones] = useState<Set<string>>(new Set());
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);

  // filter All / Blacklisted / Not blacklisted
  const [blacklistFilter, setBlacklistFilter] = useState<
    "all" | "blacklisted" | "not_blacklisted"
  >("all");

  // modal Reason
  const [blacklistModalPhone, setBlacklistModalPhone] = useState<string | null>(
    null
  );
  const [blacklistReason, setBlacklistReason] = useState("");

  // Insight Panel State
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerStats | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 200;

  // Load customer stats
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await fetchCustomerStatsForUser(user.id);
      if (!error && data) setStats(data);
      setLoading(false);
    };

    load();
  }, [user]);

  // Load blacklist
  const reloadBlacklist = async () => {
    if (!user) return;
    setLoadingBlacklist(true);

    const { data } = await fetchCustomerBlacklist(user.id);
    setBlacklistPhones(new Set(data.map((b: any) => b.phone)));

    setLoadingBlacklist(false);
  };

  useEffect(() => {
    reloadBlacklist();
  }, [user]);

  const handleAdd = (phone: string) => {
    setBlacklistModalPhone(phone);
    setBlacklistReason("");
  };

  const handleRemove = async (phone: string) => {
    if (!user) return;
    await removeFromBlacklist(user.id, phone);
    reloadBlacklist();
  };

  const handleRowClick = async (customer: CustomerStats) => {
    if (!user) return;
    setSelectedCustomer(customer);
    setInsightOpen(true);
    setInsightLoading(true);
    try {
      const { data, error } = await fetchCustomerOrdersForUser(
        user.id,
        customer.phone
      );
      if (!error && data) {
        setCustomerOrders(data);
      } else {
        setCustomerOrders([]);
        console.error("Error loading customer orders:", error);
      }
    } finally {
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
    if (!term) return stats;
    return stats.filter(
      (c) =>
        c.phone.toLowerCase().includes(term) ||
        (c.fullName || "").toLowerCase().includes(term)
    );
  }, [stats, search]);

  // 2. Filter theo trạng thái blacklist
  const blacklistFiltered = useMemo(() => {
    if (blacklistFilter === "all") return filteredBySearch;

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

  return (
    <div className="flex flex-col h-full min-h-0 p-6">
      {/* Search + Filters */}
      <CardContent className="!pt-0 !px-4 !pb-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search by phone or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 !py-2 w-full"
            />
          </div>

          {/* “Dropdown” filter Blacklist bên phải */}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setBlacklistFilter("all")}
              className={`px-4 h-10 rounded-full border text-sm transition-all
          ${blacklistFilter === "all"
                  ? "bg-[#1F2937] border-[#4C1D95] text-white"
                  : "bg-[#020617] border-[#1E293B] text-white/70 hover:bg-[#020617]/80"
                }`}
            >
              All Customers
            </button>

            <button
              type="button"
              onClick={() => setBlacklistFilter("blacklisted")}
              className={`px-4 h-10 rounded-full border text-sm transition-all
          ${blacklistFilter === "blacklisted"
                  ? "bg-red-500/20 border-red-400 text-red-200"
                  : "bg-[#020617] border-[#1E293B] text-white/70 hover:bg-[#020617]/80"
                }`}
            >
              Blacklisted
            </button>

            <button
              type="button"
              onClick={() => setBlacklistFilter("not_blacklisted")}
              className={`px-4 h-10 rounded-full border text-sm transition-all
          ${blacklistFilter === "not_blacklisted"
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                  : "bg-[#020617] border-[#1E293B] text-white/70 hover:bg-[#020617]/80"
                }`}
            >
              Not blacklisted
            </button>
          </div>
        </div>
      </CardContent>

      {/* Table */}
      <Card className="flex-1 flex flex-col min-h-0 mt-6">
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--text-muted)]">Loading customers...</p>
            </div>
          ) : blacklistFiltered.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)]">
              No customers found.
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <table className="min-w-[1100px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="border-b border-[#1E223D]">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#E5E7EB]">
                      Name
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]">
                      Total Orders
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]">
                      Success
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]">
                      Customer Risk
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]">
                      Last Order
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-[#E5E7EB]">
                      Blacklist
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginated.map((c) => (
                    <tr
                      key={c.phone}
                      className="border-b border-[#1E223D] hover:bg-white/5 transition cursor-pointer"
                      onClick={() => handleRowClick(c)}
                    >
                      <td className="px-6 py-4 text-sm text-[#E5E7EB]">
                        {c.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E5E7EB]">
                        {c.fullName || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {c.totalOrders}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400 text-center">
                        {c.successCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-400 text-center">
                        {c.failedCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <RiskBadge score={c.customerRiskScore} />
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {formatDate(c.lastOrderAt)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {blacklistPhones.has(c.phone) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(c.phone);
                            }}
                            disabled={loadingBlacklist}
                            className="px-3 py-1 text-xs bg-red-600/30 text-red-300 border border-red-400/50 rounded"
                          >
                            Unblacklist
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdd(c.phone);
                            }}
                            disabled={loadingBlacklist}
                            className="px-3 py-1 text-xs bg-purple-600/30 text-purple-300 border border-purple-400/50 rounded"
                          >
                            Blacklist
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalItems={blacklistFiltered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </Card>

      {/* Customer Insight Panel */}
      <CustomerInsightPanel
        customer={selectedCustomer}
        orders={customerOrders}
        isOpen={insightOpen}
        onClose={handleCloseInsight}
      />

      {/* Modal nhập lý do blacklist */}
      {blacklistModalPhone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !loadingBlacklist && setBlacklistModalPhone(null)}
        >
          <div
            className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Add to blacklist
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              Phone number:{" "}
              <span className="font-mono">{blacklistModalPhone}</span>
            </p>

            <label className="block text-sm text-gray-200 mb-2">Reason</label>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              rows={4}
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              placeholder="Input reason..."
              disabled={loadingBlacklist}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  !loadingBlacklist && setBlacklistModalPhone(null)
                }
                disabled={loadingBlacklist}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!user || !blacklistModalPhone) return;
                  setLoadingBlacklist(true);
                  const { error } = await addToBlacklist(
                    user.id,
                    blacklistModalPhone,
                    blacklistReason.trim() || undefined
                  );
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
                }}
                disabled={loadingBlacklist || !blacklistReason.trim()}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
