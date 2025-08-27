import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ScheduleRow {
  id: number;
  title: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  duration_min?: number;
}

interface ScheduleViewRow {
  id: number;
  title: string;
  instructor: string;
  capacity: number | null;
  start_local: string;
  end_local: string;
  local_date?: string; // YYYY-MM-DD
  duration_min?: number;
}

export interface ScheduleQueryParams {
  titles?: string[];
  instructors?: string[];
}

async function fetchSchedule(params: ScheduleQueryParams): Promise<ScheduleRow[]> {
  console.log('[useSchedule] fetchSchedule called', params);
  let q = supabase
    .from('schedule_view')
    .select('id, title, instructor, capacity, start_local, end_local, local_date, duration_min');

  if (params.titles && params.titles.length > 0) q = q.in('title', params.titles);
  if (params.instructors && params.instructors.length > 0) q = q.in('instructor', params.instructors);

  q = q.order('start_local', { ascending: true }).order('title', { ascending: true });

  const { data, error } = await q;
  if (error) {
    console.error('[useSchedule] fetchSchedule error', error);
    throw error;
  }
  const rows = (data ?? []) as unknown as ScheduleViewRow[];
  // Map view rows to ScheduleRow shape expected by UI: use local times directly
  const mapped: ScheduleRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    instructor: r.instructor,
    start_time: r.start_local,
    end_time: r.end_local,
    capacity: r.capacity ?? null,
    duration_min: r.duration_min,
  }));
  return mapped;
}

async function insertSchedule(row: Omit<ScheduleRow, 'id'>): Promise<ScheduleRow> {
  console.log('[useSchedule] insertSchedule', row);
  const { data, error } = await supabase
    .from('Schedule')
    .insert({
      title: row.title,
      instructor: row.instructor,
      start_time: row.start_time,
      end_time: row.end_time,
      capacity: row.capacity,
    })
    .select('id, title, instructor, start_time, end_time, capacity')
    .single();
  if (error) throw error;
  return data as ScheduleRow;
}

async function updateSchedule(id: number, patch: Partial<Omit<ScheduleRow, 'id'>>): Promise<ScheduleRow> {
  console.log('[useSchedule] updateSchedule', id, patch);
  const { data, error } = await supabase
    .from('Schedule')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.instructor !== undefined ? { instructor: patch.instructor } : {}),
      ...(patch.start_time !== undefined ? { start_time: patch.start_time } : {}),
      ...(patch.end_time !== undefined ? { end_time: patch.end_time } : {}),
      ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
    })
    .eq('id', id)
    .select('id, title, instructor, start_time, end_time, capacity')
    .single();
  if (error) throw error;
  return data as ScheduleRow;
}

async function deleteSchedule(id: number): Promise<void> {
  console.log('[useSchedule] deleteSchedule', id);
  const { error } = await supabase
    .from('Schedule')
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
