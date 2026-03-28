-- Add missing columns to profiles table for consent and legal fields
-- Run this in Supabase SQL Editor

-- 1) Add extra profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiver_signature_url text;

-- 2) Create device_tokens table for push notifications
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,               -- 'ios' | 'android' | 'web'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- 3) Enable RLS on device_tokens
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 4) Create RLS policies for device_tokens
DROP POLICY IF EXISTS "user can manage own tokens" ON public.device_tokens;
CREATE POLICY "user can manage own tokens"
ON public.device_tokens
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) Update existing user to admin (replace email with your email)
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'christopherascott@hotmail.com';

-- 6) Notify that schema has been reloaded
SELECT pg_notify('pgrst', 'reload schema');