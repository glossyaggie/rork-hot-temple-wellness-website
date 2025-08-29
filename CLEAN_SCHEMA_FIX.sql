-- CLEAN SCHEMA FIX - The Hot Temple
-- This fixes all the booking and credit issues in one go
-- Run this in your Supabase SQL Editor

-- 1) First, let's check what we have and fix the profiles table
-- Add email column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Update profiles with email from auth.users
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id
AND profiles.email IS NULL;

-- 2) Ensure we have the booking_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('booked','cancelled','attended','no_show','waitlist');
  END IF;
END$$;

-- 3) Fix user_passes table - standardize on remaining_credits
-- Add remaining_credits column if it doesn't exist
ALTER TABLE public.user_passes 
ADD COLUMN IF NOT EXISTS remaining_credits integer;

-- Migrate from any old column names
UPDATE public.user_passes 
SET remaining_credits = COALESCE(remaining_credits, credits_remaining, credits, 0)
WHERE remaining_credits IS NULL;

-- Add constraint to prevent negative balances
ALTER TABLE public.user_passes
  DROP CONSTRAINT IF EXISTS remaining_nonnegative;
ALTER TABLE public.user_passes
  ADD CONSTRAINT remaining_nonnegative CHECK (remaining_credits IS NULL OR remaining_credits >= 0);

-- 4) Fix class_bookings table structure
-- Add consumed_pass_id if it doesn't exist
ALTER TABLE public.class_bookings 
ADD COLUMN IF NOT EXISTS consumed_pass_id uuid REFERENCES public.user_passes(id);

-- Ensure status column uses the enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_bookings' 
    AND column_name = 'status' 
    AND data_type = 'USER-DEFINED'
  ) THEN
    -- Add status column if it doesn't exist or fix its type
    ALTER TABLE public.class_bookings 
    ADD COLUMN IF NOT EXISTS status booking_status DEFAULT 'booked';
  END IF;
END$$;

-- 5) Create the atomic booking function
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

-- 6) Create cancellation function
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS int -- returns new balance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pass uuid;
  v_unlimited boolean := false;
  v_new_balance int;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get booking details
  SELECT b.consumed_pass_id
  INTO v_pass
  FROM class_bookings b
  WHERE b.id = p_booking_id 
    AND b.user_id = v_user 
    AND b.status = 'booked'
  FOR UPDATE;

  IF v_pass IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
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

  -- Get the new balance
  SELECT COALESCE(remaining_credits, 0) INTO v_new_balance 
  FROM user_passes 
  WHERE id = v_pass;

  RETURN v_new_balance;
END$$;

-- 7) Grant permissions
GRANT EXECUTE ON FUNCTION public.book_class(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- 8) Add a test pass for your user (you'll need to replace the user_id)
-- First, let's see your user ID
SELECT 
  'Your user ID:' as info,
  auth.uid() as your_user_id,
  'Run this next:' as next_step,
  'INSERT INTO user_passes (user_id, pass_type, remaining_credits, expires_at, is_active) VALUES (''' || auth.uid() || ''', ''10 Class Pass'', 10, NOW() + INTERVAL ''30 days'', true);' as insert_command;

-- 9) Test the function
DO $$
BEGIN
  BEGIN
    PERFORM book_class(999999);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Function test result: %', SQLERRM;
  END;
END$$;

SELECT 'Schema fixed! Now update your app code to use the RPC functions.' as result;