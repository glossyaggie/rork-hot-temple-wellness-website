import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { Booking, ClassSlot } from '@/types';
import { useAuth } from './useAuth';

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

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const bookingsData = await AsyncStorage.getItem('bookings');
      if (bookingsData) {
        setBookings(JSON.parse(bookingsData));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const saveBookings = async (newBookings: Booking[]) => {
    try {
      await AsyncStorage.setItem('bookings', JSON.stringify(newBookings));
      setBookings(newBookings);
    } catch (error) {
      console.error('Error saving bookings:', error);
    }
  };

  const bookClass = async (classSlot: ClassSlot): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Please log in to book classes' };
    }

    // Check if class is full
    if (classSlot.bookings >= classSlot.maxCapacity) {
      return { success: false, message: 'This class is full' };
    }

    // Check if user already booked this class today
    const today = new Date().toDateString();
    const existingBooking = bookings.find(
      b => b.userId === user.id && 
           b.classId === classSlot.id && 
           new Date(b.date).toDateString() === today
    );

    if (existingBooking) {
      return { success: false, message: 'You have already booked this class today' };
    }

    // For now, allow booking without credit check
    // TODO: Implement proper credit system with Supabase

    // Create booking
    const newBooking: Booking = {
      id: Date.now().toString(),
      userId: user.id,
      classId: classSlot.id,
      date: new Date().toISOString(),
      time: classSlot.time,
      classType: classSlot.type,
      instructor: classSlot.instructor,
      status: 'booked',
    };

    const updatedBookings = [...bookings, newBooking];
    await saveBookings(updatedBookings);

    // Update class booking count and add user to bookedBy list
    const updatedClasses = classes.map(c => 
      c.id === classSlot.id ? { 
        ...c, 
        bookings: c.bookings + 1,
        bookedBy: [...(c.bookedBy || []), user.id]
      } : c
    );
    setClasses(updatedClasses);

    return { success: true, message: 'Class booked successfully!' };
  };

  const cancelBooking = async (bookingId: string): Promise<boolean> => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return false;

      // Remove booking
      const updatedBookings = bookings.filter(b => b.id !== bookingId);
      await saveBookings(updatedBookings);

      // Update class booking count and remove user from bookedBy list
      const updatedClasses = classes.map(c => 
        c.id === booking.classId ? { 
          ...c, 
          bookings: Math.max(0, c.bookings - 1),
          bookedBy: (c.bookedBy || []).filter(id => id !== booking.userId)
        } : c
      );
      setClasses(updatedClasses);

      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return false;
    }
  };

  const getUserBookings = (): Booking[] => {
    if (!user) return [];
    return bookings.filter(b => b.userId === user.id && b.status === 'booked');
  };

  const getUpcomingBookings = (): Booking[] => {
    const userBookings = getUserBookings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return userBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    });
  };

  return {
    classes,
    bookings,
    bookClass,
    cancelBooking,
    getUserBookings,
    getUpcomingBookings,
  };
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