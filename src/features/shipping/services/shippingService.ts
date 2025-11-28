import { ShippingRepository } from '../repositories/shippingRepository';
import type { ShippingCost } from '../../../types/supabase';

export async function addShippingCost(
    orderId: string,
    type: 'outbound' | 'return' | 'exchange',
    amount: number
) {
    const { data, error } = await ShippingRepository.addShippingCost(orderId, type, amount);

    if (error) {
        console.error('Error adding shipping cost:', error);
        throw error;
    }

    return data as ShippingCost;
}

export async function fetchShippingCosts(orderId: string) {
    const { data, error } = await ShippingRepository.fetchShippingCosts(orderId);

    if (error) {
        console.error('Error fetching shipping costs:', error);
        throw error;
    }

    return data as ShippingCost[];
}
