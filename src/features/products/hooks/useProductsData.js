import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth';
import { fetchProductsByUser, fetchProductFilterOptions } from '../services/productsService';
export const useProductsData = () => {
    const { user } = useAuth();
    // Data State
    const [products, setProducts] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Pagination State
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 30;
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState([]);
    const [statusFilter, setStatusFilter] = useState([]);
    // Available Filter Options State
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    // Fetch Filter Options
    useEffect(() => {
        if (!user?.id)
            return;
        let isMounted = true;
        (async () => {
            const { categories, statuses } = await fetchProductFilterOptions(user.id);
            if (!isMounted)
                return;
            setAvailableCategories(categories);
            setAvailableStatuses(statuses);
        })();
        return () => {
            isMounted = false;
        };
    }, [user?.id]);
    // Fetch Products
    const fetchProducts = useCallback(async (overridePage) => {
        if (!user) {
            setProducts([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const targetPage = overridePage ?? page;
            const filters = {
                searchQuery,
                categories: categoryFilter.length > 0 ? categoryFilter : undefined,
                statuses: statusFilter.length > 0 ? statusFilter : undefined,
            };
            const { products: productsData, totalCount: count, error: fetchError } = await fetchProductsByUser(user.id, targetPage, PAGE_SIZE, filters);
            if (fetchError)
                throw new Error(fetchError);
            setProducts(productsData);
            setTotalCount(count);
            // Only update page state if we successfully fetched a different page
            if (overridePage)
                setPage(overridePage);
        }
        catch (err) {
            console.error('Error fetching products:', err);
            setError(err.message || 'Failed to load products. Please try again.');
        }
        finally {
            setLoading(false);
        }
    }, [user, page, searchQuery, categoryFilter, statusFilter]);
    // Refetch when filters change (reset to page 1)
    useEffect(() => {
        fetchProducts(1);
    }, [searchQuery, categoryFilter, statusFilter]);
    // Handle page change
    const handlePageChange = useCallback((newPage) => {
        if (newPage < 1 || newPage > Math.ceil(totalCount / PAGE_SIZE))
            return;
        fetchProducts(newPage);
    }, [totalCount, fetchProducts]);
    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearchQuery('');
        setCategoryFilter([]);
        setStatusFilter([]);
        setPage(1);
    }, []);
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const startIndex = totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
    const endIndex = Math.min(page * PAGE_SIZE, totalCount);
    return {
        // Data
        products,
        totalCount,
        loading,
        error,
        // Pagination
        page,
        pageSize: PAGE_SIZE,
        totalPages,
        startIndex,
        endIndex,
        handlePageChange,
        // Filters
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        statusFilter,
        setStatusFilter,
        handleClearFilters,
        availableCategories,
        availableStatuses,
        // Actions
        refetch: () => fetchProducts(page),
    };
};
