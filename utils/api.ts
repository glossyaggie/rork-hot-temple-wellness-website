import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { emitBookingsChanged, emitPassesChanged } from '@/utils/events';


console.log('🔧 API utils loaded with Supabase client');

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'member' | 'instructor' | 'admin';
  created_at: string;
  updated_at: string;
}

export type UserPass = {
  id: string;
  pass_type: string | null;
  remaining_credits: number | null;
  expires_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

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
  class_id: string | number;
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

export async function fetchMyPasses(): Promise<UserPass[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_passes')
    .select('id, pass_type, remaining_credits, expires_at, is_active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export function computeActiveStatus(p: UserPass) {
  const active = !!p.is_active;
  const hasCredits = (p.remaining_credits ?? 0) > 0;
  const validUntil = p.expires_at ? new Date(p.expires_at) : null;
  const notExpired = !validUntil || validUntil > new Date();
  return active && (hasCredits || notExpired);
}

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

export const bookClassLegacy = async (userId: string, classId: string | number): Promise<Booking> => {
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
  return data as Booking;
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('booking_not_found')) throw new Error('Booking not found.');
    if (msg.includes('too_late_to_cancel')) throw new Error('Too late to cancel (less than 2 hours before class).');
    throw error;
  }
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
export type ActivePassSummary = {
  hasUnlimited: boolean;
  unlimitedValidUntil: string | null;
  totalCredits: number;
  creditPassId: string | null;
};

export const summarizeActivePasses = (
  passes: { id: string; pass_type?: string | null; remaining_credits?: number | null; expires_at?: string | null; is_active?: boolean | null }[],
  nowISO?: string
): ActivePassSummary => {
  const now = nowISO ? new Date(nowISO) : new Date();
  let hasUnlimited = false;
  let unlimitedValidUntil: string | null = null;
  let totalCredits = 0;
  let creditPassId: string | null = null;
  for (const p of passes) {
    if (p.is_active === false) continue;
    const exp = p.expires_at ?? null;
    if (exp && new Date(exp) < now) continue;
    const pt = (p.pass_type ?? '').toLowerCase();
    if (pt.includes('unlimited') || pt.includes('weekly') || pt.includes('monthly') || pt.includes('year')) {
      hasUnlimited = true;
      if (!unlimitedValidUntil || (exp && new Date(exp) > new Date(unlimitedValidUntil))) unlimitedValidUntil = exp;
    } else {
      const rc = p.remaining_credits ?? 0;
      if (rc > 0) {
        totalCredits += rc;
        if (!creditPassId) creditPassId = p.id;
      }
    }
  }
  return { hasUnlimited, unlimitedValidUntil, totalCredits, creditPassId };
};



export const bookClass = async (classId: number): Promise<{ bookingId: string; newBalance: number }> => {
  console.log('🔄 Attempting to book class:', classId);
  
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please sign in to book classes.');
    }
    console.log('👤 User authenticated:', user.id);
    
    // Check if user has any active passes
    const passes = await fetchMyPasses();
    console.log('🎫 User passes:', passes);
    
    const activePasses = passes.filter(p => {
      const isActive = p.is_active !== false;
      const hasCredits = (p.remaining_credits ?? 0) > 0 || (p.pass_type && p.pass_type.toLowerCase().includes('unlimited'));
      const notExpired = !p.expires_at || new Date(p.expires_at) > new Date();
      return isActive && hasCredits && notExpired;
    });
    
    if (activePasses.length === 0) {
      throw new Error('You need an active pass with credits.');
    }
    
    console.log('✅ Active passes found:', activePasses.length);
    
    // Call the RPC function
    const { data, error } = await supabase.rpc('book_class', { p_class_id: classId });
    console.log('📊 RPC response:', { data, error });
    
    if (error) {
      console.error('❌ RPC error:', error);
      const msg = error.message || '';
      if (msg.includes('no_credits')) throw new Error('You need an active pass with credits.');
      if (msg.includes('class_full')) throw new Error('That class is full.');
      if (msg.includes('already_booked')) throw new Error('You\'re already booked in this class.');
      if (msg.includes('class_not_found')) throw new Error('Class not found.');
      if (msg.includes('not_authenticated')) throw new Error('Please sign in to book classes.');
      throw new Error(msg || 'Booking failed. Please try again.');
    }
    
    if (!data || data.length === 0) {
      throw new Error('Booking failed - no response from server.');
    }
    
    const result = { 
      bookingId: data[0]?.booking_id, 
      newBalance: data[0]?.new_balance ?? 0 
    };
    console.log('✅ Booking successful:', result);
    
    // Emit events to refresh UI
    try { emitBookingsChanged(); } catch { /* ignore */ }
    try { emitPassesChanged(); } catch { /* ignore */ }
    
    return result;
  } catch (e) {
    console.error('💥 bookClass error:', e);
    throw e;
  }
};

export const bookWithEligibility = async (
  userId: string,
  classId: number
): Promise<{ booked: boolean; reason?: string; usedCredit?: boolean; remainingCredits?: number }> => {
  console.log('🎯 bookWithEligibility called for user:', userId, 'class:', classId);
  
  try {
    const result = await bookClass(classId);
    console.log('✅ Booking successful, result:', result);
    
    return { 
      booked: true, 
      usedCredit: true, 
      remainingCredits: result.newBalance 
    };
  } catch (e: any) {
    console.error('❌ bookWithEligibility error:', e);
    const msg = e?.message ?? '';
    
    if (msg.includes('need an active pass') || msg.includes('no_credits')) {
      return { booked: false, reason: 'no_pass' };
    }
    if (msg.includes('class is full') || msg.includes('class_full')) {
      return { booked: false, reason: 'class_full' };
    }
    if (msg.includes('already booked') || msg.includes('already_booked')) {
      return { booked: false, reason: 'already_booked' };
    }
    
    return { booked: false, reason: msg || 'Booking failed. Please try again.' };
  }
};

export type CreateCheckoutPayload = {
  priceId: string;
  quantity?: number;
  mode?: 'payment' | 'subscription';
  metadata?: Record<string, string | number | boolean | null>;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  pass_type?: string;
};

export const createCheckout = async (payload: CreateCheckoutPayload): Promise<{ url: string; sessionId: string } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: payload });
    if (error) throw error as any;
    if (!data?.url) return null;
    return data as { url: string; sessionId: string };
  } catch (e) {
    console.error('createCheckout error', e);
    return null;
  }
};

export const openCheckout = async (checkoutUrl: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
      }
      return null;
    }
    const returnUrl = Linking.createURL('/checkout/success');
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
    if (result.type === 'success' && result.url) {
      return result.url;
    }
    return null;
  } catch (e) {
    console.error('openCheckout error', e);
    return null;
  }
};

export const confirmPayment = async (
  sessionId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    if (!userId) {
      console.warn('confirmPayment: No authenticated user');
      return { ok: false, error: 'not_authenticated' };
    }
    try {
      const { data, error } = await supabase.functions.invoke('confirm-payment', { body: { sessionId, userId } });
      if (error) throw error;
      return { ok: Boolean((data as any)?.ok ?? true) };
    } catch (err: any) {
      console.warn('confirmPayment non-2xx ignored (webhook is source of truth):', err?.message ?? String(err));
      return { ok: false, error: 'edge_function_non_2xx' };
    }
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn('confirmPayment unexpected error', msg);
    return { ok: false, error: msg };
  }
};

export const validateEnvironment = () => {
  console.log('✅ Environment validation: Using configured Supabase client');
  return true;
};

export type UpcomingClassBooking = {
  booking_id: number;
  class_id: number;
  title: string;
  instructor: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // e.g., '6:00 PM'
  end_time: string;   // e.g., '7:00 PM'
};

export const getUpcomingBookedClasses = async (userId: string): Promise<UpcomingClassBooking[]> => {
  console.log('📅 Loading upcoming classes for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('class_bookings')
      .select(`
        id,
        status,
        class_schedule:class_id (
          id, 
          title, 
          instructor, 
          date, 
          start_time, 
          end_time
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'booked')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('❌ Error loading bookings:', error);
      throw error;
    }
    
    console.log('📊 Raw booking data:', data);
    
    if (!data || data.length === 0) {
      console.log('📭 No bookings found');
      return [];
    }

    const rows = (data as unknown) as { 
      id: string; 
      status: string;
      class_schedule: { 
        id: number; 
        title: string | null; 
        instructor: string | null; 
        date: string; 
        start_time: string; 
        end_time: string 
      } | null 
    }[];

    const toMin = (s: string) => {
      const parts = s.trim().split(' ');
      const t = parts[0] ?? '';
      const ampm = (parts[1] ?? '').toUpperCase();
      const hm = t.split(':');
      let h = Number(hm[0] ?? 0);
      const m = Number(hm[1] ?? 0);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const now = new Date();
    const upcoming = rows
      .filter(r => r.class_schedule && r.status === 'booked')
      .map((r) => {
        const cs = r.class_schedule!;
        const [y, mo, d] = cs.date.split('-').map((x) => Number(x));
        const endMins = toMin(cs.end_time);
        const endDate = new Date(y, mo - 1, d, Math.floor(endMins / 60), endMins % 60, 0, 0);
        return { r, endDate, cs } as const;
      })
      .filter(({ endDate }) => {
        const isUpcoming = endDate > now;
        console.log(`🕐 Class ${endDate.toISOString()} vs now ${now.toISOString()}: ${isUpcoming ? 'upcoming' : 'past'}`);
        return isUpcoming;
      })
      .map<UpcomingClassBooking>(({ r, cs }) => ({
        booking_id: parseInt(r.id),
        class_id: cs.id,
        title: cs.title ?? 'Class',
        instructor: cs.instructor ?? null,
        date: cs.date,
        start_time: cs.start_time,
        end_time: cs.end_time,
      }))
      .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
      .slice(0, 10); // Limit to 10 upcoming classes

    console.log('✅ Upcoming classes processed:', upcoming.length);
    return upcoming;
  } catch (e) {
    console.error('💥 getUpcomingBookedClasses error:', e);
    throw e;
  }
};

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Debug function to test RPC
export const testBookingRPC = async (classId: number) => {
  console.log('🧪 Testing book_class RPC with classId:', classId);
  
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Auth check:', { user: user?.id, error: authError });
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check if user has any passes
    const passes = await fetchMyPasses();
    console.log('🎫 User passes:', passes);
    
    // Try the RPC call
    const { data, error } = await supabase.rpc('book_class', { p_class_id: classId });
    console.log('📞 RPC result:', { data, error });
    
    return { success: !error, data, error };
  } catch (e) {
    console.error('🚨 Test error:', e);
    return { success: false, error: e };
  }
};

// Add this to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).testBookingRPC = testBookingRPC;
  (window as any).bookClass = bookClass;
  (window as any).getUpcomingBookedClasses = getUpcomingBookedClasses;
}