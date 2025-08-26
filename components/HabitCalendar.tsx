import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { theme } from '@/constants/theme';
import { useHabitTracker } from '@/hooks/useHabitTracker';

interface HabitCalendarProps {
  year: number;
  month: number;
  monthName: string;
  color: string;
}

export default function HabitCalendar({ year, month, monthName, color }: HabitCalendarProps) {
  const { getAttendanceForMonth, markAttendance } = useHabitTracker();
  const attendance = getAttendanceForMonth(year, month);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isAttended = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.some(a => a.date === dateStr && a.attended);
  };

  const handleDayPress = async (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await markAttendance(dateStr);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const attended = isAttended(day);
    days.push(
      <TouchableOpacity
        key={day}
        style={[
          styles.day,
          attended && { backgroundColor: color },
        ]}
        onPress={() => handleDayPress(day)}
      >
        <Text style={[
          styles.dayText,
          attended && styles.attendedDayText,
        ]}>
          {day}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ImageBackground 
      source={{ uri: 'https://r2-pub.rork.com/generated-images/d4d2b256-a35d-4ffc-94fa-b19a6f4dd7d9.png' }}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <Text style={styles.monthName}>{monthName}</Text>
        <View style={styles.weekDays}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.weekDay}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendar}>
          {days}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.sm,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  backgroundImage: {
    borderRadius: theme.borderRadius.md,
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: theme.spacing.md,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.xs,
  },
  weekDay: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: '500',
    width: 24,
    textAlign: 'center',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyDay: {
    width: 24,
    height: 24,
    margin: 1,
  },
  day: {
    width: 24,
    height: 24,
    margin: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  attendedDayText: {
    color: 'white',
    fontWeight: '600',
  },
});