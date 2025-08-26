import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { Clock, Users, Flame, ChevronDown } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useBookings } from '@/hooks/useBookings';
import AuthModal from '@/components/AuthModal';
import PassPurchaseModal from '@/components/PassPurchaseModal';
import NotificationBanner from '@/components/NotificationBanner';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ScheduleScreen() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedFilters, setSelectedFilters] = useState({
    classes: 'All',
    instructors: 'All'
  });
  const [showClassFilter, setShowClassFilter] = useState(false);
  const [showInstructorFilter, setShowInstructorFilter] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  const { user, hasValidPass } = useAuth();
  const { classes, bookClass } = useBookings();

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleBookClass = async (classSlot: any) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const result = await bookClass(classSlot);
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      if (result.message.includes('credits')) {
        showNotification(result.message, 'error');
        setTimeout(() => setShowPassModal(true), 1000);
      } else {
        showNotification(result.message, 'error');
      }
    }
  };

  const generateWeekDates = () => {
    const dates = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = generateWeekDates();

  const getClassesForSelectedDate = () => {
    const dayName = FULL_DAYS[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1];
    let filteredClasses = classes.filter(c => c.day === dayName);
    
    // Apply class type filter
    if (selectedFilters.classes !== 'All') {
      filteredClasses = filteredClasses.filter(c => c.type === selectedFilters.classes);
    }
    
    // Apply instructor filter
    if (selectedFilters.instructors !== 'All') {
      filteredClasses = filteredClasses.filter(c => c.instructor === selectedFilters.instructors);
    }
    
    return filteredClasses.sort((a, b) => {
      const timeA = new Date(`1970/01/01 ${a.time}`).getTime();
      const timeB = new Date(`1970/01/01 ${b.time}`).getTime();
      return timeA - timeB;
    });
  };
  
  const getUniqueClassTypes = () => {
    const types = [...new Set(classes.map(c => c.type))];
    return ['All', ...types];
  };
  
  const getUniqueInstructors = () => {
    const instructors = [...new Set(classes.map(c => c.instructor))];
    return ['All', ...instructors];
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderDateItem = ({ item: date }: { item: Date }) => {
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const todayDate = isToday(date);
    
    return (
      <TouchableOpacity
        style={[
          styles.dateItem,
          isSelected && styles.selectedDateItem,
          todayDate && !isSelected && styles.todayDateItem
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={[
          styles.dayText,
          isSelected && styles.selectedDayText,
          todayDate && !isSelected && styles.todayDayText
        ]}>
          {DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
        </Text>
        <Text style={[
          styles.dateText,
          isSelected && styles.selectedDateText,
          todayDate && !isSelected && styles.todayDateText
        ]}>
          {date.getDate()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderClassSlot = (classSlot: any) => {
    const isAlmostFull = classSlot.bookings >= classSlot.maxCapacity * 0.8;
    const isFull = classSlot.bookings >= classSlot.maxCapacity;
    const isBooked = user && classSlot.bookedBy?.includes(user.id);

    return (
      <TouchableOpacity
        key={classSlot.id}
        style={[
          styles.classSlot,
          isFull && styles.fullClassSlot,
          isBooked && styles.bookedClassSlot,
        ]}
        onPress={() => handleBookClass(classSlot)}
        disabled={isFull && !isBooked}
      >
        <View style={styles.classRow}>
          <View style={styles.classTimeSection}>
            <Text style={styles.classTime}>{classSlot.time}</Text>
            <Text style={styles.classDuration}>50 min</Text>
          </View>
          
          <View style={styles.classDetails}>
            <Text style={styles.classLevel}>{classSlot.type}</Text>
            <Text style={styles.classInstructor}>{classSlot.instructor}</Text>
          </View>
          
          <View style={styles.classStatus}>
            {isBooked ? (
              <Text style={styles.completedText}>Booked</Text>
            ) : isFull ? (
              <Text style={styles.fullStatusText}>Full</Text>
            ) : (
              <Text style={styles.availableText}>Book</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterDropdown = (label: string, options: string[], selectedValue: string, onSelect: (value: string) => void, isOpen: boolean, onToggle: () => void) => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={onToggle}
      >
        <Text style={styles.filterButtonText}>{selectedValue === 'All' ? label : selectedValue}</Text>
        <ChevronDown size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.filterDropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterOption,
                selectedValue === option && styles.selectedFilterOption
              ]}
              onPress={() => {
                onSelect(option);
                onToggle();
              }}
            >
              <Text style={[
                styles.filterOptionText,
                selectedValue === option && styles.selectedFilterOptionText
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Date Slider */}
      <View style={styles.dateSliderContainer}>
        <FlatList
          data={weekDates}
          renderItem={renderDateItem}
          keyExtractor={(item) => item.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateSlider}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filtersContainer}>
        {renderFilterDropdown(
          'Classes', 
          getUniqueClassTypes(), 
          selectedFilters.classes,
          (value) => setSelectedFilters(prev => ({ ...prev, classes: value })),
          showClassFilter,
          () => {
            setShowClassFilter(!showClassFilter);
            setShowInstructorFilter(false);
          }
        )}
        {renderFilterDropdown(
          'Instructors', 
          getUniqueInstructors(), 
          selectedFilters.instructors,
          (value) => setSelectedFilters(prev => ({ ...prev, instructors: value })),
          showInstructorFilter,
          () => {
            setShowInstructorFilter(!showInstructorFilter);
            setShowClassFilter(false);
          }
        )}
      </View>

      {/* Selected Date Header */}
      <View style={styles.selectedDateHeader}>
        <Text style={styles.selectedDateText}>{formatDateForDisplay(selectedDate)}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Classes for Selected Date */}
        <View style={styles.classesContainer}>
          {getClassesForSelectedDate().map(renderClassSlot)}
        </View>

        {getClassesForSelectedDate().length === 0 && (
          <View style={styles.noClassesContainer}>
            <Text style={styles.noClassesText}>No classes scheduled for this day</Text>
          </View>
        )}

        {!user && (
          <View style={styles.loginPrompt}>
            <Text style={styles.promptTitle}>Ready to Start?</Text>
            <Text style={styles.promptText}>
              Sign up to book classes and track your progress
            </Text>
            <TouchableOpacity
              style={styles.promptButton}
              onPress={() => setShowAuthModal(true)}
            >
              <Text style={styles.promptButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && !hasValidPass() && (
          <View style={styles.passPrompt}>
            <Text style={styles.promptTitle}>Need Credits?</Text>
            <Text style={styles.promptText}>
              Purchase a pass to start booking classes
            </Text>
            <TouchableOpacity
              style={styles.promptButton}
              onPress={() => setShowPassModal(true)}
            >
              <Text style={styles.promptButtonText}>Buy Pass</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => showNotification('Welcome! You can now book classes.', 'success')}
      />

      <PassPurchaseModal
        visible={showPassModal}
        onClose={() => setShowPassModal(false)}
        onSuccess={(message) => showNotification(message, 'success')}
      />

      <NotificationBanner
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  dateSliderContainer: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dateSlider: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    minWidth: 60,
  },
  selectedDateItem: {
    backgroundColor: theme.colors.primary,
  },
  todayDateItem: {
    backgroundColor: theme.colors.coral,
  },
  dayText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectedDayText: {
    color: 'white',
  },
  todayDayText: {
    color: 'white',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  selectedDateText: {
    color: 'white',
  },
  todayDateText: {
    color: 'white',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    position: 'relative',
    zIndex: 1000,
  },
  filterContainer: {
    position: 'relative',
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1001,
    ...theme.shadows.md,
  },
  filterOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedFilterOption: {
    backgroundColor: theme.colors.primary + '20',
  },
  filterOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedFilterOptionText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  selectedDateHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  classesContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  classSlot: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fullClassSlot: {
    opacity: 0.6,
  },
  bookedClassSlot: {
    borderColor: theme.colors.success,
    backgroundColor: '#f0f9f0',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classTimeSection: {
    alignItems: 'flex-start',
    minWidth: 80,
  },
  classTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  classDuration: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  classDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  classLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  classInstructor: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  classStatus: {
    alignItems: 'flex-end',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  fullStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  availableText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  noClassesContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  noClassesText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  loginPrompt: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passPrompt: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  promptText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  promptButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  promptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});