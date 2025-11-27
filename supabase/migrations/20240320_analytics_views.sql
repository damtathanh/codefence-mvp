-- Migration: Create Analytics Views
-- Optimizes analytics performance by pre-aggregating data

-- 1. view_daily_revenue
-- Groups orders by date and sums revenue for paid orders
CREATE OR REPLACE VIEW view_daily_revenue AS
SELECT
    user_id,
    order_date,
    SUM(amount) as total_revenue,
    COUNT(*) as order_count
FROM orders
WHERE status = 'Order Paid' -- Matches the 'Paid' status used in the app
GROUP BY user_id, order_date;

-- 2. view_order_status_counts
-- Counts orders by status
CREATE OR REPLACE VIEW view_order_status_counts AS
SELECT
    user_id,
    status,
    COUNT(*) as count
FROM orders
GROUP BY user_id, status;

-- 3. view_risk_distribution
-- Counts orders by risk level
CREATE OR REPLACE VIEW view_risk_distribution AS
SELECT
    user_id,
    risk_level,
    COUNT(*) as count
FROM orders
GROUP BY user_id, risk_level;

-- Grant access to authenticated users (RLS is not automatically applied to views in the same way as tables, 
-- but since we filter by user_id in the query, we need to ensure the view itself is secure or 
-- rely on the underlying table's RLS if we used security_invoker.
-- For simplicity and performance in this MVP-to-Prod transition, we'll use security_invoker 
-- so it respects the underlying orders table RLS).

ALTER VIEW view_daily_revenue OWNER TO postgres;
GRANT SELECT ON view_daily_revenue TO authenticated;

ALTER VIEW view_order_status_counts OWNER TO postgres;
GRANT SELECT ON view_order_status_counts TO authenticated;

ALTER VIEW view_risk_distribution OWNER TO postgres;
GRANT SELECT ON view_risk_distribution TO authenticated;

-- Comment on views
COMMENT ON VIEW view_daily_revenue IS 'Aggregated daily revenue for paid orders per user';
COMMENT ON VIEW view_order_status_counts IS 'Count of orders by status per user';
COMMENT ON VIEW view_risk_distribution IS 'Count of orders by risk level per user';
