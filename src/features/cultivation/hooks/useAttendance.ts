import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTableSubscription } from '@/shared/hooks/useTableSubscription';
import type { DailyAttendance, UpsertAttendanceInput } from '../types';

export function useAttendance(date: string) {
  const [records, setRecords] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('attendance_date', date)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setRecords((data ?? []) as DailyAttendance[]);
    } catch {
      setError('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates — refetch when attendance changes (debounced 500ms)
  useTableSubscription('daily_attendance', load);

  async function upsertAttendance(input: UpsertAttendanceInput): Promise<DailyAttendance> {
    const { data, error: err } = await supabase
      .from('daily_attendance')
      .upsert(input, { onConflict: 'staff_id,attendance_date' })
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyAttendance;
  }

  return { records, loading, error, refetch: load, upsertAttendance };
}
