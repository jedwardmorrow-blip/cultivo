import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyLogAnnotation, CreateAnnotationInput, UpdateAnnotationInput } from '../types';

export function useAnnotations(annotationDate: string, roomId?: string) {
  const [annotations, setAnnotations] = useState<DailyLogAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('daily_log_annotations')
        .select('*')
        .eq('annotation_date', annotationDate)
        .order('created_at', { ascending: false });

      if (roomId) query = query.eq('room_id', roomId);

      const { data, error: err } = await query;
      if (err) throw err;
      setAnnotations((data ?? []) as DailyLogAnnotation[]);
    } catch {
      setError('Failed to load annotations');
    } finally {
      setLoading(false);
    }
  }, [annotationDate, roomId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createAnnotation(input: CreateAnnotationInput): Promise<DailyLogAnnotation> {
    const payload = { ...input, annotation_date: input.annotation_date ?? annotationDate };
    const { data, error: err } = await supabase
      .from('daily_log_annotations')
      .insert(payload)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyLogAnnotation;
  }

  async function updateAnnotation(id: string, input: UpdateAnnotationInput): Promise<DailyLogAnnotation> {
    const { data, error: err } = await supabase
      .from('daily_log_annotations')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyLogAnnotation;
  }

  async function deleteAnnotation(id: string): Promise<void> {
    const { error: err } = await supabase
      .from('daily_log_annotations')
      .delete()
      .eq('id', id);
    if (err) throw err;
    await load();
  }

  return { annotations, loading, error, refetch: load, createAnnotation, updateAnnotation, deleteAnnotation };
}
