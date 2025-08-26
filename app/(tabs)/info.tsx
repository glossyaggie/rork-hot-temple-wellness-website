import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Facebook, Instagram, Calendar, HelpCircle, MessageCircle, Phone } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';
import NotificationBanner from '@/components/NotificationBanner';

const FAQ_ITEMS = [
  {
    question: "What should I bring to my first class?",
    answer: "Bring a yoga mat, towel, and water bottle. We recommend wearing comfortable, breathable clothing. The studio is heated to 35-40°C, so dress light!"
  },
  {
    question: "How hot is the studio?",
    answer: "Our studio is heated to 35-40°C (95-104°F) with humidity around 40%. This creates the perfect environment for deep stretching and detoxification."
  },
  {
    question: "Do I need to book in advance?",
    answer: "Yes, we recommend booking in advance as classes can fill up quickly. You can book through this app or call us directly."
  },
  {
    question: "What if I'm a complete beginner?",
    answer: "Everyone is welcome! Our instructors provide modifications for all levels. Take breaks when needed and listen to your body."
  },
  {
    question: "Can I cancel or reschedule my booking?",
    answer: "You can cancel up to 2 hours before class starts. Late cancellations or no-shows will result in credit deduction."
  },
  {
    question: "What's included in the intro offer?",
    answer: "Our $29 intro offer includes unlimited classes for one week. It's perfect for new members to experience our community and find their favorite classes."
  }
];

export default function InfoScreen() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });
  
  const { user } = useAuth();

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleViewSchedule = () => {
    showNotification('Navigate to Schedule tab to view classes', 'info');
  };

  const handleSocialPress = (platform: 'facebook' | 'instagram') => {
    const urls = {
      facebook: 'https://facebook.com/thehottemple',
      instagram: 'https://instagram.com/thehottemple',
    };
    
    Linking.openURL(urls[platform]).catch(() => {
      showNotification(`Could not open ${platform}`, 'error');
    });
  };

  const handleContact = () => {
    Linking.openURL('tel:+61234567890').catch(() => {
      showNotification('Could not open phone app', 'error');
    });
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(230, 82, 89, 0.8)', 'rgba(255, 107, 107, 0.6)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                Find Your Balance at{'\n'}The Hot Temple
              </Text>
              
              <Text style={styles.heroDescription}>
                Transform your body and mind through the power of heat.
                Join our welcoming community for hot yoga and Pilates classes
                in the heart of Burleigh Heads.
              </Text>

              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleViewSchedule}
              >
                <Calendar size={20} color="white" />
                <Text style={styles.ctaButtonText}>View Schedule</Text>
              </TouchableOpacity>

              <View style={styles.taglineBlock}>
                <Text style={styles.studioName}>THE HOT TEMPLE</Text>
                <Text style={styles.studioType}>Wellness centre</Text>
                <Text style={styles.tagline}>SWEAT, GLOW, EVOLVE 🔥</Text>
                <Text style={styles.services}>Hot yoga & Hot Pilates</Text>
                <Text style={styles.offer}>INTRO OFFER $29 – 1 WEEK UNLIMITED</Text>
                <Text style={styles.address}>
                  3/53 Township Drive, Burleigh, Queensland, Australia 4220
                </Text>
              </View>

              <View style={styles.socialLinks}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialPress('facebook')}
                >
                  <Facebook size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialPress('instagram')}
                >
                  <Instagram size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.sectionTitle}>Welcome to Your Journey</Text>
          <Text style={styles.sectionText}>
            Whether you're a beginner or experienced practitioner, our heated studio
            provides the perfect environment for transformation. Experience the benefits
            of hot yoga and Pilates in our state-of-the-art facility.
          </Text>

          {!user && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => setShowAuthModal(true)}
            >
              <Text style={styles.joinButtonText}>Join Our Community</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <View style={styles.sectionHeader}>
            <HelpCircle size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          
          <View style={styles.faqList}>
            {FAQ_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.faqItem}
                onPress={() => toggleFAQ(index)}
              >
                <View style={styles.faqQuestion}>
                  <Text style={styles.faqQuestionText}>{item.question}</Text>
                  <Text style={styles.faqToggle}>
                    {expandedFAQ === index ? '−' : '+'}
                  </Text>
                </View>
                {expandedFAQ === index && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Hot Yoga?</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitTitle}>🔥 Detoxification</Text>
              <Text style={styles.benefitText}>
                Sweat out toxins and impurities while building strength
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitTitle}>💪 Flexibility</Text>
              <Text style={styles.benefitText}>
                Heat allows deeper stretches and improved mobility
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitTitle}>🧘 Mental Clarity</Text>
              <Text style={styles.benefitText}>
                Focus your mind and reduce stress through mindful movement
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitTitle}>❤️ Cardiovascular Health</Text>
              <Text style={styles.benefitText}>
                Improve heart health and circulation in a heated environment
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <View style={styles.sectionHeader}>
            <MessageCircle size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Need Help?</Text>
          </View>
          
          <Text style={styles.contactText}>
            Have questions or need assistance? We're here to help!
          </Text>
          
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <Phone size={20} color="white" />
            <Text style={styles.contactButtonText}>Call Us: +61 234 567 890</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => showNotification('Welcome to The Hot Temple!', 'success')}
      />

      <NotificationBanner
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
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
  hero: {
    height: 600,
    backgroundColor: theme.colors.primary,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 38,
  },
  heroDescription: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
    opacity: 0.9,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  taglineBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  studioName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
  },
  studioType: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  services: {
    fontSize: 14,
    color: 'white',
    marginBottom: theme.spacing.sm,
    opacity: 0.9,
  },
  offer: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  address: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 16,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeSection: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  faqSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  faqList: {
    gap: theme.spacing.sm,
  },
  faqItem: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  faqToggle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    width: 24,
    textAlign: 'center',
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  benefitsSection: {
    padding: theme.spacing.lg,
  },
  benefitsList: {
    gap: theme.spacing.lg,
  },
  benefitItem: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  contactSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    gap: theme.spacing.sm,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});