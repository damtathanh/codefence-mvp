CREATE OR REPLACE FUNCTION public.import_orders_bulk(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    item jsonb;
    _order_id text;
    _errors jsonb := '[]'::jsonb;
    _results jsonb := '[]'::jsonb;
    success_count int := 0;
    fail_count int := 0;
    _user_id uuid;

    -- THÊM BIẾN PHỤC VỤ LOGIC
    _payment_method text;
    _risk_score numeric;
    _risk_level text;
    _status text;
BEGIN
    -- Lấy user hiện tại từ auth (an toàn, không phụ thuộc payload)
    _user_id := auth.uid();

    IF _user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', 0,
            'failed', 0,
            'inserted_orders', '[]'::jsonb,
            'errors', jsonb_build_array(jsonb_build_object(
                'order_id', null,
                'error', 'User not authenticated'
            ))
        );
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        BEGIN
            _order_id := item->>'order_id';

            IF _order_id IS NULL OR _order_id = '' THEN
                _errors := _errors || jsonb_build_object(
                    'order_id', null,
                    'error', 'Missing order_id'
                );
                fail_count := fail_count + 1;
                CONTINUE;
            END IF;

            -- 1) TÍNH PAYMENT_METHOD + RISK_SCORE TỪ PAYLOAD
            _payment_method := COALESCE(NULLIF(item->>'payment_method',''), 'COD');
            _risk_score := COALESCE(NULLIF(item->>'risk_score','')::numeric, 0);

            -- 1.1) MAP risk_level từ risk_score (CHỈ THÊM ĐOẠN NÀY)
            IF UPPER(_payment_method) <> 'COD' THEN
                _risk_level := 'none';
            ELSE
                IF _risk_score > 70 THEN
                    _risk_level := 'high';
                ELSIF _risk_score >= 30 THEN
                    _risk_level := 'medium';
                ELSE
                    _risk_level := 'low';
                END IF;
            END IF;

            -- 2) LOGIC STATUS GIỐNG FLOW CŨ — GIỮ NGUYÊN
            IF UPPER(_payment_method) <> 'COD' THEN
                _status := 'Order Paid';
            ELSE
                IF _risk_score > 70 THEN
                    _status := 'Order Rejected';
                ELSIF _risk_score >= 30 THEN
                    _status := 'Pending Review';
                ELSE
                    _status := 'Order Approved';
                END IF;
            END IF;

            -- 3) UPSERT: insert mới hoặc update nếu trùng (user_id, order_id)
            INSERT INTO public.orders (
                user_id,
                order_id,
                customer_name,
                phone,
                gender,
                birth_year,
                address_detail,
                ward,
                district,
                province,
                address,
                product_id,
                product,
                amount,
                status,
                payment_method,
                discount_amount,
                shipping_fee,
                channel,
                source,
                order_date,
                zalo_exists,
                risk_score,
                risk_level,          -- 👈 THÊM
                created_at,
                updated_at
            )
            VALUES (
                _user_id,
                item->>'order_id',
                item->>'customer_name',
                item->>'phone',
                NULLIF(item->>'gender',''),
                NULLIF(item->>'birth_year','')::int,
                NULLIF(item->>'address_detail',''),
                NULLIF(item->>'ward',''),
                NULLIF(item->>'district',''),
                NULLIF(item->>'province',''),
                CONCAT_WS(', ',
                    NULLIF(item->>'address_detail',''),
                    NULLIF(item->>'ward',''),
                    NULLIF(item->>'district',''),
                    NULLIF(item->>'province','')
                ),
                NULLIF(item->>'product_id','')::uuid,
                item->>'product',
                (item->>'amount')::numeric,
                _status,
                _payment_method,
                COALESCE(NULLIF(item->>'discount_amount','')::numeric, 0),
                COALESCE(NULLIF(item->>'shipping_fee','')::numeric, 0),
                NULLIF(item->>'channel',''),
                NULLIF(item->>'source',''),
                (item->>'order_date')::date,
                COALESCE((item->>'zalo_exists')::boolean, false),
                _risk_score,
                _risk_level,          -- 👈 THÊM
                NOW(),
                NOW()
            )
            ON CONFLICT (user_id, order_id)
            DO UPDATE SET
                customer_name   = EXCLUDED.customer_name,
                phone           = EXCLUDED.phone,
                gender          = EXCLUDED.gender,
                birth_year      = EXCLUDED.birth_year,
                address_detail  = EXCLUDED.address_detail,
                ward            = EXCLUDED.ward,
                district        = EXCLUDED.district,
                province        = EXCLUDED.province,
                address         = EXCLUDED.address,
                product_id      = EXCLUDED.product_id,
                product         = EXCLUDED.product,
                amount          = EXCLUDED.amount,
                status          = EXCLUDED.status,
                payment_method  = EXCLUDED.payment_method,
                discount_amount = EXCLUDED.discount_amount,
                shipping_fee    = EXCLUDED.shipping_fee,
                channel         = EXCLUDED.channel,
                source          = EXCLUDED.source,
                order_date      = EXCLUDED.order_date,
                zalo_exists     = EXCLUDED.zalo_exists,
                risk_score      = EXCLUDED.risk_score,
                risk_level      = EXCLUDED.risk_level,   -- 👈 THÊM
                updated_at      = NOW()
            RETURNING jsonb_build_object(
                'id', id,
                'order_id', order_id
            )
            INTO item;

            success_count := success_count + 1;
            _results := _results || item;

        EXCEPTION WHEN OTHERS THEN
            _errors := _errors || jsonb_build_object(
                'order_id', _order_id,
                'error', SQLERRM
            );
            fail_count := fail_count + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', success_count,
        'failed', fail_count,
        'inserted_orders', _results,
        'errors', _errors
    );
END;
$$;
