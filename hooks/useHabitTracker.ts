import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { AttendanceRecord } from '@/types';
import { useAuth } from './useAuth';

const [HabitTrackerProvider, useHabitTrackerContext] = createContextHook(() => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const { session } = useAuth();
  const user = session?.user;

  useEffect(() => {
    if (user) {
      loadAttendance();
    }
  }, [user]);

  const loadAttendance = async () => {
    if (!user) return;
    
    try {
      const attendanceData = await AsyncStorage.getItem(`attendance_${user.id}`);
      if (attendanceData) {
        setAttendance(JSON.parse(attendanceData));
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const saveAttendance = async (newAttendance: AttendanceRecord[]) => {
    if (!user) return;
    
    try {
      await AsyncStorage.setItem(`attendance_${user.id}`, JSON.stringify(newAttendance));
      setAttendance(newAttendance);
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  };

  const markAttendance = async (date: string = new Date().toISOString().split('T')[0], classType?: string) => {
    const existingIndex = attendance.findIndex(a => a.date === date);
    
    let updatedAttendance: AttendanceRecord[];
    
    if (existingIndex >= 0) {
      updatedAttendance = attendance.map((record, index) => 
        index === existingIndex 
          ? { ...record, attended: true, classType }
          : record
      );
    } else {
      const newRecord: AttendanceRecord = {
        date,
        attended: true,
        classType,
      };
      updatedAttendance = [...attendance, newRecord];
    }
    
    await saveAttendance(updatedAttendance);
  };

  const getAttendanceForMonth = (year: number, month: number): AttendanceRecord[] => {
    return attendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });
  };

  const getAttendanceStreak = (): number => {
    if (attendance.length === 0) return 0;
    
    const sortedAttendance = attendance
      .filter(a => a.attended)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const record of sortedAttendance) {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      
      const diffTime = currentDate.getTime() - recordDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak || (streak === 0 && diffDays <= 1)) {
        streak++;
        currentDate = recordDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getTotalAttendance = (): number => {
    return attendance.filter(a => a.attended).length;
  };

  return {
    attendance,
    markAttendance,
    getAttendanceForMonth,
    getAttendanceStreak,
    getTotalAttendance,
  };
});

export { HabitTrackerProvider };

export function useHabitTracker() {
  const context = useHabitTrackerContext();
  
  // Return safe defaults if provider hasn't mounted yet
  return context ?? {
    attendance: [],
    markAttendance: async () => {},
    getAttendanceForMonth: () => [],
    getAttendanceStreak: () => 0,
    getTotalAttendance: () => 0,
  };
}