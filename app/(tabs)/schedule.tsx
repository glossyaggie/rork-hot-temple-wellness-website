import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, SectionList, Pressable, Platform } from 'react-native';
import { Clock, Users, Pencil, Plus, Trash2, Calendar, RotateCcw, ChevronDown } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSchedule, ScheduleRow } from '@/hooks/useSchedule';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

function fmtTimeLabel(raw: string): string {
  return raw ?? '';
}

function minutesBetween(start: string, end: string): number {
  const toMin = (s: string) => {
    const parts = s.trim().split(' ');
    const t = parts[0] ?? '';
    const ampm = (parts[1] ?? '').toUpperCase();
    const hm = t.split(':');
    const h = Number(hm[0] ?? 0);
    const m = Number(hm[1] ?? 0);
    let hh = h;
    if (ampm === 'PM' && hh !== 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return hh * 60 + m;
  };
  return toMin(end) - toMin(start);
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

function formatHeaderFromDateKey(key: string): string {
  const [y, m, d] = key.split('-').map((x) => Number(x));
  const dt = new Date(y, (m - 1), d);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dt);
  const day = new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(dt);
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(dt);
  return `${weekday}, ${day} ${month}`;
}

export default function ScheduleScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null); // 0..6 or null for whole week
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set<string>());
  const [selectedInstructors, setSelectedInstructors] = useState<Set<string>>(new Set<string>());
  const [durationFilter, setDurationFilter] = useState<number | null>(null); // minutes

  const weekStart = useMemo(() => startOfWeekISO(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeekISO(selectedDate), [selectedDate]);

  const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const from = `${yyyy}-${mm}-${dd}`;
const toDate = new Date(today);
toDate.setDate(today.getDate() + 14);
const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;
const { items, isLoading, isError, refetch, add, update, remove, creating, updating } = useSchedule({ from, to });

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
    const key = dateKey(day);
    return items.filter(r => r.date === key);
  }, [items, selectedDayIndex, allDays]);

  const filteredByChips = useMemo(() => {
    let list = filteredByDay;
    if (selectedTitles.size) list = list.filter(r => r.title && selectedTitles.has(r.title));
    if (selectedInstructors.size) list = list.filter(r => r.instructor && selectedInstructors.has(r.instructor));
    if (durationFilter) list = list.filter(r => minutesBetween(r.start_time, r.end_time) >= durationFilter);

    return list.slice().sort((a, b) => {
      const at = a.start_time;
      const bt = b.start_time;
      if (at !== bt) return at < bt ? -1 : 1;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [filteredByDay, selectedTitles, selectedInstructors, durationFilter, selectedDayIndex]);

  const sections = useMemo(() => {
    const map = new Map<string, { title: string; data: ScheduleRow[] }>();
    filteredByChips.forEach(r => {
      const key = r.date;
      const label = formatHeaderFromDateKey(key);
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
    setDraft({ title: '', instructor: '', start_time: '6:00 AM', end_time: '7:00 AM', capacity: '' });
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
      // require date selection for create/edit
      const selectedKey = selectedDayIndex !== null ? dateKey(allDays[selectedDayIndex]) : dateKey(selectedDate);
      const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(selectedKey));
      const payload = { title: draft.title, instructor: draft.instructor, date: selectedKey, day: dayName, start_time: draft.start_time, end_time: draft.end_time, capacity: draft.capacity ? Number(draft.capacity) : null } as const;
      if (modalOpenId && modalOpenId !== 0) {
        await update({ id: modalOpenId, patch: payload });
      } else {
        await add(payload as any);
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
    <SafeAreaView edges={['top']} style={[styles.container, { paddingTop: insets.top + 8 }] }>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'light'} />
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
            <Pressable key={idx} onPress={() => setSelectedDayIndex(idx)} testID={`day-${idx}`} style={[styles.dayChip, isSelected ? styles.dayChipSelected : styles.dayChipUnselected]}>
              <Text style={[styles.dayChipLabel, isSelected && styles.dayChipLabelSelected]}>{label1}</Text>
              <Text style={[styles.dayChipSub, isSelected && styles.dayChipSubSelected]}>{label2}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Compact filter row */}
      <View style={styles.filters} testID="filters">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity
            onPress={() => resetFilters()}
            style={[styles.pillBtn, styles.pillReset]}
            testID="btn-reset"
          >
            <RotateCcw size={14} color={theme.colors.textSecondary} />
            <Text style={styles.pillText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFiltersOpen(true)}
            style={styles.pillBtn}
            testID="btn-open-filters"
          >
            <Text style={styles.pillText}>Filters</Text>
            <ChevronDown size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {[...selectedTitles].slice(0, 3).map((t) => (
            <View key={`at-${t}`} style={[styles.pillBtn, styles.pillActive]}>
              <Text style={[styles.pillText, styles.pillTextActive]}>{t}</Text>
            </View>
          ))}
          {[...selectedInstructors].slice(0, 2).map((i) => (
            <View key={`ai-${i}`} style={[styles.pillBtn, styles.pillActive]}>
              <Text style={[styles.pillText, styles.pillTextActive]}>{i}</Text>
            </View>
          ))}
          {durationFilter ? (
            <View style={[styles.pillBtn, styles.pillActive]}>
              <Text style={[styles.pillText, styles.pillTextActive]}>{durationFilter}m+</Text>
            </View>
          ) : null}
        </ScrollView>

        {filtersOpen && (
          <View style={styles.bottomSheetOverlay}>
            <Pressable style={styles.bottomSheetBackdrop} onPress={() => setFiltersOpen(false)} />
            <View style={styles.bottomSheet} testID="filters-bottom-sheet">
              <ScrollView contentContainerStyle={styles.bottomSheetContent}>
                <Text style={styles.sheetSectionTitle}>Class Type</Text>
                <View style={styles.sheetChipsRow}>
                  {titleOptions.map((t) => {
                    const active = selectedTitles.has(t);
                    return (
                      <TouchableOpacity key={`t-${t}`} onPress={() => {
                        const next = new Set(selectedTitles);
                        if (active) next.delete(t); else next.add(t);
                        setSelectedTitles(next);
                      }} style={[styles.sheetChip, active && styles.sheetChipActive]} testID={`sheet-title-${t}`}>
                        <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.sheetSectionTitle, { marginTop: 12 }]}>Instructor</Text>
                <View style={styles.sheetChipsRow}>
                  {instructorOptions.map((i) => {
                    const active = selectedInstructors.has(i);
                    return (
                      <TouchableOpacity key={`i-${i}`} onPress={() => {
                        const next = new Set(selectedInstructors);
                        if (active) next.delete(i); else next.add(i);
                        setSelectedInstructors(next);
                      }} style={[styles.sheetChip, active && styles.sheetChipActive]} testID={`sheet-instructor-${i}`}>
                        <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>{i}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.sheetSectionTitle, { marginTop: 12 }]}>Duration</Text>
                <View style={styles.sheetChipsRow}>
                  {[45,60,75,90].map((m) => {
                    const active = durationFilter === m;
                    return (
                      <TouchableOpacity key={`d-${m}`} onPress={() => setDurationFilter(active ? null : m)} style={[styles.sheetChip, active && styles.sheetChipActive]} testID={`sheet-duration-${m}`}>
                        <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>{m}m+</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.sheetActions}>
                  <TouchableOpacity onPress={resetFilters} style={[styles.sheetBtn, styles.sheetBtnSecondary]} testID="sheet-reset">
                    <Text style={styles.sheetBtnSecondaryText}>Reset All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFiltersOpen(false)} style={[styles.sheetBtn, styles.sheetBtnPrimary]} testID="sheet-apply">
                    <Text style={styles.sheetBtnPrimaryText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>

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
            const dur = minutesBetween(c.start_time, c.end_time);
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
                    <Text style={styles.metaText}>{fmtTimeLabel(c.start_time)} - {fmtTimeLabel(c.end_time)} • {dur} min</Text>
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
          getItemLayout={(data, index) => {
            const ITEM_HEIGHT = 112;
            const HEADER_HEIGHT = 36;
            const itemsBefore = index;
            const length = ITEM_HEIGHT;
            const offset = HEADER_HEIGHT + itemsBefore * ITEM_HEIGHT;
            return { length, offset, index };
          }}
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
            <TextInput placeholder="Start Time (e.g., 6:00 PM)" value={draft.start_time} onChangeText={(t) => setDraft({ ...draft, start_time: t })} style={styles.input} autoCapitalize="none" testID="input-start" />
            <TextInput placeholder="End Time (e.g., 7:00 PM)" value={draft.end_time} onChangeText={(t) => setDraft({ ...draft, end_time: t })} style={styles.input} autoCapitalize="none" testID="input-end" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  weekStrip: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  weekStripContent: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
  dayChip: { width: 72, height: 96, borderRadius: 20, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayChipUnselected: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  dayChipSelected: { backgroundColor: '#ff5a5f', borderColor: '#ff5a5f' },
  dayChipLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  dayChipSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  dayChipLabelSelected: { color: '#FFFFFF' },
  dayChipSubSelected: { color: '#FFFFFF' },
  filters: { backgroundColor: theme.colors.surface },
  filtersContent: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm, alignItems: 'center' },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  pillReset: { backgroundColor: theme.colors.surface },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { color: theme.colors.textSecondary, fontSize: 12 },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  bottomSheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000 },
  bottomSheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' },
  bottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingBottom: 16 },
  bottomSheetContent: { paddingHorizontal: theme.spacing.lg, paddingTop: 12, paddingBottom: 8 },
  sheetSectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  sheetChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  sheetChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  sheetChipText: { color: theme.colors.textSecondary, fontSize: 12 },
  sheetChipTextActive: { color: '#fff', fontWeight: '700' },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  sheetBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  sheetBtnSecondary: { marginRight: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  sheetBtnPrimary: { marginLeft: 8, backgroundColor: theme.colors.primary },
  sheetBtnSecondaryText: { color: theme.colors.text },
  sheetBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  loading: { padding: theme.spacing.lg, alignItems: 'center' },
  loadingText: { marginTop: 8, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  skeletonList: { width: '100%', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  skeletonCard: { height: 78, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  error: { padding: theme.spacing.lg, alignItems: 'center' },
  errorText: { color: theme.colors.error, marginBottom: 8 },
  retryBtn: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },
  retryText: { color: theme.colors.text },
  listContent: { padding: theme.spacing.md, gap: theme.spacing.md },
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