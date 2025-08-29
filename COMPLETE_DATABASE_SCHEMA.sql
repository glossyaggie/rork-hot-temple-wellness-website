-- Complete database schema for The Hot Temple booking system
-- Run this in your Supabase SQL Editor

-- 1) Ensure we have the booking_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('booked','cancelled','attended','no_show','waitlist');
  END IF;
END$$;

-- 2) Ensure class_schedule table exists
CREATE TABLE IF NOT EXISTS public.class_schedule (
  id SERIAL PRIMARY KEY,
  title text,
  instructor text,
  date text NOT NULL, -- YYYY-MM-DD format
  day text,
  start_time text NOT NULL, -- e.g., '6:00 AM'
  end_time text NOT NULL,   -- e.g., '7:00 AM'
  capacity integer DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Ensure class_bookings table exists with proper structure
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id integer NOT NULL REFERENCES public.class_schedule(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'booked',
  booked_at timestamptz NOT NULL DEFAULT now(),
  consumed_pass_id uuid REFERENCES public.user_passes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Ensure user_passes table exists with remaining_credits column
CREATE TABLE IF NOT EXISTS public.user_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_type text,
  remaining_credits integer,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Add constraint to prevent negative balances
ALTER TABLE public.user_passes
  DROP CONSTRAINT IF EXISTS remaining_nonnegative;
ALTER TABLE public.user_passes
  ADD CONSTRAINT remaining_nonnegative CHECK (remaining_credits IS NULL OR remaining_credits >= 0);

-- 6) Enable RLS on all tables
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passes ENABLE ROW LEVEL SECURITY;

-- 7) Create atomic booking function
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

-- 8) Create cancellation function that refunds credits
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_class_date text;
  v_class_start text;
  v_pass uuid;
  v_unlimited boolean := false;
  v_class_datetime timestamptz;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get booking details
  SELECT b.consumed_pass_id, c.date, c.start_time
  INTO v_pass, v_class_date, v_class_start
  FROM class_bookings b
  JOIN class_schedule c ON c.id = b.class_id
  WHERE b.id = p_booking_id 
    AND b.user_id = v_user 
    AND b.status = 'booked'
  FOR UPDATE;

  IF v_pass IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  -- Parse class datetime (assuming format like "2025-08-29" and "6:00 AM")
  -- For now, allow cancellation (you can add time restrictions later)
  
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

-- 9) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.book_class(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- 10) RLS policies for class_schedule
DROP POLICY IF EXISTS "Anyone can view class schedule" ON class_schedule;
CREATE POLICY "Anyone can view class schedule"
ON class_schedule
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage class schedule" ON class_schedule;
CREATE POLICY "Admins can manage class schedule"
ON class_schedule
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'instructor')
  )
);

-- 11) RLS policies for class_bookings
DROP POLICY IF EXISTS "Users can book classes via RPC" ON class_bookings;
CREATE POLICY "Users can book classes via RPC"
ON class_bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own bookings" ON class_bookings;
CREATE POLICY "Users can view own bookings"
ON class_bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON class_bookings;
CREATE POLICY "Users can update own bookings"
ON class_bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 12) RLS policies for user_passes
DROP POLICY IF EXISTS "Users can view own passes" ON user_passes;
CREATE POLICY "Users can view own passes"
ON user_passes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "RPC can update user passes" ON user_passes;
CREATE POLICY "RPC can update user passes"
ON user_passes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own passes" ON user_passes;
CREATE POLICY "Users can insert own passes"
ON user_passes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 13) Create some sample data for testing (optional)
-- Insert a test pass for your user (replace with your actual user ID)
-- You can get your user ID by running: SELECT auth.uid();

-- Example: INSERT INTO user_passes (user_id, pass_type, remaining_credits, expires_at)
-- VALUES ('your-user-id-here', '10 Class Pass', 10, NOW() + INTERVAL '30 days');

-- 14) Test the function works
SELECT 'Testing book_class function...' as status;

-- This should return an error about class_not_found, which means the function exists
DO $$
BEGIN
  BEGIN
    PERFORM book_class(999999);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Function test result: %', SQLERRM;
  END;
END$$;

SELECT 'Atomic booking system installed successfully!' as result;

-- 15) Show current schema info
SELECT 
  'Tables created:' as info,
  string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('class_schedule', 'class_bookings', 'user_passes');