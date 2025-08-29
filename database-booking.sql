-- Atomic booking system with proper credit management
-- Run this in your Supabase SQL Editor

-- 1) Ensure we have the booking_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('booked','cancelled','attended','no_show','waitlist');
  END IF;
END$$;

-- 2) Ensure class_bookings table exists with proper structure
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id integer NOT NULL REFERENCES public.class_schedule(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'booked',
  booked_at timestamptz NOT NULL DEFAULT now(),
  consumed_pass_id uuid REFERENCES public.user_passes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

-- 3) Ensure user_passes has remaining_credits column
ALTER TABLE public.user_passes 
  ADD COLUMN IF NOT EXISTS remaining_credits int;

-- 4) Add constraint to prevent negative balances
ALTER TABLE public.user_passes
  DROP CONSTRAINT IF EXISTS remaining_nonnegative;
ALTER TABLE public.user_passes
  ADD CONSTRAINT remaining_nonnegative CHECK (remaining_credits IS NULL OR remaining_credits >= 0);

-- 5) Create atomic booking function
CREATE OR REPLACE FUNCTION public.book_class(p_class_id integer)
RETURNS TABLE(booking_id uuid, new_balance int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_capacity int;
  v_booked int;
  v_pass_id uuid;
  v_unlimited boolean := false;
  v_booking_id uuid;
  v_new_balance int;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Lock class row for capacity check
  SELECT c.capacity INTO v_capacity
  FROM class_schedule c
  WHERE c.id = p_class_id
  FOR UPDATE;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  -- Check if user already booked this class
  IF EXISTS (
    SELECT 1 FROM class_bookings b 
    WHERE b.user_id = v_user 
      AND b.class_id = p_class_id 
      AND b.status = 'booked'
  ) THEN
    RAISE EXCEPTION 'already_booked';
  END IF;

  -- Check capacity
  SELECT COUNT(*) INTO v_booked
  FROM class_bookings b
  WHERE b.class_id = p_class_id AND b.status = 'booked';

  IF v_booked >= v_capacity THEN
    RAISE EXCEPTION 'class_full';
  END IF;

  -- Find an active pass (prioritize soonest expiring)
  SELECT up.id,
         (COALESCE(up.pass_type, '') ILIKE '%unlimited%' OR 
          COALESCE(up.pass_type, '') ILIKE '%weekly%' OR 
          COALESCE(up.pass_type, '') ILIKE '%monthly%' OR 
          COALESCE(up.pass_type, '') ILIKE '%yearly%') as is_unlimited
  INTO v_pass_id, v_unlimited
  FROM user_passes up
  WHERE up.user_id = v_user
    AND COALESCE(up.is_active, true) = true
    AND (
      -- Unlimited passes (always valid if active)
      (COALESCE(up.pass_type, '') ILIKE '%unlimited%' OR 
       COALESCE(up.pass_type, '') ILIKE '%weekly%' OR 
       COALESCE(up.pass_type, '') ILIKE '%monthly%' OR 
       COALESCE(up.pass_type, '') ILIKE '%yearly%')
      OR
      -- Credit passes (must have credits remaining)
      COALESCE(up.remaining_credits, 0) > 0
    )
    AND (up.expires_at IS NULL OR up.expires_at >= NOW())
  ORDER BY COALESCE(up.expires_at, NOW() + INTERVAL '100 years') ASC
  FOR UPDATE
  LIMIT 1;

  IF v_pass_id IS NULL THEN
    RAISE EXCEPTION 'no_credits';
  END IF;

  -- Create booking
  INSERT INTO class_bookings (user_id, class_id, status, booked_at, consumed_pass_id)
  VALUES (v_user, p_class_id, 'booked', NOW(), v_pass_id)
  RETURNING id INTO v_booking_id;

  -- Decrement credits for non-unlimited passes
  IF NOT v_unlimited THEN
    UPDATE user_passes
    SET remaining_credits = remaining_credits - 1
    WHERE id = v_pass_id;

    -- Deactivate pass if no credits left
    UPDATE user_passes
    SET is_active = false
    WHERE id = v_pass_id AND COALESCE(remaining_credits, 0) <= 0;
  END IF;

  -- Get the new balance
  SELECT COALESCE(remaining_credits, 0) INTO v_new_balance 
  FROM user_passes 
  WHERE id = v_pass_id;

  -- Return results
  booking_id := v_booking_id;
  new_balance := v_new_balance;
  RETURN NEXT;
END$$;

-- 6) Create cancellation function that refunds credits
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_class timestamptz;
  v_pass uuid;
  v_unlimited boolean := false;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get booking details
  SELECT b.consumed_pass_id, c.start_time
  INTO v_pass, v_class
  FROM class_bookings b
  JOIN class_schedule c ON c.id = b.class_id
  WHERE b.id = p_booking_id 
    AND b.user_id = v_user 
    AND b.status = 'booked'
  FOR UPDATE;

  IF v_pass IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  -- Only allow cancellation if >= 2 hours before start
  IF v_class - NOW() < INTERVAL '2 hours' THEN
    RAISE EXCEPTION 'too_late_to_cancel';
  END IF;

  -- Cancel the booking
  UPDATE class_bookings 
  SET status = 'cancelled' 
  WHERE id = p_booking_id;

  -- Check if this was an unlimited pass
  SELECT (
    COALESCE(up.pass_type, '') ILIKE '%unlimited%' OR 
    COALESCE(up.pass_type, '') ILIKE '%weekly%' OR 
    COALESCE(up.pass_type, '') ILIKE '%monthly%' OR 
    COALESCE(up.pass_type, '') ILIKE '%yearly%'
  ) INTO v_unlimited
  FROM user_passes up
  WHERE up.id = v_pass;

  -- Refund credit for non-unlimited passes
  IF NOT v_unlimited THEN
    UPDATE user_passes
    SET remaining_credits = remaining_credits + 1,
        is_active = true
    WHERE id = v_pass;
  END IF;
END$$;

-- 7) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.book_class(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- 8) RLS policies
DROP POLICY IF EXISTS "Users can book classes via RPC" ON class_bookings;
CREATE POLICY "Users can book classes via RPC"
ON class_bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own bookings" ON class_bookings;
CREATE POLICY "Users can view own bookings"
ON class_bookings
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON class_bookings;
CREATE POLICY "Users can update own bookings"
ON class_bookings
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "RPC can update user passes" ON user_passes;
CREATE POLICY "RPC can update user passes"
ON user_passes
FOR UPDATE
USING (auth.uid() = user_id);

SELECT 'Atomic booking system installed successfully!' as result;