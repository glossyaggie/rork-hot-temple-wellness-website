import { Tabs } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { loading, isStaff } = useAuth();
  if (loading) return <Text />; // simple guard during role fetch

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'My Account' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="info" options={{ title: 'Info' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      {isStaff && <Tabs.Screen name="admin" options={{ title: 'Admin' }} />}
    </Tabs>
  );
}