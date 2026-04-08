import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveStaff } from '@/features/sessions/hooks/useActiveStaff';
import type { DriverAssignment } from '../constants';

export function useDriverAssignments(monthStart: string, monthEnd: string) {
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const { staff } = useActiveStaff();

  const staffMap = new Map(staff.map((s) => [s.id, s.display_name || s.first_name || 'Unknown']));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_driver_assignments')
        .select('id, delivery_date, staff_id, zone_id, notes')
        .gte('delivery_date', monthStart)
        .lte('delivery_date', monthEnd);

      if (error) throw error;

      setAssignments(
        (data || []).map((row) => ({
          id: row.id,
          deliveryDate: row.delivery_date,
          staffId: row.staff_id,
          staffName: staffMap.get(row.staff_id) || 'Unknown',
          zoneId: row.zone_id,
          notes: row.notes,
        })),
      );
    } catch (err) {
      console.error('useDriverAssignments error:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, staffMap]);

  useEffect(() => {
    if (monthStart && monthEnd) load();
  }, [monthStart, monthEnd, load]);

  const assignDriver = useCallback(
    async (date: string, staffId: string, zoneId?: string) => {
      const { error } = await supabase
        .from('delivery_driver_assignments')
        .upsert(
          { delivery_date: date, staff_id: staffId, zone_id: zoneId || null },
          { onConflict: 'delivery_date,staff_id' },
        );

      if (error) {
        console.error('Failed to assign driver:', error);
        return;
      }
      await load();
    },
    [load],
  );

  const removeAssignment = useCallback(
    async (id: string) => {
      await supabase.from('delivery_driver_assignments').delete().eq('id', id);
      await load();
    },
    [load],
  );

  const getDriverForDate = useCallback(
    (date: string): DriverAssignment | null => {
      return assignments.find((a) => a.deliveryDate === date) || null;
    },
    [assignments],
  );

  return {
    assignments,
    loading,
    assignDriver,
    removeAssignment,
    getDriverForDate,
    staff,
    reload: load,
  };
}
