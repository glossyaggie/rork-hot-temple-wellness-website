# Authentication Setup Instructions

## Step 1: Run Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `database-setup.sql`
4. Click "Run" to execute all the SQL commands

This will:
- Add the missing columns to your profiles table
- Create the device_tokens table for push notifications
- Set up proper RLS policies
- Create a trigger to automatically create profiles for new users
- Make your email (christopherascott@hotmail.com) an admin

## Step 2: Verify Environment Variables

Make sure these are set in your environment:
```
EXPO_PUBLIC_SUPABASE_URL=https://ujenpxsmooeineiznjvx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZW5weHNtb29laW5laXpuanZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzczODksImV4cCI6MjA3MTgxMzM4OX0.-mNB_mjPEjP33wxDlptHyO02h88K8FP7OxI52btsw2A
```

## Step 3: Test the Authentication

1. Try signing up with a new account
2. Fill in all required fields and check the required checkboxes
3. Try logging in with your existing account (christopherascott@hotmail.com)
4. The Admin tab should appear for your account after login

## Troubleshooting

If you still get errors:

1. **"consent_marketing column not found"**: Run the database setup SQL again
2. **"Login failed"**: Check that your password is correct in Supabase Auth > Users
3. **"Environment variables not found"**: Restart your development server after setting the env vars
4. **Admin tab not showing**: Check that your email is set to 'admin' role in the profiles table

## What's Fixed

- ✅ Environment variables are properly configured
- ✅ Database schema includes all required columns
- ✅ Auth flow handles missing columns gracefully
- ✅ Admin tab only shows for admin/instructor users
- ✅ Push notification registration on first login
- ✅ Proper error handling and user feedback