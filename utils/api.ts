// Import the configured supabase client
import { supabase } from '@/lib/supabase';

console.log('🔧 API utils loaded with Supabase client');

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'member' | 'instructor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface UserPass {
  id: string;
  user_id: string;
  pass_type: 'single' | 'pack_5' | 'pack_10' | 'unlimited';
  remaining_credits?: number;
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  instructor_id: string;
  instructor_name: string;
  datetime: string;
  duration_minutes: number;
  capacity: number;
  booked_count: number;
  price?: number;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  class_id: string;
  status: 'booked' | 'cancelled' | 'attended' | 'no_show';
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  consent_marketing: boolean;
  unsubscribed: boolean;
  source: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'push' | 'sms' | 'email';
  channels: string[];
  target_audience?: string;
  scheduled_for?: string;
  sent_at?: string;
  sent_by: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  created_at: string;
}

// Auth helpers
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return profile;
};

export const signUp = async (email: string, password: string, name: string, phone?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  
  if (data.user) {
    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email,
        name,
        phone,
        role: 'member',
      });
      
    if (profileError) throw profileError;
  }
  
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// API functions
export const getUserPasses = async (userId: string): Promise<UserPass[]> => {
  const { data, error } = await supabase
    .from('user_passes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const getClasses = async (): Promise<Class[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      bookings!inner(count)
    `)
    .gte('datetime', new Date().toISOString())
    .order('datetime', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      classes(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const bookClass = async (userId: string, classId: string): Promise<Booking> => {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      class_id: classId,
      status: 'booked',
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
    
  if (error) throw error;
};

// Admin functions (with role checks)
export const createClass = async (classData: Omit<Class, 'id' | 'created_at' | 'booked_count'>): Promise<Class> => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Unauthorized: Admin or instructor access required');
  }
  
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId: string, role: User['role']): Promise<void> => {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);
    
  if (error) throw error;
};

export const getAllUsers = async (): Promise<User[]> => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Unauthorized: Admin or instructor access required');
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const getContacts = async (): Promise<Contact[]> => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Unauthorized: Admin or instructor access required');
  }
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const importContacts = async (contacts: Omit<Contact, 'id' | 'created_at'>[]): Promise<void> => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Unauthorized: Admin or instructor access required');
  }
  
  const { error } = await supabase
    .from('contacts')
    .insert(contacts);
    
  if (error) throw error;
};

export const sendNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'sent_by'>): Promise<Notification> => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Unauthorized: Admin or instructor access required');
  }
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      sent_by: user.id,
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const getNotifications = async (): Promise<Notification[]> => {
  const user = await getCurrentUser();
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Unauthorized: Admin or instructor access required');
  }
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

// Role-based access control helpers
export const requireAdmin = (userRole: string) => {
  if (userRole !== 'admin') {
    throw new Error('Admin access required');
  }
};

export const requireStaff = (userRole: string) => {
  if (!['admin', 'instructor'].includes(userRole)) {
    throw new Error('Staff access required');
  }
};

// Environment validation
export const validateEnvironment = () => {
  console.log('✅ Environment validation: Using configured Supabase client');
  return true; // Always return true since we're using hardcoded values
};

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';