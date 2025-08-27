import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';

interface State { hasError: boolean; message?: string }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary] Caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <Fallback message={this.state.message ?? 'App crashed'} />;
    }
    return this.props.children as React.ReactElement;
  }
}

function Fallback({ message }: { message: string }) {
  const router = useRouter();
  return (
    <View style={styles.container} testID="error-fallback">
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>{message}</Text>
      <TouchableOpacity
        onPress={() => {
          try {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.reload();
            } else {
              router.replace('/');
            }
          } catch (e) {
            console.log('Reload failed', e);
          }
        }}
        style={styles.btn}
        testID="reload-app"
      >
        <Text style={styles.btnText}>Reload</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#bbb', paddingHorizontal: 24, textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: '#ff5a5f', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});
