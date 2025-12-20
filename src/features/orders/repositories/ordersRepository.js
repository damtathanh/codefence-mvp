import { supabase } from "../../../lib/supabaseClient";
import { chunkArray } from "../../../utils/chunk";
export const OrdersRepository = {
    async fetchOrdersByUser(userId, page, pageSize, filters) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        let query = supabase
            .from("orders")
            .select(`
        *,
        products:product_id (
          id,
          name,
          category
        )
      `, { count: 'exact' })
            .eq("user_id", userId);
        // Apply filters
        if (filters) {
            if (filters.searchQuery) {
                const term = filters.searchQuery.trim();
                if (term) {
                    query = query.or(`order_id.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%`);
                }
            }
            // Status Filter
            if (filters.status) {
                const raw = Array.isArray(filters.status) ? filters.status : [filters.status];
                const statuses = raw.filter((s) => s && s !== 'all');
                if (statuses.length > 0) {
                    query = query.in('status', statuses);
                }
            }
            // Payment Method Filter
            if (filters.paymentMethod) {
                const raw = Array.isArray(filters.paymentMethod) ? filters.paymentMethod : [filters.paymentMethod];
                const methods = raw.filter((m) => m && m !== 'all');
                if (methods.length > 0) {
                    const hasCOD = methods.includes('COD');
                    const nonCodMethods = methods.filter((m) => m !== 'COD');
                    if (hasCOD && nonCodMethods.length > 0) {
                        // COD (null or 'COD') OR other methods
                        const orConditions = [
                            'payment_method.eq.COD',
                            'payment_method.is.null', // Legacy records stored null for COD
                            ...nonCodMethods.map((m) => `payment_method.eq.${m}`),
                        ];
                        query = query.or(orConditions.join(','));
                    }
                    else if (hasCOD) {
                        // Only COD
                        const orConditions = [
                            'payment_method.eq.COD',
                            'payment_method.is.null', // Legacy records stored null for COD
                        ];
                        query = query.or(orConditions.join(','));
                    }
                    else {
                        // Only non-COD
                        query = query.in('payment_method', nonCodMethods);
                    }
                }
            }
            // Risk Score Filter
            if (filters.riskScore) {
                const raw = Array.isArray(filters.riskScore) ? filters.riskScore : [filters.riskScore];
                const risks = raw.filter((r) => r && r !== 'all');
                if (risks.length > 0) {
                    const conditions = [];
                    if (risks.includes('low')) {
                        conditions.push('risk_score.lte.30');
                    }
                    if (risks.includes('medium')) {
                        conditions.push('and(risk_score.gt.30,risk_score.lte.70)');
                    }
                    if (risks.includes('high')) {
                        conditions.push('risk_score.gt.70');
                    }
                    if (conditions.length > 0) {
                        query = query.or(conditions.join(','));
                    }
                }
            }
            // Date Filter
            if (filters.date) {
                query = query.eq('order_date', filters.date);
            }
        }
        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);
        return { data, error, count };
    },
    async insertOrder(payload) {
        return supabase
            .from("orders")
            .insert(payload)
            .select()
            .single();
    },
    async insertOrders(payloads) {
        return supabase
            .from("orders")
            .insert(payloads)
            .select();
    },
    async updateOrder(orderId, userId, updates) {
        return supabase
            .from("orders")
            .update(updates)
            .eq("id", orderId)
            .eq("user_id", userId)
            .select()
            .single();
    },
    async fetchOrderById(orderId, userId) {
        return supabase
            .from("orders")
            .select("status, refunded_amount, customer_shipping_paid, seller_shipping_paid, product_id")
            .eq("id", orderId)
            .eq("user_id", userId)
            .single();
    },
    async fetchPastOrdersByPhone(userId, phone) {
        return supabase
            .from("orders")
            .select("status")
            .eq("user_id", userId)
            .eq("phone", phone);
    },
    async fetchPastOrdersByPhones(userId, phones) {
        if (phones.length === 0) {
            return { data: [], error: null };
        }
        const phoneChunks = chunkArray(phones);
        let allData = [];
        for (const chunk of phoneChunks) {
            const { data, error } = await supabase
                .from("orders")
                .select("phone, status")
                .eq("user_id", userId)
                .in("phone", chunk);
            if (error) {
                return { data: null, error };
            }
            if (data && data.length > 0) {
                allData = [...allData, ...data];
            }
        }
        return { data: allData, error: null };
    },
    async deleteOrders(userId, orderIds) {
        return supabase
            .from("orders")
            .delete()
            .eq("user_id", userId)
            .in("id", orderIds);
    },
    async fetchOrderFilterOptions(userId) {
        const statusPromise = supabase
            .from("orders")
            .select("status")
            .eq("user_id", userId)
            .not("status", "is", null);
        const paymentPromise = supabase
            .from("orders")
            .select("payment_method")
            .eq("user_id", userId);
        const [statusResult, paymentResult] = await Promise.all([statusPromise, paymentPromise]);
        return {
            statusData: statusResult.data,
            statusError: statusResult.error,
            paymentData: paymentResult.data,
            paymentError: paymentResult.error
        };
    },
    async processExchangeRPC(payload) {
        return supabase.rpc('process_exchange', payload);
    }
};
