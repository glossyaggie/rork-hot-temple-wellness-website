import { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Alert, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signWaiver, setSignWaiver] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = fullName && phone && email && password && acceptTerms && signWaiver && !busy;

  const onSignUp = async () => {
    try {
      if (!canSubmit) return;
      setBusy(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('No user id');

      await supabase.from('profiles').update({
        full_name: fullName,
        phone,
        consent_marketing: consentMarketing,
        terms_version: '1.0',
        terms_accepted_at: new Date().toISOString(),
        waiver_signed_at: new Date().toISOString()
      }).eq('id', userId);

      // Navigation will be handled by the root layout redirect
    } catch (e:any) {
      Alert.alert('Signup failed', e.message ?? 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join The Hot Temple community</Text>
        </View>

        <View style={styles.form}>
          <TextInput 
            style={styles.input}
            placeholder="Full name" 
            placeholderTextColor="#666"
            value={fullName} 
            onChangeText={setFullName} 
          />
          <TextInput 
            style={styles.input}
            placeholder="Phone" 
            placeholderTextColor="#666"
            keyboardType="phone-pad" 
            value={phone} 
            onChangeText={setPhone} 
          />
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

          <View style={styles.checkboxes}>
            <TouchableOpacity 
              style={styles.checkbox} 
              onPress={() => setConsentMarketing(v => !v)}
            >
              <Text style={styles.checkboxIcon}>{consentMarketing ? '☑' : '☐'}</Text>
              <Text style={styles.checkboxText}>I agree to receive marketing messages</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.checkbox} 
              onPress={() => setAcceptTerms(v => !v)}
            >
              <Text style={styles.checkboxIcon}>{acceptTerms ? '☑' : '☐'}</Text>
              <Text style={styles.checkboxText}>I accept the Terms & Privacy Policy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.checkbox} 
              onPress={() => setSignWaiver(v => !v)}
            >
              <Text style={styles.checkboxIcon}>{signWaiver ? '☑' : '☐'}</Text>
              <Text style={styles.checkboxText}>I have signed the waiver</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, !canSubmit && styles.buttonDisabled]} 
            disabled={!canSubmit} 
            onPress={onSignUp}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Creating…' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
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
  checkboxes: {
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxIcon: {
    fontSize: 18,
    color: '#ff6b35',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
  },
  button: {
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
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