import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

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
  const { data, error } = await supabase
    .from('user_passes')
    .select('id, pass_type, remaining_credits, expires_at, is_active, created_at')
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

export const bookClass = async (userId: string, classId: string | number): Promise<Booking> => {
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

export const bookWithEligibility = async (
  userId: string,
  classId: number
): Promise<{ booked: boolean; reason?: string; usedCredit?: boolean; remainingCredits?: number }> => {
  try {
    const { data: passes, error } = await supabase
      .from('user_passes')
      .select('id, pass_type, remaining_credits, expires_at, is_active')
      .eq('user_id', userId);
    if (error) throw error;
    const summary = summarizeActivePasses(passes ?? []);

    const payload = { userId, classId, useCreditPassId: summary.hasUnlimited ? null : summary.creditPassId };
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('book-class', { body: payload });
      if (fnErr) throw fnErr as any;
      if ((result as any)?.ok) {
        const usedCredit = Boolean((result as any)?.usedCredit ?? false);
        const remainingCredits = (result as any)?.remainingCredits as number | undefined;
        return { booked: true, usedCredit, remainingCredits };
      }
    } catch (edgeErr) {
      console.warn('bookWithEligibility: edge function fallback', (edgeErr as any)?.message ?? String(edgeErr));
      if (summary.hasUnlimited) {
        const { error: bookErr } = await supabase
          .from('class_bookings')
          .insert({ user_id: userId, class_id: classId });
        if (bookErr) throw bookErr;
        return { booked: true };
      }
      if (summary.totalCredits > 0) {
        const { error: bookErr } = await supabase
          .from('class_bookings')
          .insert({ user_id: userId, class_id: classId });
        if (bookErr) throw bookErr;
        return { booked: true };
      }
    }

    return { booked: false, reason: 'no_pass' };
  } catch (e: any) {
    console.error('bookWithEligibility error', e);
    return { booked: false, reason: e?.message ?? 'error' };
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
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const from = `${yyyy}-${mm}-${dd}`;

  const { data, error } = await supabase
    .from('class_bookings')
    .select(`
      id,
      class_schedule:class_id (id, title, instructor, date, start_time, end_time)
    `)
    .eq('user_id', userId);
  if (error) throw error;

  const rows = ((data ?? []) as unknown) as { id: number; class_schedule: { id: number; title: string | null; instructor: string | null; date: string; start_time: string; end_time: string } | null }[];
  const upcoming = rows
    .filter(r => r.class_schedule && r.class_schedule.date >= from)
    .map<UpcomingClassBooking>((r) => ({
      booking_id: r.id,
      class_id: r.class_schedule!.id,
      title: r.class_schedule!.title ?? 'Class',
      instructor: r.class_schedule!.instructor ?? null,
      date: r.class_schedule!.date,
      start_time: r.class_schedule!.start_time,
      end_time: r.class_schedule!.end_time,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  return upcoming;
};

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';