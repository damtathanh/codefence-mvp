import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth';
export const useAnalyticsData = () => {
    const { user } = useAuth();
    const [dailyRevenue, setDailyRevenue] = useState([]);
    const [statusCounts, setStatusCounts] = useState([]);
    const [riskDistribution, setRiskDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchAnalytics = useCallback(async () => {
        if (!user)
            return;
        setLoading(true);
        setError(null);
        try {
            // Fetch Daily Revenue
            const { data: revenueData, error: revenueError } = await supabase
                .from('view_daily_revenue')
                .select('*')
                .eq('user_id', user.id)
                .order('order_date', { ascending: true });
            if (revenueError)
                throw revenueError;
            // Fetch Status Counts
            const { data: statusData, error: statusError } = await supabase
                .from('view_order_status_counts')
                .select('*')
                .eq('user_id', user.id);
            if (statusError)
                throw statusError;
            // Fetch Risk Distribution
            const { data: riskData, error: riskError } = await supabase
                .from('view_risk_distribution')
                .select('*')
                .eq('user_id', user.id);
            if (riskError)
                throw riskError;
            setDailyRevenue(revenueData || []);
            setStatusCounts(statusData || []);
            setRiskDistribution(riskData || []);
        }
        catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.message || 'Failed to load analytics data');
        }
        finally {
            setLoading(false);
        }
    }, [user]);
    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);
    return {
        dailyRevenue,
        statusCounts,
        riskDistribution,
        loading,
        error,
        refreshAnalytics: fetchAnalytics
    };
};
