import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyDigest } from '../types';

export function useDailyDigest(date: string) {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksRes, attendanceRes, annotationsRes, sprayRes, feedingRes, mortalityRes] =
        await Promise.all([
          supabase
            .from('daily_task_instances')
            .select('*')
            .eq('task_date', date)
            .eq('status', 'completed')
            .limit(100),
          supabase
            .from('daily_attendance')
            .select('*')
            .eq('attendance_date', date)
            .limit(100),
          supabase
            .from('daily_log_annotations')
            .select('*')
            .eq('annotation_date', date)
            .limit(100),
          supabase
            .from('ipm_spray_log')
            .select('*')
            .gte('applied_at', dayStart)
            .lte('applied_at', dayEnd)
            .limit(100),
          supabase
            .from('feeding_log')
            .select('*')
            .gte('fed_at', dayStart)
            .lte('fed_at', dayEnd)
            .limit(100),
          supabase
            .from('plant_mortality_log')
            .select('*')
            .eq('mortality_date', date)
            .limit(100),
        ]);

      const firstError =
        tasksRes.error ?? attendanceRes.error ?? annotationsRes.error ??
        sprayRes.error ?? feedingRes.error ?? mortalityRes.error;
      if (firstError) throw firstError;

      setDigest({
        date,
        completedTasks: tasksRes.data ?? [],
        attendance: attendanceRes.data ?? [],
        annotations: annotationsRes.data ?? [],
        sprayLogs: sprayRes.data ?? [],
        feedingLogs: feedingRes.data ?? [],
        mortalityLogs: mortalityRes.data ?? [],
      } as DailyDigest);
    } catch {
      setError('Failed to load daily digest');
    } finally {
      setLoading(false);
    }
  }, [date, dayStart, dayEnd]);

  useEffect(() => {
    load();
  }, [load]);

  return { digest, loading, error, refetch: load };
}
