import { supabase } from "../../../lib/supabaseClient";
export const ShippingRepository = {
    async addShippingCost(orderId, type, amount) {
        return supabase
            .from('shipping_costs')
            .insert({
            order_id: orderId,
            type,
            amount,
        })
            .select()
            .single();
    },
    async fetchShippingCosts(orderId) {
        return supabase
            .from('shipping_costs')
            .select('*')
            .eq('order_id', orderId);
    }
};
