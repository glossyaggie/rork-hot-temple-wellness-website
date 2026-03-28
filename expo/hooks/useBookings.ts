import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Booking, ClassSlot } from '@/types';
import { useAuth } from './useAuth';
import { bookClass as apiBookClass, getUpcomingBookedClasses, cancelBooking as apiCancelBooking } from '@/utils/api';

const MOCK_CLASSES: ClassSlot[] = [
  // Monday
  { id: 'mon-530', day: 'Monday', time: '5:30 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 8, maxCapacity: 20, bookedBy: [] },
  { id: 'mon-6', day: 'Monday', time: '6:00 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 12, maxCapacity: 15, bookedBy: [] },
  { id: 'mon-8', day: 'Monday', time: '8:00 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 15, maxCapacity: 20, bookedBy: [] },
  { id: 'mon-930', day: 'Monday', time: '9:30 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 6, maxCapacity: 15, bookedBy: [] },
  { id: 'mon-11', day: 'Monday', time: '11:00 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 10, maxCapacity: 20, bookedBy: [] },
  { id: 'mon-4', day: 'Monday', time: '4:00 PM', type: 'Hot Pilates', instructor: 'Mike', bookings: 14, maxCapacity: 15, bookedBy: [] },
  { id: 'mon-6pm', day: 'Monday', time: '6:00 PM', type: 'Hot Yoga', instructor: 'Emma', bookings: 18, maxCapacity: 20, bookedBy: [] },
  
  // Tuesday
  { id: 'tue-530', day: 'Tuesday', time: '5:30 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 7, maxCapacity: 15, bookedBy: [] },
  { id: 'tue-6', day: 'Tuesday', time: '6:00 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 11, maxCapacity: 20, bookedBy: [] },
  { id: 'tue-8', day: 'Tuesday', time: '8:00 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 9, maxCapacity: 15, bookedBy: [] },
  { id: 'tue-930', day: 'Tuesday', time: '9:30 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 13, maxCapacity: 20, bookedBy: [] },
  { id: 'tue-11', day: 'Tuesday', time: '11:00 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 8, maxCapacity: 15, bookedBy: [] },
  { id: 'tue-430', day: 'Tuesday', time: '4:30 PM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 16, maxCapacity: 20, bookedBy: [] },
  { id: 'tue-630', day: 'Tuesday', time: '6:30 PM', type: 'Hot Pilates', instructor: 'Mike', bookings: 12, maxCapacity: 15, bookedBy: [] },
  
  // Wednesday
  { id: 'wed-530', day: 'Wednesday', time: '5:30 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 9, maxCapacity: 20, bookedBy: [] },
  { id: 'wed-6', day: 'Wednesday', time: '6:00 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 10, maxCapacity: 15, bookedBy: [] },
  { id: 'wed-8', day: 'Wednesday', time: '8:00 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 14, maxCapacity: 20, bookedBy: [] },
  { id: 'wed-930', day: 'Wednesday', time: '9:30 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 7, maxCapacity: 15, bookedBy: [] },
  { id: 'wed-11', day: 'Wednesday', time: '11:00 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 11, maxCapacity: 20, bookedBy: [] },
  { id: 'wed-4', day: 'Wednesday', time: '4:00 PM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 13, maxCapacity: 15, bookedBy: [] },
  { id: 'wed-6pm', day: 'Wednesday', time: '6:00 PM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 17, maxCapacity: 20, bookedBy: [] },
  
  // Thursday
  { id: 'thu-530', day: 'Thursday', time: '5:30 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 8, maxCapacity: 15, bookedBy: [] },
  { id: 'thu-6', day: 'Thursday', time: '6:00 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 12, maxCapacity: 20, bookedBy: [] },
  { id: 'thu-8', day: 'Thursday', time: '8:00 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 6, maxCapacity: 15, bookedBy: [] },
  { id: 'thu-930', day: 'Thursday', time: '9:30 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 15, maxCapacity: 20, bookedBy: [] },
  { id: 'thu-11', day: 'Thursday', time: '11:00 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 9, maxCapacity: 15, bookedBy: [] },
  { id: 'thu-430', day: 'Thursday', time: '4:30 PM', type: 'Hot Yoga', instructor: 'Emma', bookings: 14, maxCapacity: 20, bookedBy: [] },
  { id: 'thu-630', day: 'Thursday', time: '6:30 PM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 11, maxCapacity: 15, bookedBy: [] },
  
  // Friday
  { id: 'fri-530', day: 'Friday', time: '5:30 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 10, maxCapacity: 20, bookedBy: [] },
  { id: 'fri-6', day: 'Friday', time: '6:00 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 13, maxCapacity: 15, bookedBy: [] },
  { id: 'fri-8', day: 'Friday', time: '8:00 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 16, maxCapacity: 20, bookedBy: [] },
  { id: 'fri-930', day: 'Friday', time: '9:30 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 8, maxCapacity: 15, bookedBy: [] },
  { id: 'fri-11', day: 'Friday', time: '11:00 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 12, maxCapacity: 20, bookedBy: [] },
  { id: 'fri-4', day: 'Friday', time: '4:00 PM', type: 'Hot Pilates', instructor: 'Mike', bookings: 15, maxCapacity: 15, bookedBy: [] },
  { id: 'fri-6pm', day: 'Friday', time: '6:00 PM', type: 'Hot Yoga', instructor: 'Emma', bookings: 19, maxCapacity: 20, bookedBy: [] },
  
  // Saturday
  { id: 'sat-8', day: 'Saturday', time: '8:00 AM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 14, maxCapacity: 20, bookedBy: [] },
  { id: 'sat-930', day: 'Saturday', time: '9:30 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 12, maxCapacity: 15, bookedBy: [] },
  { id: 'sat-11', day: 'Saturday', time: '11:00 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 16, maxCapacity: 20, bookedBy: [] },
  { id: 'sat-1230', day: 'Saturday', time: '12:30 PM', type: 'Hot Pilates', instructor: 'Mike', bookings: 10, maxCapacity: 15, bookedBy: [] },
  { id: 'sat-4', day: 'Saturday', time: '4:00 PM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 13, maxCapacity: 20, bookedBy: [] },
  
  // Sunday
  { id: 'sun-8', day: 'Sunday', time: '8:00 AM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 9, maxCapacity: 15, bookedBy: [] },
  { id: 'sun-930', day: 'Sunday', time: '9:30 AM', type: 'Hot Yoga', instructor: 'Emma', bookings: 15, maxCapacity: 20, bookedBy: [] },
  { id: 'sun-11', day: 'Sunday', time: '11:00 AM', type: 'Hot Pilates', instructor: 'Mike', bookings: 11, maxCapacity: 15, bookedBy: [] },
  { id: 'sun-1230', day: 'Sunday', time: '12:30 PM', type: 'Hot Yoga', instructor: 'Sarah', bookings: 17, maxCapacity: 20, bookedBy: [] },
  { id: 'sun-4', day: 'Sunday', time: '4:00 PM', type: 'Hot Pilates', instructor: 'Lisa', bookings: 8, maxCapacity: 15, bookedBy: [] },
];

const [BookingsProvider, useBookingsContext] = createContextHook(() => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<ClassSlot[]>(MOCK_CLASSES);
  const { session } = useAuth();
  const user = session?.user;

  const loadBookings = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('📅 Loading bookings for user:', user.id);
      
      // Load upcoming bookings from the database
      const upcomingClasses = await getUpcomingBookedClasses(user.id);
      console.log('📊 Loaded upcoming classes:', upcomingClasses.length);
      
      // Convert to the format expected by the UI
      const convertedBookings: Booking[] = upcomingClasses.map(uc => ({
        id: uc.booking_id.toString(),
        userId: user.id,
        classId: uc.class_id.toString(),
        date: uc.date,
        time: uc.start_time,
        classType: uc.title,
        instructor: uc.instructor || 'TBD',
        status: 'booked' as const,
      }));
      
      setBookings(convertedBookings);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, loadBookings]);

  const bookClass = useCallback(async (classSlot: ClassSlot): Promise<{ success: boolean; message: string; newBalance?: number }> => {
    if (!user) {
      return { success: false, message: 'Please log in to book classes' };
    }

    try {
      console.log('🎯 Booking class:', classSlot.id, 'for user:', user.id);
      
      // Convert string ID to number for the database
      const classIdNum = parseInt(classSlot.id.replace(/[^0-9]/g, '')) || 1;
      
      // Use the new RPC function that handles everything atomically
      const result = await apiBookClass(classIdNum);
      console.log('✅ Booking result:', result);
      
      // Update local state to reflect the booking
      const updatedClasses = classes.map(c => 
        c.id === classSlot.id ? { 
          ...c, 
          bookings: c.bookings + 1,
          bookedBy: [...(c.bookedBy || []), user.id]
        } : c
      );
      setClasses(updatedClasses);
      
      // Refresh bookings from database
      await loadBookings();
      
      return { 
        success: true, 
        message: `Class booked! ${result.newBalance} credits remaining.`,
        newBalance: result.newBalance
      };
    } catch (error: any) {
      console.error('❌ Booking error:', error);
      const message = error?.message || 'Failed to book class. Please try again.';
      return { success: false, message };
    }
  }, [user, classes, loadBookings]);

  const cancelBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      console.log('🚫 Cancelling booking:', bookingId);
      
      // Use the new RPC function that handles credit refunds
      await apiCancelBooking(bookingId);
      
      // Refresh bookings from database
      await loadBookings();
      
      console.log('✅ Booking cancelled successfully');
      return true;
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      return false;
    }
  }, [loadBookings]);

  const getUserBookings = useCallback((): Booking[] => {
    if (!user) return [];
    return bookings.filter(b => b.userId === user.id && b.status === 'booked');
  }, [user, bookings]);

  const getUpcomingBookings = useCallback((): Booking[] => {
    const userBookings = getUserBookings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return userBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    });
  }, [getUserBookings]);

  return useMemo(() => ({
    classes,
    bookings,
    bookClass,
    cancelBooking,
    getUserBookings,
    getUpcomingBookings,
  }), [classes, bookings, bookClass, cancelBooking, getUserBookings, getUpcomingBookings]);
});

export { BookingsProvider };

export function useBookings() {
  const context = useBookingsContext();
  
  // Return safe defaults if provider hasn't mounted yet
  return context ?? {
    classes: MOCK_CLASSES,
    bookings: [],
    bookClass: async () => ({ success: false, message: 'Service not available' }),
    cancelBooking: async () => false,
    getUserBookings: () => [],
    getUpcomingBookings: () => [],
  };
}