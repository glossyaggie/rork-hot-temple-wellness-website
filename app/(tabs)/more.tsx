import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { DollarSign, Camera, MapPin, Phone, Mail, Clock, User } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';

const PASSES = [
  {
    name: 'Single Class',
    price: '$25',
    description: 'Perfect for trying us out',
  },
  {
    name: '5 Class Pass',
    price: '$90',
    description: 'Great for regular practice',
  },
  {
    name: '10 Class Pass',
    price: '$200',
    description: 'Best value for committed yogis',
  },
  {
    name: '25 Class Pass',
    price: '$400',
    description: 'Ultimate flexibility',
  },
  {
    name: 'Monthly Unlimited',
    price: '$200',
    description: 'Unlimited classes for 30 days',
  },
  {
    name: 'Weekly Unlimited',
    price: '$45',
    description: 'Unlimited classes for 7 days',
  },
];

const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1506629905607-d9b1e0b5b8b0?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=400&h=300&fit=crop',
];

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleContact = (type: 'phone' | 'email' | 'location') => {
    const contacts = {
      phone: 'tel:+61234567890',
      email: 'mailto:hello@thehottemple.com.au',
      location: 'https://maps.google.com/?q=3/53+Township+Drive,+Burleigh+Heads+QLD+4220',
    };
    
    Linking.openURL(contacts[type]);
  };

  const handleAuthPress = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalVisible(true);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to The Hot Temple</Text>
          <Text style={styles.subtitle}>
            {user ? `Hello, ${user.name}!` : 'Sign in to track your progress, book classes, and join our community'}
          </Text>
          
          {!user ? (
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => handleAuthPress('login')}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.signUpButton}
                onPress={() => handleAuthPress('signup')}
              >
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <User size={24} color="white" />
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>
          
          <View style={styles.priceGrid}>
            {PASSES.map((pass, index) => (
              <View key={index} style={styles.priceCard}>
                <Text style={styles.passName}>{pass.name}</Text>
                <Text style={styles.passPrice}>{pass.price}</Text>
                <Text style={styles.passDescription}>{pass.description}</Text>
              </View>
            ))}
          </View>

          <View style={styles.specialOffer}>
            <Text style={styles.offerTitle}>🔥 INTRO OFFER</Text>
            <Text style={styles.offerText}>
              $29 - 1 Week Unlimited
            </Text>
            <Text style={styles.offerDescription}>
              Perfect for new members to experience our heated studio
            </Text>
          </View>
        </View>

        {/* Gallery Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Camera size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Studio Gallery</Text>
          </View>
          
          <View style={styles.gallery}>
            {GALLERY_IMAGES.map((image, index) => (
              <View key={index} style={styles.galleryItem}>
                <Image source={{ uri: image }} style={styles.galleryImage} />
              </View>
            ))}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About The Hot Temple</Text>
          <Text style={styles.aboutText}>
            Located in the heart of Burleigh Heads, The Hot Temple is more than just a yoga studio – 
            it's a sanctuary for transformation. Our heated studio provides the perfect environment 
            for hot yoga and Pilates, helping you build strength, flexibility, and inner peace.
          </Text>
          <Text style={styles.aboutText}>
            Whether you're a beginner or experienced practitioner, our welcoming community and 
            expert instructors will guide you on your wellness journey. Come as you are, 
            leave transformed.
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Location</Text>
          
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleContact('location')}
          >
            <MapPin size={20} color={theme.colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Visit Us</Text>
              <Text style={styles.contactDetail}>
                3/53 Township Drive{'\n'}Burleigh Heads, QLD 4220
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleContact('phone')}
          >
            <Phone size={20} color={theme.colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Call Us</Text>
              <Text style={styles.contactDetail}>+61 234 567 890</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleContact('email')}
          >
            <Mail size={20} color={theme.colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Email Us</Text>
              <Text style={styles.contactDetail}>hello@thehottemple.com.au</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.contactItem}>
            <Clock size={20} color={theme.colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Studio Hours</Text>
              <Text style={styles.contactDetail}>
                Monday - Friday: 5:30 AM - 8:00 PM{'\n'}
                Saturday - Sunday: 8:00 AM - 6:00 PM
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 The Hot Temple. All rights reserved.
          </Text>
          <Text style={styles.footerText}>
            Sweat, Glow, Evolve 🔥
          </Text>
        </View>
      </ScrollView>
      
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        initialMode={authMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },

  authButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  signInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'white',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: 'white',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  signUpButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  userSection: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.sm,
  },
  userEmail: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
    marginTop: theme.spacing.xs,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'white',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  priceGrid: {
    gap: theme.spacing.md,
  },
  priceCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  passName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  passPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  passDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  specialOffer: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.sm,
  },
  offerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.sm,
  },
  offerDescription: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  galleryItem: {
    width: '48%',
    aspectRatio: 4/3,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md,
  },
  aboutText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  contactDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
});