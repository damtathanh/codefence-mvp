-- Migration: Create reevaluate_risk_for_phone RPC function
-- Re-evaluates risk for all pending orders associated with a phone number
-- Triggered when a customer is blacklisted

CREATE OR REPLACE FUNCTION reevaluate_risk_for_phone(p_user_id uuid, p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _blacklist_count int;
    _risk_score int;
    _risk_level text;
BEGIN
    -- Check if phone is blacklisted for this user
    SELECT COUNT(*) INTO _blacklist_count
    FROM customer_blacklist
    WHERE user_id = p_user_id AND phone = p_phone;

    IF _blacklist_count > 0 THEN
        _risk_score := 100;
        _risk_level := 'danger';
    ELSE
        -- If unbanned, we might want to revert to a lower score, 
        -- but for now we only handle the "Ban" case explicitly requested.
        -- If unbanned, we could re-calculate based on history, but let's stick to the requirement:
        -- "When a customer is banned... trigger a function to re-evaluate risk"
        -- If unbanned, we might want to set it back to safe/warning based on history.
        -- Let's implement a basic re-calc similar to import logic.
        
        DECLARE
            _boom_count int;
        BEGIN
             SELECT COUNT(*) INTO _boom_count
                FROM orders
                WHERE user_id = p_user_id 
                  AND phone = p_phone 
                  AND status IN ('Boom', 'Returned', 'Failed');
                  
            IF _boom_count > 0 THEN
                _risk_score := 50 + (_boom_count * 10);
                IF _risk_score > 100 THEN _risk_score := 100; END IF;
                _risk_level := CASE 
                    WHEN _risk_score >= 80 THEN 'danger'
                    WHEN _risk_score >= 50 THEN 'warning'
                    ELSE 'safe'
                END;
            ELSE
                _risk_score := 0;
                _risk_level := 'safe';
            END IF;
        END;
    END IF;

    -- Update all 'Pending' or 'Pending Review' orders for this phone
    UPDATE orders
    SET 
        risk_score = _risk_score::text,
        risk_level = _risk_level,
        updated_at = NOW()
    WHERE 
        user_id = p_user_id 
        AND phone = p_phone
        AND status IN ('Pending', 'Pending Review');

END;
$$;
