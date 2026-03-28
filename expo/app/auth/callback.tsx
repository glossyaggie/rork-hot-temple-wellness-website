import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Linking as RNLinking } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [status, setStatus] = useState<'parsing' | 'done' | 'error'>('parsing');

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      try {
        console.log('🔗 Auth callback URL', url);
        if (!url) throw new Error('No URL');

        const parsed = Linking.parse(url);
        const hashParams = parseHashParams(parsed?.path ? url : undefined) ?? {};
        const qp = parsed.queryParams ?? {};

        const access_token = (hashParams.access_token ?? qp.access_token ?? '') as string;
        const refresh_token = (hashParams.refresh_token ?? qp.refresh_token ?? '') as string;
        const code = (qp.code ?? hashParams.code ?? '') as string;

        const type = (qp.type ?? hashParams.type ?? '') as string;
        console.log('🔍 Parsed params', { type, hasCode: Boolean(code), hasAT: Boolean(access_token) });

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else {
          console.warn('No code or tokens found in callback URL');
        }

        setStatus('done');
        router.replace('/(tabs)');
      } catch (e: any) {
        console.error('❌ Auth callback error', e);
        setStatus('error');
        Alert.alert('Sign-in link error', e?.message ?? 'Could not process the verification link.');
        router.replace('/(auth)/sign-in');
      }
    };

    RNLinking.getInitialURL().then((initial) => handleUrl(initial));

    const sub = RNLinking.addEventListener('url', (evt) => handleUrl(evt.url));
    return () => {
      sub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#ff6b35" />
      <Text style={styles.text}>{status === 'parsing' ? 'Finalizing sign-in…' : status === 'done' ? 'All set!' : 'Something went wrong'}</Text>
    </View>
  );
}

function parseHashParams(fullUrl?: string): Record<string, string> | null {
  try {
    if (!fullUrl) return null;
    const hashIndex = fullUrl.indexOf('#');
    if (hashIndex === -1) return null;
    const hash = fullUrl.substring(hashIndex + 1);
    const pairs = hash.split('&');
    const out: Record<string, string> = {};
    for (const p of pairs) {
      const [k, v] = p.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
    return out;
  } catch (e) {
    console.warn('parseHashParams failed', e);
    return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', marginTop: 12 },
});
