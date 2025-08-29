// Debug utilities for the booking system
// You can call these functions from the browser console to test the booking system

import { supabase } from '@/lib/supabase';
import { fetchMyPasses, bookClass, getUpcomingBookedClasses, testBookingRPC } from '@/utils/api';

export const debugBooking = {
  // Check current user authentication
  async checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔐 Auth Status:', { user: user?.id, email: user?.email, error });
    return { user, error };
  },

  // Check user's passes
  async checkPasses() {
    try {
      const passes = await fetchMyPasses();
      console.log('🎫 User Passes:', passes);
      
      const activePasses = passes.filter(p => {
        const isActive = p.is_active !== false;
        const hasCredits = (p.remaining_credits ?? 0) > 0 || (p.pass_type && p.pass_type.toLowerCase().includes('unlimited'));
        const notExpired = !p.expires_at || new Date(p.expires_at) > new Date();
        return isActive && hasCredits && notExpired;
      });
      
      console.log('✅ Active Passes:', activePasses);
      return { passes, activePasses };
    } catch (e) {
      console.error('❌ Error fetching passes:', e);
      return { error: e };
    }
  },

  // Test the RPC function directly
  async testRPC(classId: number) {
    console.log('🧪 Testing RPC for class:', classId);
    return await testBookingRPC(classId);
  },

  // Test full booking flow
  async testBooking(classId: number) {
    console.log('🎯 Testing full booking flow for class:', classId);
    
    try {
      // Check auth first
      const authResult = await this.checkAuth();
      if (!authResult.user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Check passes
      const passResult = await this.checkPasses();
      if (passResult.error || !passResult.activePasses?.length) {
        return { success: false, error: 'No active passes' };
      }

      // Try booking
      const result = await bookClass(classId);
      console.log('✅ Booking successful:', result);
      return { success: true, result };
    } catch (e) {
      console.error('❌ Booking failed:', e);
      return { success: false, error: e };
    }
  },

  // Check upcoming bookings
  async checkUpcoming() {
    try {
      const { user } = await this.checkAuth();
      if (!user) return { error: 'Not authenticated' };

      const upcoming = await getUpcomingBookedClasses(user.id);
      console.log('📅 Upcoming bookings:', upcoming);
      return { upcoming };
    } catch (e) {
      console.error('❌ Error fetching upcoming:', e);
      return { error: e };
    }
  },

  // Check database tables directly
  async checkTables() {
    console.log('🗄️ Checking database tables...');
    
    try {
      // Check class_schedule
      const { data: classes, error: classError } = await supabase
        .from('class_schedule')
        .select('*')
        .limit(5);
      console.log('📚 Classes:', classes, classError);

      // Check user_passes
      const { data: passes, error: passError } = await supabase
        .from('user_passes')
        .select('*')
        .limit(5);
      console.log('🎫 Passes:', passes, passError);

      // Check class_bookings
      const { data: bookings, error: bookingError } = await supabase
        .from('class_bookings')
        .select('*')
        .limit(5);
      console.log('📋 Bookings:', bookings, bookingError);

      return { classes, passes, bookings };
    } catch (e) {
      console.error('❌ Database check failed:', e);
      return { error: e };
    }
  },

  // Test if RPC function exists
  async testRPCExists() {
    console.log('🔧 Testing if book_class RPC exists...');
    
    try {
      // Try calling with invalid class ID to test if function exists
      const { error } = await supabase.rpc('book_class', { p_class_id: 999999 });
      
      if (error?.message?.includes('function public.book_class(integer) does not exist')) {
        console.log('❌ RPC function does not exist in database');
        return { exists: false, error: 'RPC function not found' };
      }
      
      console.log('✅ RPC function exists (got expected error for invalid class):', error?.message);
      return { exists: true, testError: error?.message };
    } catch (e: any) {
      console.error('🚨 RPC test failed:', e);
      return { exists: false, error: e?.message };
    }
  },

  // Run all checks
  async runAllChecks() {
    console.log('🔍 Running all booking system checks...');
    
    const auth = await this.checkAuth();
    const passes = await this.checkPasses();
    const rpcExists = await this.testRPCExists();
    const upcoming = await this.checkUpcoming();
    const tables = await this.checkTables();
    
    return { auth, passes, rpcExists, upcoming, tables };
  }
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  (window as any).debugBooking = debugBooking;
}

export default debugBooking;