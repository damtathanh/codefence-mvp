import { supabase } from "../../../lib/supabaseClient";
export const InvoicesRepository = {
    async fetchInvoicesByUser(userId, page, pageSize, filters) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        let query = supabase
            .from("invoices")
            // ❗ KHÔNG JOIN GÌ HẾT, CHỈ LẤY THẲNG BẢNG INVOICES
            .select("*", { count: "exact" })
            .eq("user_id", userId);
        if (filters) {
            if (filters.searchQuery) {
                const term = filters.searchQuery.trim();
                if (term) {
                    query = query.or(`invoice_code.ilike.%${term}%`);
                }
            }
            if (filters.status) {
                if (Array.isArray(filters.status) && filters.status.length > 0) {
                    query = query.in("status", filters.status);
                }
                else if (typeof filters.status === "string" && filters.status !== "all") {
                    query = query.eq("status", filters.status);
                }
            }
            if (filters.date) {
                query = query.eq("date", filters.date);
            }
        }
        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);
        return { data, error, count };
    },
    async getInvoiceByOrderId(orderId, userId) {
        return supabase
            .from("invoices")
            .select("*")
            .eq("user_id", userId)
            .eq("order_id", orderId)
            .maybeSingle();
    },
    async insertInvoice(payload) {
        return supabase.from("invoices").insert(payload);
    },
    async updateInvoice(invoiceId, updates) {
        return supabase
            .from("invoices")
            .update(updates)
            .eq("id", invoiceId)
            .select("*")
            .single();
    },
    async deleteInvoicesByOrderIds(userId, orderIds) {
        return supabase
            .from("invoices")
            .delete()
            .eq("user_id", userId)
            .in("order_id", orderIds);
    },
    async invalidateInvoicePdfs(invoiceIds) {
        return supabase
            .from("invoices")
            .update({
            pdf_url: null,
        })
            .in("id", invoiceIds);
    },
    async getInvoicesByOrderId(orderId) {
        return supabase
            .from("invoices")
            .select("id")
            .eq("order_id", orderId);
    }
};
