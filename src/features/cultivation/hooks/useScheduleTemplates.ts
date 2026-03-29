import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TaskType } from '../types';

export interface TemplateScheduleItem {
  task_type: TaskType;
  recurrence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number[];
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  schedules: TemplateScheduleItem[];
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  room_type: string;
  schedules: TemplateScheduleItem[];
  is_default?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  room_type?: string;
  schedules?: TemplateScheduleItem[];
  is_default?: boolean;
}

export function useScheduleTemplates(roomType?: string) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('room_schedule_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (roomType) {
        query = query.eq('room_type', roomType);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setTemplates((data ?? []) as ScheduleTemplate[]);
    } catch {
      setError('Failed to load schedule templates');
    } finally {
      setLoading(false);
    }
  }, [roomType]);

  useEffect(() => {
    load();
  }, [load]);

  async function createTemplate(input: CreateTemplateInput): Promise<ScheduleTemplate> {
    const { data, error: err } = await supabase
      .from('room_schedule_templates')
      .insert({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as ScheduleTemplate;
  }

  async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<ScheduleTemplate> {
    const { data, error: err } = await supabase
      .from('room_schedule_templates')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as ScheduleTemplate;
  }

  async function deleteTemplate(id: string): Promise<void> {
    const { error: err } = await supabase
      .from('room_schedule_templates')
      .delete()
      .eq('id', id);
    if (err) throw err;
    await load();
  }

  /** Apply a template to a room — creates schedule entries from the template */
  async function applyTemplate(templateId: string, roomId: string, startDate: string): Promise<void> {
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const inserts = template.schedules.map((s) => ({
      room_id: roomId,
      task_type: s.task_type,
      recurrence: s.recurrence,
      day_of_week: s.day_of_week ?? null,
      start_date: startDate,
      priority: s.priority,
      notes: s.notes ?? null,
      scope: 'full_room',
      is_active: true,
    }));

    const { error: err } = await supabase
      .from('room_task_schedules')
      .insert(inserts);
    if (err) throw err;
  }

  /** Save current room schedules as a new template */
  async function saveAsTemplate(
    name: string,
    description: string | null,
    roomType: string,
    roomSchedules: { task_type: TaskType; recurrence: string; day_of_week?: number[] | null; priority: string; notes?: string | null }[]
  ): Promise<ScheduleTemplate> {
    const scheduleItems: TemplateScheduleItem[] = roomSchedules.map((s) => ({
      task_type: s.task_type,
      recurrence: s.recurrence as TemplateScheduleItem['recurrence'],
      day_of_week: s.day_of_week ?? undefined,
      priority: (s.priority || 'medium') as TemplateScheduleItem['priority'],
      notes: s.notes ?? undefined,
    }));

    return createTemplate({ name, description, room_type: roomType, schedules: scheduleItems });
  }

  return {
    templates,
    loading,
    error,
    refetch: load,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    saveAsTemplate,
  };
}
