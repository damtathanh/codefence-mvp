import { ShippingRepository } from '../repositories/shippingRepository';
export async function addShippingCost(orderId, type, amount) {
    const { data, error } = await ShippingRepository.addShippingCost(orderId, type, amount);
    if (error) {
        console.error('Error adding shipping cost:', error);
        throw error;
    }
    return data;
}
export async function fetchShippingCosts(orderId) {
    const { data, error } = await ShippingRepository.fetchShippingCosts(orderId);
    if (error) {
        console.error('Error fetching shipping costs:', error);
        throw error;
    }
    return data;
}
