import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { fetchMyPasses, summarizeActivePasses, type UserPass } from '@/utils/api';
import { supabase } from '@/lib/supabase';
import { Ticket, RefreshCcw } from 'lucide-react-native';

interface Props {
  onRefetchDone?: () => void;
}

export default function MyPassesCard({ onRefetchDone }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [passes, setPasses] = useState<UserPass[] | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      await supabase.auth.getSession();
      const data = await fetchMyPasses();
      setPasses(data);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load passes';
      setError(msg);
      console.log('MyPassesCard load error', msg);
    } finally {
      setLoading(false);
      onRefetchDone?.();
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => summarizeActivePasses(passes ?? []), [passes]);

  return (
    <View style={styles.card} testID="my-passes-card">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ticket size={18} color={theme.colors.primary} />
          <Text style={styles.title}>My Passes</Text>
        </View>
        <TouchableOpacity onPress={load} disabled={loading} style={styles.refreshBtn} testID="refresh-passes">
          <RefreshCcw size={16} color={loading ? theme.colors.textLight : theme.colors.primary} />
          <Text style={[styles.refreshText, { color: loading ? theme.colors.textLight : theme.colors.primary }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}

      {!loading && error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {!loading && !error && (
        <View style={{ gap: 8 }}>
          {summary.hasUnlimited ? (
            <View style={styles.row}>
              <Text style={styles.label}>Unlimited</Text>
              <Text style={styles.value}>{summary.unlimitedValidUntil ? `Active until ${new Date(summary.unlimitedValidUntil).toLocaleDateString()}` : 'Active'}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Unlimited</Text>
              <Text style={styles.valueMuted}>None</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Class credits</Text>
            <Text style={styles.value}>{summary.totalCredits}</Text>
          </View>
          {Array.isArray(passes) && passes.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {passes.map((p) => {
                const active = p.is_active ?? false;
                const exp = p.expires_at ? new Date(p.expires_at) : null;
                const expired = exp ? exp < new Date() : false;
                return (
                  <View key={p.id} style={styles.passRow}>
                    <Text style={styles.passType}>{p.pass_type ?? 'Pass'}</Text>
                    <Text style={styles.passMeta}>
                      {p.remaining_credits != null ? `${p.remaining_credits} credits` : 'Unlimited'}
                      {exp && ` · ${expired ? 'expired' : 'expires'} ${exp.toLocaleDateString()}`}
                      {active === false && ' · inactive'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.valueMuted}>No passes yet</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  refreshText: { fontSize: 12, fontWeight: '600' },
  center: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  label: { color: theme.colors.textSecondary, fontSize: 14 },
  value: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  valueMuted: { color: theme.colors.textLight, fontSize: 14 },
  errorText: { color: theme.colors.error, fontSize: 14 },
  passRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.colors.border },
  passType: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  passMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
