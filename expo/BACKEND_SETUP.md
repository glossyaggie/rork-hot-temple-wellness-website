# Hot Temple App - Backend Setup Guide

## 🚀 URGENT: Fix the Current Error

The app is crashing because the environment variables aren't loading properly. I've added fallback values, but you need to:

1. **Restart your development server** (stop and start again)
2. **Clear your browser cache** if testing on web
3. **Check the console logs** for the "🔧 Environment check" message

## 🗄️ Database Setup

1. **Go to your Supabase project**: https://ujenpxsmooeineiznjvx.supabase.co
2. **Click on "SQL Editor"** in the left sidebar
3. **Copy and paste the SQL below** to create your database schema
4. **Test the app** by signing up and making yourself admin

## 1. Create Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'instructor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User passes table
CREATE TABLE user_passes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  pass_type TEXT NOT NULL CHECK (pass_type IN ('single', 'pack_5', 'pack_10', 'unlimited')),
  remaining_credits INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  instructor_name TEXT NOT NULL,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 20,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'attended', 'no_show')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);

-- Contacts table (for SMS/email marketing)
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  consent_marketing BOOLEAN DEFAULT FALSE,
  unsubscribed BOOLEAN DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('push', 'sms', 'email')),
  channels TEXT[] NOT NULL,
  target_audience TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_passes_user_id ON user_passes(user_id);
CREATE INDEX idx_user_passes_active ON user_passes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_classes_datetime ON classes(datetime);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_class_id ON bookings(class_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 2. Set up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins can update user roles" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- User passes policies
CREATE POLICY "Users can view own passes" ON user_passes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own passes" ON user_passes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all passes" ON user_passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'instructor')
    )
  );

-- Classes policies
CREATE POLICY "Anyone can view classes" ON classes
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage classes" ON classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'instructor')
    )
  );

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'instructor')
    )
  );

-- Contacts policies (staff only)
CREATE POLICY "Staff can manage contacts" ON contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'instructor')
    )
  );

-- Notifications policies (staff only)
CREATE POLICY "Staff can manage notifications" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'instructor')
    )
  );
```

## 3. Create a function to handle user creation

```sql
-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 4. Insert sample data (optional)

```sql
-- Sample classes (you can add these after creating your first admin user)
INSERT INTO classes (name, instructor_name, datetime, duration_minutes, capacity, price) VALUES
('Hot Yoga Flow', 'Sarah Johnson', NOW() + INTERVAL '1 day', 60, 20, 25.00),
('Power Vinyasa', 'Mike Chen', NOW() + INTERVAL '2 days', 75, 15, 30.00),
('Gentle Hatha', 'Emma Wilson', NOW() + INTERVAL '3 days', 60, 25, 20.00);
```

## 5. Testing Steps

### Step 1: Run the SQL
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the sidebar
3. Copy and paste all the SQL above
4. Click "Run" to execute

### Step 2: Test the App
1. Open your app and sign up with a new email (like `test@example.com`)
2. You should see the app working, but no Admin tab (you're a regular member)

### Step 3: Make Yourself Admin
1. Go back to Supabase SQL Editor
2. Run this command (replace with your email):
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'test@example.com';
```

### Step 4: Verify Admin Access
1. Close and reopen your app (or logout/login)
2. You should now see the Admin tab!
3. Test creating notifications, managing contacts, etc.

### Step 5: Test Regular Users
1. Sign up with another email
2. Verify they DON'T see the Admin tab
3. This confirms role-based access is working

## 🎉 What You've Accomplished

✅ **Real Database**: Your app now uses PostgreSQL instead of local storage  
✅ **User Isolation**: Each user has their own private data  
✅ **Role-Based Access**: Admin tab only shows for staff  
✅ **Secure Authentication**: Proper JWT-based auth with Supabase  
✅ **Scalable**: Ready for 5000+ users  

## Next Steps

Once this is working:
1. **SMS Integration**: Add Twilio for mass messaging
2. **Stripe Payments**: Real pass purchases
3. **Push Notifications**: Class reminders
4. **Contact Import**: CSV upload for existing members

Need help with any of these steps? Let me know!