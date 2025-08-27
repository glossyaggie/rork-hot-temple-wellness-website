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
}

export interface ScheduleQueryParams {
  startIso?: string;
  endIso?: string;
  titles?: string[];
  instructors?: string[];
  hidePast?: boolean;
}

async function fetchSchedule(params: ScheduleQueryParams): Promise<ScheduleRow[]> {
  console.log('[useSchedule] fetchSchedule called', params);
  let q = supabase
    .from('Schedule')
    .select('id, title, instructor, start_time, end_time, capacity');

  if (params.startIso) q = q.gte('start_time', params.startIso);
  if (params.endIso) q = q.lt('start_time', params.endIso);
  if (params.titles && params.titles.length > 0) q = q.in('title', params.titles);
  if (params.instructors && params.instructors.length > 0) q = q.in('instructor', params.instructors);

  // Primary sort by start_time ASC, then title ASC for stability
  q = q.order('start_time', { ascending: true }).order('title', { ascending: true });

  const { data, error } = await q;
  if (error) {
    console.error('[useSchedule] fetchSchedule error', error);
    throw error;
  }
  let rows = (data ?? []) as ScheduleRow[];

  if (params.hidePast) {
    const now = Date.now();
    rows = rows.filter(r => new Date(r.start_time).getTime() >= now);
  }

  return rows;
}

async function insertSchedule(row: Omit<ScheduleRow, 'id'>): Promise<ScheduleRow> {
  console.log('[useSchedule] insertSchedule', row);
  const { data, error } = await supabase
    .from('Schedule')
    .insert(row)
    .select('id, title, instructor, start_time, end_time, capacity')
    .single();
  if (error) throw error;
  return data as ScheduleRow;
}

async function updateSchedule(id: number, patch: Partial<Omit<ScheduleRow, 'id'>>): Promise<ScheduleRow> {
  console.log('[useSchedule] updateSchedule', id, patch);
  const { data, error } = await supabase
    .from('Schedule')
    .update(patch)
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
