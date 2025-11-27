-- Migration: Create import_orders_bulk RPC function
-- Handles bulk import of orders with server-side product mapping and risk calculation

CREATE OR REPLACE FUNCTION import_orders_bulk(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_item jsonb;
    _user_id uuid;
    _product_id uuid;
    _product_name text;
    _normalized_product_name text;
    _customer_phone text;
    _risk_score int;
    _risk_level text;
    _blacklist_count int;
    _boom_count int;
    _success_count int := 0;
    _error_count int := 0;
    _errors jsonb := '[]'::jsonb;
    _inserted_id uuid;
BEGIN
    -- Get current user ID
    _user_id := auth.uid();
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object('success', 0, 'failed', 0, 'errors', jsonb_build_array('User not authenticated'));
    END IF;

    -- Loop through each order in the payload array
    FOR order_item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        BEGIN
            -- Extract basic fields
            _customer_phone := TRIM(order_item->>'phone');
            _product_name := TRIM(order_item->>'product');
            
            -- 1. Product Mapping
            _product_id := NULL;
            
            IF _product_name IS NOT NULL AND _product_name != '' THEN
                -- Try exact match first
                SELECT id INTO _product_id
                FROM products
                WHERE user_id = _user_id 
                  AND LOWER(TRIM(name)) = LOWER(TRIM(_product_name))
                LIMIT 1;
                
                -- If not found, try fuzzy match (ILIKE)
                IF _product_id IS NULL THEN
                    SELECT id INTO _product_id
                    FROM products
                    WHERE user_id = _user_id 
                      AND name ILIKE '%' || _product_name || '%'
                    LIMIT 1;
                END IF;
            END IF;

            -- 2. Risk Calculation
            _risk_score := 0;
            _risk_level := 'safe';
            
            -- Check Blacklist
            SELECT COUNT(*) INTO _blacklist_count
            FROM customer_blacklist
            WHERE user_id = _user_id AND phone = _customer_phone;
            
            IF _blacklist_count > 0 THEN
                _risk_score := 100;
                _risk_level := 'danger';
            ELSE
                -- Check Order History (Boom/Returned count)
                SELECT COUNT(*) INTO _boom_count
                FROM orders
                WHERE user_id = _user_id 
                  AND phone = _customer_phone 
                  AND status IN ('Boom', 'Returned', 'Failed');
                  
                IF _boom_count > 0 THEN
                    _risk_score := 50 + (_boom_count * 10);
                    IF _risk_score > 100 THEN _risk_score := 100; END IF;
                    _risk_level := CASE 
                        WHEN _risk_score >= 80 THEN 'danger'
                        WHEN _risk_score >= 50 THEN 'warning'
                        ELSE 'safe'
                    END;
                END IF;
            END IF;

            -- 3. Insert Order
            INSERT INTO orders (
                user_id,
                order_id,
                customer_name,
                phone,
                address,
                product_id,
                product,
                amount,
                status,
                risk_score,
                risk_level,
                payment_method,
                address_detail,
                ward,
                district,
                province,
                gender,
                birth_year,
                discount_amount,
                shipping_fee,
                channel,
                source,
                order_date,
                created_at,
                updated_at
            ) VALUES (
                _user_id,
                order_item->>'order_id',
                order_item->>'customer_name',
                _customer_phone,
                order_item->>'address',
                _product_id,
                COALESCE(_product_name, ''),
                (order_item->>'amount')::numeric,
                COALESCE(order_item->>'status', 'Pending'),
                _risk_score::text, -- Schema uses text for risk_score currently
                _risk_level,
                COALESCE(order_item->>'payment_method', 'COD'),
                order_item->>'address_detail',
                order_item->>'ward',
                order_item->>'district',
                order_item->>'province',
                order_item->>'gender',
                (order_item->>'birth_year')::int,
                COALESCE((order_item->>'discount_amount')::numeric, 0),
                COALESCE((order_item->>'shipping_fee')::numeric, 0),
                order_item->>'channel',
                order_item->>'source',
                (order_item->>'order_date')::date,
                NOW(),
                NOW()
            ) RETURNING id INTO _inserted_id;

            _success_count := _success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            _error_count := _error_count + 1;
            _errors := _errors || jsonb_build_object(
                'order_id', order_item->>'order_id',
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', _success_count,
        'failed', _error_count,
        'errors', _errors
    );
END;
$$;
