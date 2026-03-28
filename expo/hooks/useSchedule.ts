import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ScheduleRow {
  id: number;
  title: string;
  instructor: string;
  date: string; // 'YYYY-MM-DD'
  day: string; // 'Monday', etc.
  start_time: string; // 'H:MM AM/PM'
  end_time: string;   // 'H:MM AM/PM'
  capacity: number | null;
}

export interface ScheduleQueryParams {
  titles?: string[];
  instructors?: string[];
  from?: string; // 'YYYY-MM-DD'
  to?: string;   // 'YYYY-MM-DD'
}

async function fetchSchedule(params: ScheduleQueryParams): Promise<ScheduleRow[]> {
  console.log('[useSchedule] fetchSchedule called', params);
  let q = supabase
    .from('class_schedule')
    .select('id, title, instructor, date, day, start_time, end_time, capacity');

  if (params.from) q = q.gte('date', params.from);
  if (params.to) q = q.lte('date', params.to);
  if (params.titles && params.titles.length > 0) q = q.in('title', params.titles);
  if (params.instructors && params.instructors.length > 0) q = q.in('instructor', params.instructors);

  q = q.order('date', { ascending: true }).order('start_time', { ascending: true });

  const { data, error } = await q;
  if (error) {
    console.error('[useSchedule] fetchSchedule error', error);
    throw error;
  }
  const rows = (data ?? []) as unknown as ScheduleRow[];
  return rows;
}

async function insertSchedule(row: Omit<ScheduleRow, 'id'>): Promise<ScheduleRow> {
  console.log('[useSchedule] insertSchedule', row);
  const { data, error } = await supabase
    .from('class_schedule')
    .insert({
      title: row.title,
      instructor: row.instructor,
      date: row.date,
      day: row.day,
      start_time: row.start_time,
      end_time: row.end_time,
      capacity: row.capacity,
    })
    .select('id, title, instructor, date, day, start_time, end_time, capacity')
    .single();
  if (error) throw error;
  return data as ScheduleRow;
}

async function updateSchedule(id: number, patch: Partial<Omit<ScheduleRow, 'id'>>): Promise<ScheduleRow> {
  console.log('[useSchedule] updateSchedule', id, patch);
  const { data, error } = await supabase
    .from('class_schedule')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.instructor !== undefined ? { instructor: patch.instructor } : {}),
      ...(patch.date !== undefined ? { date: patch.date } : {}),
      ...(patch.day !== undefined ? { day: patch.day } : {}),
      ...(patch.start_time !== undefined ? { start_time: patch.start_time } : {}),
      ...(patch.end_time !== undefined ? { end_time: patch.end_time } : {}),
      ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
    })
    .eq('id', id)
    .select('id, title, instructor, date, day, start_time, end_time, capacity')
    .single();
  if (error) throw error;
  return data as ScheduleRow;
}

async function deleteSchedule(id: number): Promise<void> {
  console.log('[useSchedule] deleteSchedule', id);
  const { error } = await supabase
    .from('class_schedule')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export function useSchedule(params: ScheduleQueryParams = {}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState<string>('');

  const query = useQuery({
    queryKey: ['schedule', params],
    queryFn: () => fetchSchedule(params),
  });

  const addMutation = useMutation({
    mutationFn: insertSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Omit<ScheduleRow, 'id'>> }) => updateSchedule(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const filtered = useMemo(() => {
    const list = query.data ?? [];
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((r) =>
      (r.title?.toLowerCase().includes(term) ?? false) ||
      (r.instructor?.toLowerCase().includes(term) ?? false)
    );
  }, [query.data, search]);

  const distinctTitles = useMemo(() => {
    const set = new Set<string>();
    (query.data ?? []).forEach(r => { if (r.title) set.add(r.title); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [query.data]);

  const distinctInstructors = useMemo(() => {
    const set = new Set<string>();
    (query.data ?? []).forEach(r => { if (r.instructor) set.add(r.instructor); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [query.data]);

  return {
    ...query,
    items: filtered,
    rawItems: query.data ?? [],
    search,
    setSearch,
    add: addMutation.mutateAsync,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    creating: addMutation.isPending,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    distinctTitles,
    distinctInstructors,
  };
}
