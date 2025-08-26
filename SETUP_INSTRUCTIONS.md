# Database Setup Instructions

## IMPORTANT: Run this SQL in your Supabase SQL Editor

1. Go to your Supabase project: https://ujenpxsmooeineiznjvx.supabase.co
2. Navigate to SQL Editor
3. Copy and paste the entire content from `database-setup.sql` 
4. Click "Run" to execute all the commands

This will:
- Add missing columns to the profiles table (consent_marketing, terms_version, etc.)
- Create the device_tokens table for push notifications
- Set up proper Row Level Security (RLS) policies
- Create a trigger to automatically create profiles when users sign up
- Make your email (christopherascott@hotmail.com) an admin

## After running the SQL:

1. Try signing up with a new account in the app
2. Try logging in with your existing account (christopherascott@hotmail.com)
3. The admin tab should now only show for admin users
4. Authentication should work properly

## If you still have issues:

Check the browser console for error messages and let me know what you see.

The app now properly handles:
- ✅ Real Supabase authentication (no more mocks)
- ✅ Proper database schema with all required fields
- ✅ Admin role checking
- ✅ Tab visibility based on authentication status
- ✅ Better error messages