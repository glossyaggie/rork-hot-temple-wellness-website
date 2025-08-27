import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Clock, Users, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSchedule } from '@/hooks/useSchedule';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const hours12 = ((h + 11) % 12) + 1;
  const mm = m.toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hours12}:${mm} ${ampm}`;
}

function durationMin(startIso: string, endIso: string): number {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  const diff = Math.max(0, e - s);
  return Math.round(diff / 60000);
}

export default function ScheduleScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { items, isLoading, isError, refetch, add, update, remove, creating, updating, deleting } = useSchedule();
  const [modalOpenId, setModalOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ title: string; instructor: string; start_time: string; end_time: string; capacity: string }>({ title: '', instructor: '', start_time: '', end_time: '', capacity: '' });

  const sorted = useMemo(() => items.slice().sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()), [items]);

  const openCreate = () => {
    setModalOpenId(0);
    setDraft({ title: '', instructor: '', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 3600000).toISOString(), capacity: '' });
  };

  const openEdit = (id: number) => {
    const row = items.find(r => r.id === id);
    if (!row) return;
    setModalOpenId(id);
    setDraft({ title: row.title ?? '', instructor: row.instructor ?? '', start_time: row.start_time, end_time: row.end_time, capacity: (row.capacity ?? '').toString() });
  };

  const closeModal = () => {
    setModalOpenId(null);
  };

  const submit = async () => {
    try {
      const payload = { title: draft.title, instructor: draft.instructor, start_time: draft.start_time, end_time: draft.end_time, capacity: draft.capacity ? Number(draft.capacity) : null };
      if (modalOpenId && modalOpenId !== 0) {
        await update({ id: modalOpenId, patch: payload });
      } else {
        await add(payload);
      }
      closeModal();
    } catch (e) {
      Alert.alert('Error', 'Could not save schedule');
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert('Delete class', 'Are you sure you want to delete this class?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await remove(id); } catch { Alert.alert('Error', 'Delete failed'); } } }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Schedule</Text>
        {isAdmin && (
          <TouchableOpacity onPress={openCreate} style={styles.addBtn} testID="add-class-btn">
            <Plus color="#fff" size={18} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <View style={styles.loading} testID="schedule-loading">
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading schedule…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.error} testID="schedule-error">
          <Text style={styles.errorText}>Failed to load schedule</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.classesContainer} showsVerticalScrollIndicator={false}>
          {sorted.map((c) => {
            const dur = durationMin(c.start_time, c.end_time);
            return (
              <View key={c.id} style={styles.card} testID={`class-card-${c.id}`}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{c.title}</Text>
                  {isAdmin && (
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEdit(c.id)} style={styles.iconBtn} testID={`edit-${c.id}`}>
                        <Pencil size={18} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(c.id)} style={styles.iconBtn} testID={`delete-${c.id}`}>
                        <Trash2 size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <Text style={styles.instructor}>{c.instructor}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{fmtTime(c.start_time)} - {fmtTime(c.end_time)} • {dur} min</Text>
                  </View>
                  {c.capacity !== null && (
                    <View style={styles.metaItem}>
                      <Users size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.metaText}>{c.capacity}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {sorted.length === 0 && (
            <View style={styles.noClassesContainer} testID="no-classes">
              <Text style={styles.noClassesText}>No scheduled classes</Text>
            </View>
          )}
        </ScrollView>
      )}

      {isAdmin && modalOpenId !== null && (
        <View style={styles.modal} testID="edit-modal">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalOpenId === 0 ? 'Create Class' : 'Edit Class'}</Text>
            <TextInput placeholder="Title" value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} style={styles.input} testID="input-title" />
            <TextInput placeholder="Instructor" value={draft.instructor} onChangeText={(t) => setDraft({ ...draft, instructor: t })} style={styles.input} testID="input-instructor" />
            <TextInput placeholder="Start ISO" value={draft.start_time} onChangeText={(t) => setDraft({ ...draft, start_time: t })} style={styles.input} autoCapitalize="none" testID="input-start" />
            <TextInput placeholder="End ISO" value={draft.end_time} onChangeText={(t) => setDraft({ ...draft, end_time: t })} style={styles.input} autoCapitalize="none" testID="input-end" />
            <TextInput placeholder="Capacity (optional)" value={draft.capacity} onChangeText={(t) => setDraft({ ...draft, capacity: t })} keyboardType="number-pad" style={styles.input} testID="input-capacity" />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={closeModal} style={[styles.modalBtn, styles.cancelBtn]} testID="cancel-modal"><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submit} disabled={creating || updating} style={[styles.modalBtn, styles.saveBtn]} testID="save-modal">
                {(creating || updating) ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  loading: { padding: theme.spacing.lg, alignItems: 'center' },
  loadingText: { marginTop: 8, color: theme.colors.textSecondary },
  error: { padding: theme.spacing.lg, alignItems: 'center' },
  errorText: { color: theme.colors.error, marginBottom: 8 },
  retryBtn: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },
  retryText: { color: theme.colors.text },
  scrollView: { flex: 1 },
  classesContainer: { padding: theme.spacing.lg, gap: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  instructor: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  noClassesContainer: { padding: theme.spacing.xl, alignItems: 'center' },
  noClassesText: { color: theme.colors.textSecondary },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.md, color: theme.colors.text },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.background },
  modalActions: { marginTop: theme.spacing.md, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md },
  cancelBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  saveBtn: { backgroundColor: theme.colors.primary },
  cancelText: { color: theme.colors.text },
  saveText: { color: '#fff', fontWeight: '700' },
});