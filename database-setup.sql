-- Database setup for The Hot Temple app
-- Run this in your Supabase SQL Editor

-- 1) First, let's check if profiles table exists and add missing columns
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
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- 3) Enable RLS on device_tokens
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 4) Create RLS policies for device_tokens
DROP POLICY IF EXISTS "Users can manage own device tokens" ON public.device_tokens;
CREATE POLICY "Users can manage own device tokens"
ON public.device_tokens
FOR ALL USING (auth.uid() = user_id);

-- 5) Make sure profiles table has RLS enabled and proper policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create comprehensive policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 6) Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'member'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8) Update your admin user (replace with your email)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'christopherascott@hotmail.com';

-- 9) Verify the setup
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;