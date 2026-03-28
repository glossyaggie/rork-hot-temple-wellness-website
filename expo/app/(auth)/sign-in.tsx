import { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    try {
      setBusy(true);
      console.log('🔐 Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }
      
      console.log('✅ Sign in successful:', data.user?.email);
      // Navigation will be handled by the root layout redirect
    } catch (e: any) {
      console.error('❌ Sign in exception:', e);
      Alert.alert('Login failed', e.message ?? 'Please check your credentials and try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <TextInput 
            style={styles.input}
            placeholder="Email" 
            placeholderTextColor="#666"
            autoCapitalize="none" 
            keyboardType="email-address" 
            value={email} 
            onChangeText={setEmail} 
          />
          <TextInput 
            style={styles.input}
            placeholder="Password" 
            placeholderTextColor="#666"
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
          />
          
          <TouchableOpacity 
            style={[styles.button, busy && styles.buttonDisabled]} 
            onPress={onSignIn}
            disabled={busy}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Signing in…' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  form: {
    gap: 16,
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: '#999',
    fontSize: 16,
  },
});