import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Pass, PassType } from '@/types';

const PASSES: Pass[] = [
  {
    id: 'single',
    name: 'Single Class',
    price: 25,
    credits: 1,
    description: 'Perfect for trying us out',
    isUnlimited: false,
  },
  {
    id: '5-class',
    name: '5 Class Pass',
    price: 90,
    credits: 5,
    description: 'Great for regular practice',
    isUnlimited: false,
  },
  {
    id: '10-class',
    name: '10 Class Pass',
    price: 200,
    credits: 10,
    description: 'Best value for committed yogis',
    isUnlimited: false,
  },
  {
    id: '25-class',
    name: '25 Class Pass',
    price: 400,
    credits: 25,
    description: 'Ultimate flexibility',
    isUnlimited: false,
  },
  {
    id: 'weekly-unlimited',
    name: 'Weekly Unlimited',
    price: 45,
    credits: 0,
    description: 'Unlimited classes for 7 days',
    isUnlimited: true,
    duration: 7,
  },
  {
    id: 'monthly-unlimited',
    name: 'Monthly Unlimited',
    price: 200,
    credits: 0,
    description: 'Unlimited classes for 30 days',
    isUnlimited: true,
    duration: 30,
  },
  {
    id: 'vip-monthly',
    name: 'VIP Monthly',
    price: 300,
    credits: 0,
    description: 'Unlimited classes + priority booking + guest passes',
    isUnlimited: true,
    duration: 30,
  },
  {
    id: 'vip-yearly',
    name: 'VIP Yearly',
    price: 2500,
    credits: 0,
    description: 'Best value VIP - Save $1100! All VIP benefits for 12 months',
    isUnlimited: true,
    duration: 365,
  },
];

interface PassPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function PassPurchaseModal({ visible, onClose, onSuccess }: PassPurchaseModalProps) {
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { purchasePass } = useAuth();

  const handlePurchase = async (pass: Pass) => {
    setSelectedPass(pass);
    setIsLoading(true);

    try {
      const success = await purchasePass(
        pass.id as PassType,
        pass.credits,
        pass.price,
        pass.isUnlimited
      );

      if (success) {
        onSuccess(`${pass.name} purchased successfully!`);
        onClose();
      } else {
        onSuccess('Purchase failed. Please try again.');
      }
    } catch (error) {
      onSuccess('Purchase failed. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedPass(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Pass</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Select the perfect pass for your yoga journey
          </Text>

          {PASSES.map((pass) => {
            const isVIP = pass.id.includes('vip');
            const isPopular = pass.id === 'monthly-unlimited';
            
            return (
              <TouchableOpacity
                key={pass.id}
                style={[
                  styles.passCard,
                  isVIP && styles.vipCard,
                  isPopular && styles.popularCard,
                ]}
                onPress={() => handlePurchase(pass)}
                disabled={isLoading}
              >
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                
                {isVIP && (
                  <View style={styles.vipBadge}>
                    <Text style={styles.vipBadgeText}>VIP</Text>
                  </View>
                )}
                
                <View style={styles.passHeader}>
                  <Text style={[styles.passName, isVIP && styles.vipText]}>{pass.name}</Text>
                  <Text style={[styles.passPrice, isVIP && styles.vipPrice]}>${pass.price}</Text>
                </View>
                
                <Text style={styles.passDescription}>{pass.description}</Text>
                
                <View style={styles.passDetails}>
                  {pass.isUnlimited ? (
                    <Text style={styles.passCredits}>
                      Unlimited classes for {pass.duration} days
                    </Text>
                  ) : (
                    <Text style={styles.passCredits}>
                      {pass.credits} {pass.credits === 1 ? 'class' : 'classes'}
                    </Text>
                  )}
                  
                  {isVIP && (
                    <View style={styles.vipFeatures}>
                      <Text style={styles.vipFeature}>• Priority booking</Text>
                      <Text style={styles.vipFeature}>• 2 guest passes per month</Text>
                      <Text style={styles.vipFeature}>• Exclusive workshops</Text>
                      <Text style={styles.vipFeature}>• 10% retail discount</Text>
                    </View>
                  )}
                </View>

                {isLoading && selectedPass?.id === pass.id && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              All passes are valid for hot yoga and hot Pilates classes.
              No expiration date on class passes. VIP memberships include exclusive benefits.
            </Text>
            <Text style={styles.footerNote}>
              Secure payment processing • Cancel anytime • 30-day money back guarantee
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  passCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
    position: 'relative',
  },
  vipCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#FFF9E6',
  },
  popularCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  vipBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  vipBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  vipText: {
    color: '#B8860B',
  },
  vipPrice: {
    color: '#B8860B',
  },
  vipFeatures: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  vipFeature: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  passName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  passPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  passDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  passDetails: {
    marginTop: theme.spacing.sm,
  },
  passCredits: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  footer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  footerNote: {
    fontSize: 10,
    color: theme.colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});