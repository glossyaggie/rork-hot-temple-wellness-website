import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import { BookingsProvider } from '../hooks/useBookings';
import { HabitTrackerProvider } from '../hooks/useHabitTracker';
import { NotificationProvider } from '../hooks/useNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '@/components/ErrorBoundary';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { confirmPayment } from '@/utils/api';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const [confirming, setConfirming] = useState<boolean>(false);

  useEffect(() => {
    let handled = false;
    const tryConfirmFromUrl = async (urlStr: string | null) => {
      if (handled || !urlStr) return;
      try {
        const u = new URL(urlStr);
        const sid = u.searchParams.get('session_id');
        if (sid) {
          handled = true;
          setConfirming(true);
          const res = await confirmPayment(sid);
          setConfirming(false);
          if (res.ok) {
            Alert.alert('Purchase confirmed', 'Your pass has been applied.');
          }
        }
      } catch {}
    };

    Linking.getInitialURL().then((initial) => {
      if (initial) tryConfirmFromUrl(initial);
      // Also check web current location
      if (typeof window !== 'undefined' && window.location?.href) {
        tryConfirmFromUrl(window.location.href);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => tryConfirmFromUrl(url));
    return () => {
      // remove listener if available
      // @ts-ignore
      if (typeof sub.remove === 'function') sub.remove();
    };
  }, []);

  if (loading) {
    console.log('⏳ Root loading screen render');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', marginBottom: 16, fontSize: 40 }}>⚡️</Text>
        <ActivityIndicator color="#ff6b35" size="large" />
        <Text style={{ color: '#999', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
