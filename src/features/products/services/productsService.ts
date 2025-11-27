import { supabase } from '../../../lib/supabaseClient';
import type { Product } from '../../../types/supabase';

export interface SimpleProduct {
    id: string;
    name: string;
    status: string;
}

export interface ProductFilters {
    searchQuery?: string;
    categories?: string[];
    statuses?: string[];
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

/**
 * Fetch products with server-side pagination and filtering
 */
export async function fetchProductsByUser(
    userId: string,
    page: number,
    pageSize: number,
    filters: ProductFilters
): Promise<{ products: Product[]; totalCount: number; error?: string }> {
    try {
        // Build base query with count
        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);

        // Apply search filter (name or product_id)
        if (filters.searchQuery && filters.searchQuery.trim()) {
            const term = filters.searchQuery.trim();
            query = query.or(`name.ilike.%${term}%,product_id.ilike.%${term}%`);
        }

        // Apply category filter (multi-select)
        if (filters.categories && filters.categories.length > 0) {
            query = query.in('category', filters.categories);
        }

        // Apply status filter (multi-select)
        if (filters.statuses && filters.statuses.length > 0) {
            query = query.in('status', filters.statuses);
        }

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        // Order by created_at descending (newest first)
        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return { products: [], totalCount: 0, error: error.message };
        }

        return {
            products: data || [],
            totalCount: count || 0,
        };
    } catch (err) {
        console.error('Fetch products error:', err);
        return {
            products: [],
            totalCount: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}

export async function fetchProductFilterOptions(userId: string): Promise<{
    categories: string[];
    statuses: string[];
}> {
    const { data, error } = await supabase
        .from('products')
        .select('category,status')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching product filter options', error);
        return { categories: [], statuses: [] };
    }

    const categories = Array.from(
        new Set(
            (data ?? [])
                .map((p) => p.category as string | null)
                .filter((c): c is string => !!c && c.trim().length > 0),
        ),
    ).sort((a, b) => a.localeCompare(b, 'vi'));

    const statuses = Array.from(
        new Set(
            (data ?? [])
                .map((p) => p.status as string | null)
                .filter((s): s is string => !!s && s.trim().length > 0),
        ),
    );

    return { categories, statuses };
}
