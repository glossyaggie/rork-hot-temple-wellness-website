-- Add test passes for your user
-- Run this AFTER running the main schema
-- Replace 'your-email@example.com' with your actual email

-- First, let's see your user ID
SELECT 
  'Your user info:' as info,
  auth.uid() as your_user_id,
  p.email,
  p.role
FROM profiles p 
WHERE p.id = auth.uid();

-- Add a 10-class pass for testing
INSERT INTO user_passes (user_id, pass_type, remaining_credits, expires_at, is_active)
VALUES (
  auth.uid(), 
  '10 Class Pass', 
  10, 
  NOW() + INTERVAL '30 days',
  true
)
ON CONFLICT DO NOTHING;

-- Add an unlimited monthly pass for testing
INSERT INTO user_passes (user_id, pass_type, remaining_credits, expires_at, is_active)
VALUES (
  auth.uid(), 
  'Monthly Unlimited', 
  NULL, 
  NOW() + INTERVAL '30 days',
  true
)
ON CONFLICT DO NOTHING;

-- Verify passes were created
SELECT 
  'Your passes:' as info,
  pass_type,
  remaining_credits,
  expires_at,
  is_active
FROM user_passes 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;