import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';
import { BookingsProvider } from '../hooks/useBookings';
import { HabitTrackerProvider } from '../hooks/useHabitTracker';
import { NotificationProvider } from '../hooks/useNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    console.log('⏳ Root loading screen render');
    return (
      <View style={{ flex: 1, justifyContent:'center', alignItems:'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', marginBottom: 16, fontSize: 40 }}>⚡️</Text>
        <ActivityIndicator color="#ff6b35" size="large" />
        <Text style={{ color: '#999', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <BookingsProvider>
          <HabitTrackerProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth/callback" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack>
            {!session ? (
              <Redirect href="/(auth)/welcome" />
            ) : (
              <Redirect href="/(tabs)" />
            )}
          </HabitTrackerProvider>
        </BookingsProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}