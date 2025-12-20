import { supabase } from "../../../lib/supabaseClient";
export const LedgerRepository = {
    async insertTransaction(payload) {
        return supabase
            .from("order_financial_transactions")
            .insert(payload)
            .select()
            .single();
    },
    async fetchTransactionsByOrder(orderId) {
        return supabase
            .from("order_financial_transactions")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false });
    },
    async fetchTransactionsByUser(userId, limit = 50) {
        return supabase
            .from("order_financial_transactions")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit);
    }
};
