import { supabase } from '../../../lib/supabaseClient';
import type { ShippingCost } from '../../../types/supabase';

export async function addShippingCost(
    orderId: string,
    type: 'outbound' | 'return' | 'exchange',
    amount: number
) {
    const { data, error } = await supabase
        .from('shipping_costs')
        .insert({
            order_id: orderId,
            type,
            amount,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding shipping cost:', error);
        throw error;
    }

    return data as ShippingCost;
}

export async function fetchShippingCosts(orderId: string) {
    const { data, error } = await supabase
        .from('shipping_costs')
        .select('*')
        .eq('order_id', orderId);

    if (error) {
        console.error('Error fetching shipping costs:', error);
        throw error;
    }

    return data as ShippingCost[];
}
