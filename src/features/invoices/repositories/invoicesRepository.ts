import { supabase } from "../../../lib/supabaseClient";
import type { InvoiceStatus } from "../services/invoiceTypes";
import type { InvoiceFilters } from "../services/invoiceService";

export const InvoicesRepository = {
    async fetchInvoicesByUser(
        userId: string,
        page: number,
        pageSize: number,
        filters?: InvoiceFilters
    ) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from("invoices")
            .select('*', { count: 'exact' })
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
                    query = query.in('status', filters.status);
                } else if (typeof filters.status === 'string' && filters.status !== 'all') {
                    query = query.eq('status', filters.status);
                }
            }

            if (filters.date) {
                query = query.eq('date', filters.date);
            }
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        return { data, error, count };
    },

    async getInvoiceByOrderId(orderId: string, userId: string) {
        return supabase
            .from("invoices")
            .select("*")
            .eq("user_id", userId)
            .eq("order_id", orderId)
            .maybeSingle();
    },

    async insertInvoice(payload: {
        user_id: string;
        order_id: string;
        amount: number;
        status: InvoiceStatus;
        date: string;
        invoice_code: string;
        paid_at?: string;
    }) {
        return supabase.from("invoices").insert(payload);
    },

    async updateInvoice(
        invoiceId: string,
        updates: {
            status?: InvoiceStatus;
            date?: string;
            paid_at?: string | null;
            pdf_url?: string | null;
        }
    ) {
        return supabase
            .from("invoices")
            .update(updates)
            .eq("id", invoiceId)
            .select("*")
            .single();
    },

    async deleteInvoicesByOrderIds(userId: string, orderIds: string[]) {
        return supabase
            .from("invoices")
            .delete()
            .eq("user_id", userId)
            .in("order_id", orderIds);
    },

    async invalidateInvoicePdfs(invoiceIds: string[]) {
        return supabase
            .from('invoices')
            .update({
                pdf_url: null,
            })
            .in('id', invoiceIds);
    },

    async getInvoicesByOrderId(orderId: string) {
        return supabase
            .from('invoices')
            .select('id')
            .eq('order_id', orderId);
    }
};
