-- 010_backfill_paid_at.sql

UPDATE public.orders
SET paid_at = order_date::timestamptz
WHERE
  COALESCE(UPPER(TRIM(payment_method)), 'COD') <> 'COD'
  AND paid_at IS NULL;

UPDATE public.orders
SET status = CASE
    WHEN risk_score > 70 THEN 'Order Rejected'
    WHEN risk_score >= 30 THEN 'Pending Review'
    ELSE 'Order Approved'
  END
WHERE
  COALESCE(UPPER(TRIM(payment_method)), 'COD') = 'COD'
  AND paid_at IS NULL
  AND status = 'Order Paid';
