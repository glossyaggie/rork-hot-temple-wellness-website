import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, SectionList } from 'react-native';
import { Clock, Users, Pencil, Plus, Trash2, Calendar, RotateCcw } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSchedule, ScheduleRow } from '@/hooks/useSchedule';

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

function startOfWeekISO(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0=Mon
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeekISO(date: Date): Date {
  const s = startOfWeekISO(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 7);
  return e;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(date: Date): string {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return fmt.format(date);
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ScheduleScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null); // 0..6 or null for whole week
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set<string>());
  const [selectedInstructors, setSelectedInstructors] = useState<Set<string>>(new Set<string>());
  const [durationFilter, setDurationFilter] = useState<number | null>(null); // minutes

  const weekStart = useMemo(() => startOfWeekISO(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeekISO(selectedDate), [selectedDate]);

  const { items, isLoading, isError, refetch, add, update, remove, creating, updating } = useSchedule({
    startIso: weekStart.toISOString(),
    endIso: weekEnd.toISOString(),
    hidePast: true,
  });

  const [modalOpenId, setModalOpenId] = useState<number | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);
  const [dateInput, setDateInput] = useState<string>('');
  const [draft, setDraft] = useState<{ title: string; instructor: string; start_time: string; end_time: string; capacity: string }>({ title: '', instructor: '', start_time: '', end_time: '', capacity: '' });

  const allDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const filteredByDay = useMemo(() => {
    if (selectedDayIndex === null) return items;
    const day = allDays[selectedDayIndex];
    return items.filter(r => sameDay(new Date(r.start_time), day));
  }, [items, selectedDayIndex, allDays]);

  const filteredByChips = useMemo(() => {
    let list = filteredByDay;
    if (selectedTitles.size) list = list.filter(r => r.title && selectedTitles.has(r.title));
    if (selectedInstructors.size) list = list.filter(r => r.instructor && selectedInstructors.has(r.instructor));
    if (durationFilter) list = list.filter(r => durationMin(r.start_time, r.end_time) >= durationFilter);

    // Hide past classes by default when viewing current week and no specific day selected
    const now = Date.now();
    if (selectedDayIndex === null) list = list.filter(r => new Date(r.start_time).getTime() >= now);
    return list.slice().sort((a, b) => {
      const at = new Date(a.start_time).getTime();
      const bt = new Date(b.start_time).getTime();
      if (at !== bt) return at - bt;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [filteredByDay, selectedTitles, selectedInstructors, durationFilter, selectedDayIndex]);

  const sections = useMemo(() => {
    const map = new Map<string, { title: string; data: ScheduleRow[] }>();
    filteredByChips.forEach(r => {
      const dt = new Date(r.start_time);
      const key = dateKey(dt);
      const label = dayLabel(dt);
      if (!map.has(key)) map.set(key, { title: label, data: [] });
      map.get(key)?.data.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([_, v]) => v);
  }, [filteredByChips]);

  const resetFilters = useCallback(() => {
    setSelectedDayIndex(null);
    setSelectedTitles(new Set());
    setSelectedInstructors(new Set());
    setDurationFilter(null);
  }, []);

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

  const titleOptions = useMemo(() => Array.from(new Set(items.map(i => i.title).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);
  const instructorOptions = useMemo(() => Array.from(new Set(items.map(i => i.instructor).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Schedule</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => resetFilters()} style={styles.iconCircle} testID="reset-filters">
            <RotateCcw size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.iconCircle} testID="today-btn">
            <Calendar size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDatePickerOpen(true); setDateInput(''); }} style={styles.iconCircle} testID="open-date-picker">
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>📆</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={openCreate} style={styles.addBtn} testID="add-class-btn">
              <Plus color="#fff" size={18} />
              <Text style={styles.addBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Week strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip} contentContainerStyle={styles.weekStripContent} testID="week-strip">
        {allDays.map((d, idx) => {
          const isSelected = selectedDayIndex === idx;
          const label1 = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d);
          const label2 = new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(d);
          return (
            <TouchableOpacity key={idx} style={[styles.dayPill, isSelected && styles.dayPillSelected]} onPress={() => setSelectedDayIndex(idx)} testID={`day-${idx}`}>
              <Text style={[styles.dayPillText, isSelected && styles.dayPillTextSelected]}>{label1}</Text>
              <Text style={[styles.dayPillSub, isSelected && styles.dayPillTextSelected]}>{label2}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent} testID="filters">
        <TouchableOpacity
          onPress={() => resetFilters()}
          style={[styles.chip, styles.chipReset]}
          testID="chip-reset"
        >
          <Text style={[styles.chipText, styles.chipResetText]}>Reset All</Text>
        </TouchableOpacity>

        {titleOptions.map((t) => {
          const active = selectedTitles.has(t);
          return (
            <TouchableOpacity key={`t-${t}`} onPress={() => {
              const next = new Set(selectedTitles);
              if (active) next.delete(t); else next.add(t);
              setSelectedTitles(next);
            }} style={[styles.chip, active && styles.chipActive]} testID={`chip-title-${t}`}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}

        {instructorOptions.map((i) => {
          const active = selectedInstructors.has(i);
          return (
            <TouchableOpacity key={`i-${i}`} onPress={() => {
              const next = new Set(selectedInstructors);
              if (active) next.delete(i); else next.add(i);
              setSelectedInstructors(next);
            }} style={[styles.chip, active && styles.chipActive]} testID={`chip-instructor-${i}`}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{i}</Text>
            </TouchableOpacity>
          );
        })}

        {[45, 60, 75, 90].map((m) => {
          const active = durationFilter === m;
          return (
            <TouchableOpacity key={`d-${m}`} onPress={() => setDurationFilter(active ? null : m)} style={[styles.chip, active && styles.chipActive]} testID={`chip-duration-${m}`}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{m} min+</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && (
        <View style={styles.loading} testID="schedule-loading">
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading schedule…</Text>
          <View style={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View key={idx} style={styles.skeletonCard} />
            ))}
          </View>
        </View>
      )}

      {isError && (
        <View style={styles.error} testID="schedule-error">
          <Text style={styles.errorText}>Failed to load schedule</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <SectionList
          sections={sections.map(sec => ({ title: sec.title, data: sec.data }))}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader} testID={`header-${section.title}`}>
              <Text style={styles.sectionHeaderText}>{section.title} • {section.data.length} {section.data.length === 1 ? 'class' : 'classes'}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const c = item as ScheduleRow;
            const dur = durationMin(c.start_time, c.end_time);
            return (
              <View style={styles.card} testID={`class-card-${c.id}`}>
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
          }}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          testID="schedule-list"
          ListEmptyComponent={(
            <View style={styles.noClassesContainer} testID="no-classes">
              <Text style={styles.noClassesText}>No classes match your filters. Try changing the day or clearing filters.</Text>
            </View>
          )}
        />
      )}

      {(datePickerOpen) && (
        <View style={styles.modal} testID="date-picker-modal">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Go to date (YYYY-MM-DD)</Text>
            <TextInput
              placeholder="2025-08-27"
              value={dateInput}
              onChangeText={setDateInput}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              testID="date-input"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setDatePickerOpen(false)} style={[styles.modalBtn, styles.cancelBtn]} testID="cancel-date"><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateInput.trim());
                  if (!m) {
                    Alert.alert('Invalid date', 'Please use YYYY-MM-DD');
                    return;
                  }
                  const [y, mo, d] = dateInput.split('-').map((x) => Number(x));
                  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
                  if (isNaN(dt.getTime())) {
                    Alert.alert('Invalid date', 'Could not parse that date');
                    return;
                  }
                  setSelectedDate(dt);
                  setSelectedDayIndex(null);
                  setDatePickerOpen(false);
                }}
                style={[styles.modalBtn, styles.saveBtn]}
                testID="go-date"
              >
                <Text style={styles.saveText}>Go</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  iconCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  weekStrip: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  weekStripContent: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
  dayPill: { width: 56, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.colors.background },
  dayPillSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayPillText: { color: theme.colors.text, fontWeight: '600' },
  dayPillSub: { color: theme.colors.textSecondary, fontSize: 12 },
  dayPillTextSelected: { color: '#fff' },
  filters: { backgroundColor: theme.colors.surface },
  filtersContent: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  chipReset: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  chipResetText: { color: theme.colors.textSecondary },
  loading: { padding: theme.spacing.lg, alignItems: 'center' },
  loadingText: { marginTop: 8, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  skeletonList: { width: '100%', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  skeletonCard: { height: 78, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  error: { padding: theme.spacing.lg, alignItems: 'center' },
  errorText: { color: theme.colors.error, marginBottom: 8 },
  retryBtn: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },
  retryText: { color: theme.colors.text },
  listContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionHeader: { backgroundColor: theme.colors.surface, paddingVertical: 6, paddingHorizontal: theme.spacing.sm, borderRadius: theme.borderRadius.sm, marginBottom: 6 },
  sectionHeaderText: { color: theme.colors.textSecondary, fontWeight: '700' },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  instructor: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  noClassesContainer: { padding: theme.spacing.xl, alignItems: 'center' },
  noClassesText: { color: theme.colors.textSecondary, textAlign: 'center' },
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