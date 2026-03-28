# Setup Instructions

## 🚨 URGENT: Fix Booking System

**Your booking system isn't working because the database function is missing.**

### Step 1: Install Booking System
1. Go to your Supabase project: https://ujenpxsmooeineiznjvx.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the **entire content** from `database-booking.sql`
4. Click **"Run"** to execute all the commands

This will:
- ✅ Create the `book_class` RPC function that properly decrements credits
- ✅ Create the `class_bookings` table
- ✅ Add `remaining_credits` column to `user_passes`
- ✅ Set up proper atomic transactions (no more race conditions)
- ✅ Add cancellation system that refunds credits

### Step 2: Test the Fix
1. Open your app
2. Open browser console (F12)
3. Run: `await debugBooking.testRPCExists()`
4. Should show: `✅ RPC function exists`
5. Try booking a class - your credits should decrease by 1

### Step 3: Debug if Still Not Working
Run these in browser console:
```javascript
// Check everything
await debugBooking.runAllChecks()

// Test specific class booking (replace 123 with real class ID)
await debugBooking.testBooking(123)
```

## Database Setup (if not done yet)

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

## The app now properly handles:
- ✅ Real Supabase authentication (no more mocks)
- ✅ Proper database schema with all required fields
- ✅ Admin role checking
- ✅ Tab visibility based on authentication status
- ✅ **Atomic booking system that decrements credits properly**
- ✅ Better error messages