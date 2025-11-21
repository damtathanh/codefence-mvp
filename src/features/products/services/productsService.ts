import { supabase } from '../../../lib/supabaseClient';

export interface SimpleProduct {
    id: string;
    name: string;
    status: string;
}

export const fetchActiveProducts = async (userId: string) => {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, status')
        .eq('user_id', userId)
        .eq('status', 'active');

    if (error) throw error;
    return data as SimpleProduct[];
};
