import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Calendar, Award } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import AuthModal from '@/components/AuthModal';

export default function WelcomeScreen() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleSignIn = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Flame size={48} color="#FF6B35" />
                </View>
                <Text style={styles.title}>The Hot Temple</Text>
                <Text style={styles.subtitle}>
                  Transform your body and mind through the power of hot yoga
                </Text>
              </View>

              {/* Features */}
              <View style={styles.featuresSection}>
                <View style={styles.feature}>
                  <View style={styles.featureIconContainer}>
                    <Flame size={24} color="#FF6B35" />
                  </View>
                  <Text style={styles.featureText}>Hot Yoga Classes</Text>
                  <Text style={styles.featureSubtext}>Heated to 105°F</Text>
                </View>
                <View style={styles.feature}>
                  <View style={styles.featureIconContainer}>
                    <Calendar size={24} color="#4ECDC4" />
                  </View>
                  <Text style={styles.featureText}>Easy Booking</Text>
                  <Text style={styles.featureSubtext}>Reserve your spot</Text>
                </View>
                <View style={styles.feature}>
                  <View style={styles.featureIconContainer}>
                    <Award size={24} color="#FFD93D" />
                  </View>
                  <Text style={styles.featureText}>Track Progress</Text>
                  <Text style={styles.featureSubtext}>Build habits</Text>
                </View>
              </View>

              {/* Benefits */}
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Why Hot Yoga?</Text>
                <View style={styles.benefitsList}>
                  <Text style={styles.benefitItem}>• Increased flexibility & strength</Text>
                  <Text style={styles.benefitItem}>• Improved cardiovascular health</Text>
                  <Text style={styles.benefitItem}>• Enhanced mental clarity</Text>
                  <Text style={styles.benefitItem}>• Deep detoxification</Text>
                </View>
              </View>

              {/* Auth Buttons */}
              <View style={styles.authSection}>
                <TouchableOpacity
                  style={styles.signUpButton}
                  onPress={handleSignUp}
                >
                  <Text style={styles.signUpButtonText}>Start Your Journey</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleSignIn}
                >
                  <Text style={styles.signInButtonText}>I already have an account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 3,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.md,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  featureSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  authSection: {
    gap: theme.spacing.md,
  },
  benefitsSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  benefitsList: {
    gap: theme.spacing.xs,
  },
  benefitItem: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  signUpButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  signInButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});