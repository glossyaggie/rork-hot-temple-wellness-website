import { Stack, router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { BookingsProvider } from '../hooks/useBookings';
import { HabitTrackerProvider } from '../hooks/useHabitTracker';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Navigate based on auth state
  useEffect(() => {
    if (!loading && !hasNavigated) {
      console.log('🔄 RootLayout navigation - Session:', session ? 'Present' : 'None');
      
      if (!session) {
        console.log('➡️ Navigating to welcome screen');
        router.replace('/(auth)/welcome');
      } else {
        console.log('➡️ Navigating to tabs');
        router.replace('/(tabs)');
      }
      
      setHasNavigated(true);
    }
  }, [session, loading, hasNavigated]);

  // Reset navigation flag when auth state changes
  useEffect(() => {
    setHasNavigated(false);
  }, [session]);

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent:'center', alignItems:'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', marginBottom: 16, fontSize: 40 }}>🔥</Text>
        <ActivityIndicator color="#ff6b35" size="large" />
        <Text style={{ color: '#999', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <BookingsProvider>
      <HabitTrackerProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </HabitTrackerProvider>
    </BookingsProvider>
  );
}