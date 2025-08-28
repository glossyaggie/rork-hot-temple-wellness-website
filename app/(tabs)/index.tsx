import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ImageBackground,
} from 'react-native';
import { User, Calendar, CreditCard, LogOut, Target, Flame, QrCode, Award, Gift, ChevronDown, Eye, RefreshCcw } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useHabitTracker } from '@/hooks/useHabitTracker';

import PassPurchaseModal from '@/components/PassPurchaseModal';
import HabitCalendar from '@/components/HabitCalendar';
import MyPassesCard from '@/components/MyPassesCard';
import NotificationBanner from '@/components/NotificationBanner';
import QRCodeScanner from '@/components/QRCodeScanner';
import { router, useFocusEffect } from 'expo-router';
import { getUpcomingBookedClasses, type UpcomingClassBooking } from '@/utils/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3',
  '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43', '#ee5a24', '#0abde3'
];

type ViewPeriod = 'current' | 'three-months' | 'yearly';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountScreen() {

  const [showPassModal, setShowPassModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('current');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  const { session, role, logout } = useAuth();
  const user = session?.user;
  const { markAttendance, getAttendanceStreak, getTotalAttendance } = useHabitTracker();

  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingClassBooking[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState<boolean>(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const loadUpcoming = async () => {
    if (!user?.id) return;
    try {
      setUpcomingLoading(true);
      setUpcomingError(null);
      const items = await getUpcomingBookedClasses(user.id);
      setUpcomingBookings(items);
    } catch (e: any) {
      setUpcomingError(e?.message ?? 'Failed to load');
    } finally {
      setUpcomingLoading(false);
    }
  };

  useEffect(() => { loadUpcoming(); }, [user?.id]);
  useFocusEffect(
    useCallback(() => {
      console.log('🔁 AccountScreen focus: reload upcoming');
      loadUpcoming();
      return () => {};
    }, [user?.id])
  );
  const currentStreak = getAttendanceStreak();
  const totalClasses = getTotalAttendance();

  const milestones = [
    { id: 1, classes: 5, title: '5 CLASS\nREWARD', subtitle: 'FIRST 5 CLASSES', achieved: totalClasses >= 5, color: '#4ECDC4' },
    { id: 2, classes: 50, title: '50 CLASS\nREWARD', subtitle: '50 CLASSES', achieved: totalClasses >= 50, color: '#4ECDC4' },
    { id: 3, classes: 100, title: '100 CLASS\nREWARD', subtitle: '100 CLASSES', achieved: totalClasses >= 100, color: '#4ECDC4' },
    { id: 4, classes: 250, title: '250 CLASS\nREWARD', subtitle: '250 CLASSES', achieved: totalClasses >= 250, color: '#4ECDC4' },
  ];

  const renderMilestone = ({ item }: { item: typeof milestones[0] }) => (
    <ImageBackground
      source={{ 
        uri: item.achieved 
          ? 'https://r2-pub.rork.com/generated-images/a0626fd4-58d2-4322-9ec9-249f7a056c5b.png'
          : 'https://r2-pub.rork.com/generated-images/a0626fd4-58d2-4322-9ec9-249f7a056c5b.png'
      }}
      style={[
        styles.milestoneCard,
        { backgroundColor: item.achieved ? item.color : 'transparent' }
      ]}
      imageStyle={styles.milestoneCardImage}
    >
      <View style={[
        styles.milestoneCardOverlay,
        { backgroundColor: item.achieved ? 'rgba(78, 205, 196, 0.8)' : 'rgba(0, 0, 0, 0.3)' }
      ]}>
        <View style={styles.milestoneIcon}>
          <Award size={20} color="white" />
        </View>
        <Text style={[
          styles.milestoneTitle,
          { color: 'white' }
        ]}>
          {item.title}
        </Text>
        <Text style={[
          styles.milestoneSubtitle,
          { color: 'white' }
        ]}>
          {item.subtitle}
        </Text>
      </View>
    </ImageBackground>
  );

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleLogout = async () => {
    console.log('🔒 Logging out...');
    const ok = await logout();
    if (ok) {
      showNotification('Signed out successfully', 'info');
      router.replace('/(auth)/welcome');
    } else {
      showNotification('Could not sign out. Please try again.', 'error');
    }
  };

  const handleMarkAttendance = async () => {
    await markAttendance();
    showNotification('Attendance marked for today!', 'success');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPassStatusText = () => {
    if (!user) return '';
    if (role === 'admin' || role === 'instructor') {
      return 'Staff Access';
    }
    return '';
  };

  // Debug: Log user state
  console.log('🔍 AccountScreen - Session:', session);
  console.log('🔍 AccountScreen - User role:', role);
  
  const insets = useSafeAreaInsets();
  
  // User is guaranteed to be authenticated at this point due to root layout
  if (!user) {
    console.log('❌ No user found in AccountScreen');
    return (
      <View style={styles.container}>
        <View style={styles.loginPrompt}>
          <Text style={styles.promptTitle}>Loading...</Text>
          <Text style={styles.promptText}>Please wait while we load your account</Text>
        </View>
      </View>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const getMonthsToShow = () => {
    const months = [];
    
    if (viewPeriod === 'current') {
      months.push({
        year: currentYear,
        month: currentMonth,
        name: MONTHS[currentMonth]
      });
    } else if (viewPeriod === 'three-months') {
      for (let i = 2; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        months.push({
          year,
          month,
          name: MONTHS[month]
        });
      }
    } else {
      // yearly - show all 12 months
      for (let i = 0; i < 12; i++) {
        months.push({
          year: currentYear,
          month: i,
          name: MONTHS[i]
        });
      }
    }
    
    return months;
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { paddingTop: insets.top + 8 }] }>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <User size={32} color="white" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.user_metadata?.full_name || user?.email}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} testID="logoutButton" accessibilityRole="button" accessibilityLabel="Sign out">
              <LogOut size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {getPassStatusText() ? (
            <View style={styles.passInfo}>
              <CreditCard size={20} color={theme.colors.primary} />
              <Text style={styles.passText}>{getPassStatusText()}</Text>
              {role === 'admin' && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>ADMIN</Text>
                </View>
              )}
              {role === 'instructor' && (
                <View style={[styles.vipBadge, { backgroundColor: '#4ECDC4' }]}>
                  <Text style={styles.vipBadgeText}>STAFF</Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.buyPassButton}
              onPress={() => setShowPassModal(true)}
            >
              <Text style={styles.buyPassButtonText}>Purchase Pass</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.viewScheduleButton}
              onPress={() => router.push('/schedule')}
            >
              <Eye size={18} color="white" />
              <Text style={styles.viewScheduleButtonText}>View Schedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => setShowQRScanner(true)}
            >
              <QrCode size={18} color="white" />
              <Text style={styles.qrButtonText}>Check In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <MyPassesCard />

        {/* Upcoming Bookings */}
        <View style={styles.bookingsSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Your Upcoming Classes</Text>
            <TouchableOpacity onPress={loadUpcoming} disabled={upcomingLoading} style={styles.refreshBtn} testID="refresh-upcoming">
              <RefreshCcw size={16} color={upcomingLoading ? theme.colors.textLight : theme.colors.primary} />
              <Text style={[styles.refreshText, { color: upcomingLoading ? theme.colors.textLight : theme.colors.primary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {upcomingLoading ? (
            <Text style={styles.noBookingsText}>Loading…</Text>
          ) : upcomingError ? (
            <Text style={[styles.noBookingsText, { color: theme.colors.error }]}>{upcomingError}</Text>
          ) : upcomingBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {upcomingBookings.slice(0, 3).map((booking) => (
                <View key={booking.booking_id} style={styles.bookingCard}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingDate}>{formatDate(booking.date)}</Text>
                    <Text style={styles.bookingTime}>{booking.start_time} - {booking.end_time}</Text>
                  </View>
                  <Text style={styles.bookingType}>{booking.title}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noBookingsText}>
              No upcoming bookings. Book a class to get started!
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.sectionTitle}>Stats</Text>
            <TouchableOpacity>
              <Text style={styles.seeMoreText}>See more</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalClasses}</Text>
              <Text style={styles.statLabel}>Lifetime</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Last 30 days</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Weekly streak</Text>
            </View>
          </View>
        </View>

        {/* Milestones */}
        <ImageBackground
          source={{ uri: 'https://r2-pub.rork.com/generated-images/4682227e-1331-4758-92f3-efb634d87aa9.png' }}
          style={styles.milestonesSection}
          imageStyle={styles.milestonesBackground}
        >
          <View style={styles.milestonesOverlay}>
            <Text style={[styles.sectionTitle, styles.milestoneSectionTitle]}>Milestones</Text>
            <FlatList
              data={milestones}
              renderItem={renderMilestone}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.milestonesList}
            />
            
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.referButton}>
                <Text style={styles.referButtonText}>🎯 Refer a friend</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.giftButton}>
                <Gift size={16} color={theme.colors.primary} />
                <Text style={styles.giftButtonText}>Buy gift card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* Mark Attendance */}
        <View style={styles.attendanceSection}>
          <TouchableOpacity
            style={styles.markAttendanceButton}
            onPress={handleMarkAttendance}
          >
            <Calendar size={20} color="white" />
            <Text style={styles.markAttendanceText}>Mark Attendance Today</Text>
          </TouchableOpacity>
        </View>

        {/* Habit Tracker */}
        <View style={styles.habitSection}>
          <View style={styles.habitHeader}>
            <Text style={styles.sectionTitle}>Habit Tracker</Text>
            <View style={styles.periodSelector}>
              <TouchableOpacity 
                style={styles.periodButton}
                onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
              >
                <Text style={styles.periodButtonText}>
                  {viewPeriod === 'current' ? 'Current Month' : 
                   viewPeriod === 'three-months' ? '3 Months' : 'Yearly'}
                </Text>
                <ChevronDown size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              
              {showPeriodDropdown && (
                <View style={styles.dropdown}>
                  <TouchableOpacity 
                    style={[styles.dropdownItem, viewPeriod === 'current' && styles.dropdownItemActive]}
                    onPress={() => {
                      setViewPeriod('current');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, viewPeriod === 'current' && styles.dropdownTextActive]}>Current Month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dropdownItem, viewPeriod === 'three-months' && styles.dropdownItemActive]}
                    onPress={() => {
                      setViewPeriod('three-months');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, viewPeriod === 'three-months' && styles.dropdownTextActive]}>3 Months</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dropdownItem, viewPeriod === 'yearly' && styles.dropdownItemActive]}
                    onPress={() => {
                      setViewPeriod('yearly');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, viewPeriod === 'yearly' && styles.dropdownTextActive]}>Yearly</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.habitDescription}>
            Track your consistency and build healthy habits
          </Text>
          
          <View style={styles.calendarsGrid}>
            {getMonthsToShow().map((monthData) => (
              <HabitCalendar
                key={`${monthData.year}-${monthData.month}`}
                year={monthData.year}
                month={monthData.month}
                monthName={monthData.name}
                color={MONTH_COLORS[monthData.month]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <PassPurchaseModal
        visible={showPassModal}
        onClose={() => setShowPassModal(false)}
        onSuccess={(message) => showNotification(message, 'success')}
      />

      <QRCodeScanner
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={(message) => showNotification(message, 'success')}
        onError={(message) => showNotification(message, 'error')}
      />

      <NotificationBanner
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
    </SafeAreaView>
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
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing.lg,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  authButtonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  signInPromptButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  signInPromptButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  signUpPromptButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
  },
  signUpPromptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  logoutButton: {
    padding: theme.spacing.sm,
  },
  passInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    flexWrap: 'wrap',
  },
  passText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  buyPassButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  buyPassButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  viewScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    height: 48,
  },
  viewScheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    height: 48,
  },
  qrButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  vipBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: theme.spacing.sm,
  },
  vipBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  milestonesSection: {
    minHeight: 280,
  },
  milestonesBackground: {
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.lg,
  },
  milestonesOverlay: {
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.lg,
  },
  milestoneSectionTitle: {
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  milestonesList: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  milestoneCard: {
    width: 120,
    height: 140,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  milestoneCardImage: {
    borderRadius: theme.borderRadius.lg,
  },
  milestoneCardOverlay: {
    flex: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: theme.spacing.xs,
  },
  milestoneSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  referButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  referButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  giftButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  giftButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  attendanceSection: {
    padding: theme.spacing.lg,
  },
  markAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  markAttendanceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bookingsSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  bookingsList: {
    gap: theme.spacing.md,
  },
  bookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  bookingTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  noBookingsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  refreshText: { fontSize: 12, fontWeight: '600' },
  habitSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  periodSelector: {
    position: 'relative',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  periodButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
    zIndex: 1000,
    minWidth: 140,
  },
  dropdownItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  dropdownText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  dropdownTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  habitDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  calendarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});