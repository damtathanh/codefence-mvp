-- 008_get_revenue_by_province.sql

CREATE OR REPLACE FUNCTION public.get_revenue_by_province(
  _from date,
  _to   date
)
RETURNS TABLE (
  province      text,
  total_revenue numeric
)
LANGUAGE sql
AS $$
  SELECT
    COALESCE(o.province, 'Unknown') AS province,
    COALESCE(SUM(o.amount), 0)      AS total_revenue
  FROM public.orders o
  WHERE
    o.user_id = auth.uid()
    AND o.paid_at IS NOT NULL
    AND o.paid_at >= _from
    AND o.paid_at < (_to + INTERVAL '1 day')
  GROUP BY 1
  ORDER BY total_revenue DESC
  LIMIT 10;
$$;
