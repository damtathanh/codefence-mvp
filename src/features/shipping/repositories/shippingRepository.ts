import { supabase } from "../../../lib/supabaseClient";

export const ShippingRepository = {
    async addShippingCost(
        orderId: string,
        type: 'outbound' | 'return' | 'exchange',
        amount: number
    ) {
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

    async fetchShippingCosts(orderId: string) {
        return supabase
            .from('shipping_costs')
            .select('*')
            .eq('order_id', orderId);
    }
};
