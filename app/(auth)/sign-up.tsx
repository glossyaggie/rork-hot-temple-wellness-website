import { useState, useMemo } from 'react';
import { View, TextInput, StyleSheet, Text, Alert, SafeAreaView, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

export default function SignUp() {
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [consentMarketing, setConsentMarketing] = useState<boolean>(false);
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [signWaiver, setSignWaiver] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState<boolean>(false);
  const [resentBusy, setResentBusy] = useState<boolean>(false);

  const canSubmit = useMemo<boolean>(() => {
    return Boolean(fullName && phone && email && password && acceptTerms && signWaiver && !busy);
  }, [fullName, phone, email, password, acceptTerms, signWaiver, busy]);

  const onSignUp = async () => {
    try {
      if (!canSubmit) return;
      setBusy(true);
      console.log('📝 SignUp start', { email });

      const emailRedirectTo = LinkingExpo.createURL('/auth/callback');
      console.log('↪️ Using emailRedirectTo', emailRedirectTo);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo },
      });
      if (error) throw error;

      const userId = data.user?.id ?? null;
      console.log('✅ SignUp response', { userId, hasSession: Boolean(data.session) });

      if (userId) {
        try {
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              phone,
              consent_marketing: consentMarketing,
              terms_version: '1.0',
              terms_accepted_at: new Date().toISOString(),
              waiver_signed_at: new Date().toISOString(),
            })
            .eq('id', userId);
          if (profileErr) console.warn('⚠️ Profile update warning (likely unauthenticated until email confirmed):', profileErr);
        } catch (profileEx) {
          console.warn('⚠️ Profile update exception:', profileEx);
        }
      }

      if (!data.session) {
        setNeedsEmailConfirm(true);
        Alert.alert(
          'Verify your email',
          'We sent a verification link to ' + email + '. Open it to activate your account, then return to the app and sign in.'
        );
      } else {
        Alert.alert('Account created', 'You are now signed in.');
      }
    } catch (e: any) {
      console.error('❌ Signup failed', e);
      Alert.alert('Signup failed', e.message ?? 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const onOpenMail = () => {
    if (Platform.OS !== 'web') {
      Linking.openURL('mailto:' + email).catch(() => {
        Alert.alert('Open your mail app', 'Please open your email app and find the verification link.');
      });
    } else {
      Alert.alert('Check your email', 'Open your email in a new tab and click the verification link.');
    }
  };

  const onResend = async () => {
    try {
      setResentBusy(true);
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      Alert.alert('Email sent', 'We re-sent the verification email.');
    } catch (err: any) {
      console.error('❌ Resend error', err);
      Alert.alert('Could not resend', err.message ?? 'Try again in a minute.');
    } finally {
      setResentBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join The Hot Temple community</Text>
        </View>

        {!needsEmailConfirm ? (
          <View style={styles.form}>
            <TextInput
              testID="signup-fullname"
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#666"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              testID="signup-phone"
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              testID="signup-email"
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              testID="signup-password"
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.checkboxes}>
              <TouchableOpacity
                testID="signup-consent"
                style={styles.checkbox}
                onPress={() => setConsentMarketing((v) => !v)}
              >
                <Text style={styles.checkboxIcon}>{consentMarketing ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxText}>I agree to receive marketing messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="signup-terms"
                style={styles.checkbox}
                onPress={() => setAcceptTerms((v) => !v)}
              >
                <Text style={styles.checkboxIcon}>{acceptTerms ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxText}>I accept the Terms & Privacy Policy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="signup-waiver"
                style={styles.checkbox}
                onPress={() => setSignWaiver((v) => !v)}
              >
                <Text style={styles.checkboxIcon}>{signWaiver ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxText}>I have signed the waiver</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="signup-submit"
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              disabled={!canSubmit}
              onPress={onSignUp}
            >
              <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Create Account'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.verifyBox}>
            <Text style={styles.verifyTitle}>Check your email</Text>
            <Text style={styles.verifyText}>
              We sent a verification link to {email}. Open it to activate your account. Then return to the app and sign in.
            </Text>

            <TouchableOpacity testID="signup-open-mail" style={styles.button} onPress={onOpenMail}>
              <Text style={styles.buttonText}>Open mail app</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="signup-resend"
              style={[styles.button, resentBusy && styles.buttonDisabled]}
              disabled={resentBusy}
              onPress={onResend}
            >
              <Text style={styles.buttonText}>{resentBusy ? 'Resending…' : 'Resend email'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="signup-go-signin"
              style={[styles.linkBtn]}
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <Text style={styles.linkText}>I verified it — Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          testID="signup-back"
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
  verifyBox: {
    backgroundColor: '#111',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    marginBottom: 32,
  },
  verifyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  verifyText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  linkBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#ff6b35',
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