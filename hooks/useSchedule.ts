import { useState, useMemo, useCallback } from 'react';
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

async function fetchSchedule(): Promise<ScheduleRow[]> {
  console.log('[useSchedule] fetchSchedule called');
  const { data, error } = await supabase
    .from('Schedule')
    .select('id, title, instructor, start_time, end_time, capacity')
    .order('start_time', { ascending: true });
  if (error) {
    console.error('[useSchedule] fetchSchedule error', error);
    throw error;
  }
  return data ?? [];
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

export function useSchedule() {
  const qc = useQueryClient();
  const [search, setSearch] = useState<string>('');

  const query = useQuery({
    queryKey: ['schedule'],
    queryFn: fetchSchedule,
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
  };
}
