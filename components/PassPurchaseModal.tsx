import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Pass } from '@/types';
import { createCheckout, openCheckout, confirmPayment } from '@/utils/api';

const PASSES: ReadonlyArray<Pass> = [
  { id: 'single', name: 'Single Class', price: 0, credits: 1, description: 'Perfect for trying us out', isUnlimited: false },
  { id: '5-class', name: '5 Class Pass', price: 0, credits: 5, description: 'Great for regular practice', isUnlimited: false },
  { id: '10-class', name: '10 Class Pass', price: 0, credits: 10, description: 'Best value for committed yogis', isUnlimited: false },
  { id: '25-class', name: '25 Class Pass', price: 0, credits: 25, description: 'Ultimate flexibility', isUnlimited: false },
  { id: 'weekly-unlimited', name: 'Weekly Unlimited', price: 0, credits: 0, description: 'Unlimited classes for 7 days', isUnlimited: true, duration: 7 },
  { id: 'monthly-unlimited', name: 'Monthly Unlimited', price: 0, credits: 0, description: 'Unlimited classes for 30 days', isUnlimited: true, duration: 30 },
  { id: 'vip-monthly', name: 'VIP Monthly', price: 0, credits: 0, description: 'Unlimited + perks', isUnlimited: true, duration: 30 },
  { id: 'vip-yearly', name: 'VIP Yearly', price: 0, credits: 0, description: 'Best value VIP for 12 months', isUnlimited: true, duration: 365 },
];

export type PriceMap = {
  'single'?: string;
  '5-class'?: string;
  '10-class'?: string;
  '25-class'?: string;
  'weekly-unlimited'?: string;
  'monthly-unlimited'?: string;
  'vip-monthly'?: string;
  'vip-yearly'?: string;
};

interface PassPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  priceMap?: PriceMap;
}

export default function PassPurchaseModal({ visible, onClose, onSuccess, priceMap }: PassPurchaseModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const safePriceMap: PriceMap = priceMap ?? {};
  const available = useMemo(() => PASSES, [safePriceMap]);

  const handlePurchase = async (pass: Pass) => {
    try {
      const priceId = safePriceMap[pass.id as keyof PriceMap];
      if (!priceId) {
        onSuccess('Price not configured.');
        return;
      }
      setSelectedId(pass.id);
      setLoading(true);
      const payload = {
        priceId: String(priceId),
        quantity: 1,
        mode: pass.isUnlimited ? 'subscription' : 'payment',
        metadata: { pass_id: pass.id },
        successUrl: `${window?.location?.origin ?? 'https://app.example.com'}/?status=success`,
        cancelUrl: `${window?.location?.origin ?? 'https://app.example.com'}/?status=cancel`,
      } as const;
      const session = await createCheckout(payload);
      if (!session) {
        onSuccess('Could not start checkout.');
        setLoading(false);
        setSelectedId(null);
        return;
      }
      setLastSessionId(session.sessionId);
      await openCheckout(session.url);
    } catch (e) {
      onSuccess('Failed to open checkout.');
    } finally {
      setLoading(false);
      setSelectedId(null);
    }
  };

  const handleConfirm = async () => {
    if (!lastSessionId) {
      onSuccess('No checkout session to confirm.');
      return;
    }
    setLoading(true);
    const res = await confirmPayment(lastSessionId);
    setLoading(false);
    if (res.ok) {
      onSuccess('Payment confirmed. Pass updated!');
      onClose();
    } else {
      onSuccess('Payment not found yet. If you completed checkout, try again in a few seconds.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Pass</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} testID="close-pass-modal">
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Select a pass. Prices load from Stripe by Price ID.</Text>

          {available.map((pass) => {
            const isVIP = pass.id.includes('vip');
            const isPopular = pass.id === 'monthly-unlimited';
            const busy = loading && selectedId === pass.id;
            return (
              <TouchableOpacity
                key={pass.id}
                style={[styles.passCard, isVIP && styles.vipCard, isPopular && styles.popularCard]}
                onPress={() => handlePurchase(pass)}
                disabled={loading || !safePriceMap[pass.id as keyof PriceMap]}
                testID={`buy-${pass.id}`}
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
                  <Text style={[styles.passPrice, isVIP && styles.vipPrice]}>{safePriceMap[pass.id as keyof PriceMap] ? 'Available' : 'Not configured'}</Text>
                </View>
                <Text style={styles.passDescription}>{pass.description}</Text>
                <View style={styles.passDetails}>
                  {pass.isUnlimited ? (
                    <Text style={styles.passCredits}>Unlimited for {pass.duration} days</Text>
                  ) : (
                    <Text style={styles.passCredits}>{pass.credits} {pass.credits === 1 ? 'class' : 'classes'}</Text>
                  )}
                </View>
                {!safePriceMap[pass.id as keyof PriceMap] && (
                  <Text style={{ color: theme.colors.error, marginTop: 8 }}>Add Price ID to enable purchase</Text>
                )}
                {busy && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleConfirm} disabled={!lastSessionId || loading} style={{ padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: lastSessionId ? theme.colors.primary : theme.colors.border }} testID="confirm-payment">
              <Text style={{ color: lastSessionId ? '#fff' : theme.colors.textSecondary, fontWeight: '700' }}>{lastSessionId ? 'I completed payment' : 'Start a checkout to enable confirm'}</Text>
            </TouchableOpacity>
            <Text style={styles.footerNote}>After finishing Stripe checkout, tap “I completed payment”.</Text>
            {available.every(p => !safePriceMap[p.id as keyof PriceMap]) && (
              <Text style={[styles.footerNote, { color: theme.colors.error }]}>No Stripe Price IDs configured. Passes are visible but disabled.</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, paddingTop: theme.spacing.xxl, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  closeButton: { padding: theme.spacing.sm },
  content: { flex: 1, padding: theme.spacing.lg },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, textAlign: 'center' },
  passCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm, position: 'relative' },
  vipCard: { borderColor: '#FFD700', borderWidth: 2, backgroundColor: '#FFF9E6' },
  popularCard: { borderColor: theme.colors.primary, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -8, right: 16, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 1 },
  popularBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  vipBadge: { position: 'absolute', top: -8, right: 16, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 1 },
  vipBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  vipText: { color: '#B8860B' },
  vipPrice: { color: '#B8860B' },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  passName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  passPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  passDescription: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  passDetails: { marginTop: theme.spacing.sm },
  passCredits: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: theme.borderRadius.lg },
  footer: { marginTop: theme.spacing.lg, gap: 8 },
  footerNote: { fontSize: 12, color: theme.colors.textLight, textAlign: 'center' },
});