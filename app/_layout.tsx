import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';
import { BookingsProvider } from '../hooks/useBookings';
import { HabitTrackerProvider } from '../hooks/useHabitTracker';

export default function RootLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    console.log('⏳ Root loading...');
    return (
      <View style={{ flex: 1, justifyContent:'center', alignItems:'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', marginBottom: 16, fontSize: 40 }}>🔥</Text>
        <ActivityIndicator color="#ff6b35" size="large" />
        <Text style={{ color: '#999', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    console.log('➡️ No session. Redirecting to auth welcome');
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <BookingsProvider>
      <HabitTrackerProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <Redirect href="/(tabs)" />
      </HabitTrackerProvider>
    </BookingsProvider>
  );
}