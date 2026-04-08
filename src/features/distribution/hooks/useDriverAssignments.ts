import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getActiveDrivers } from '@/features/delivery/services/tripPlan.service';
import type { DeliveryDriver } from '@/types';
import type { DriverAssignment } from '../constants';

export function useDriverAssignments(monthStart: string, monthEnd: string) {
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(false);

  // Load delivery drivers (from settings, same list as manifests)
  useEffect(() => {
    getActiveDrivers().then(setDrivers).catch(() => setDrivers([]));
  }, []);

  const driverNameMap = new Map(drivers.map((d) => [d.id, `${d.first_name} ${d.last_name}`.trim()]));

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
          staffName: driverNameMap.get(row.staff_id) || 'Unknown',
          zoneId: row.zone_id,
          notes: row.notes,
        })),
      );
    } catch (err) {
      console.error('useDriverAssignments error:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, driverNameMap]);

  useEffect(() => {
    if (monthStart && monthEnd && drivers.length > 0) load();
  }, [monthStart, monthEnd, load, drivers.length]);

  const assignDriver = useCallback(
    async (date: string, staffId: string, zoneId?: string) => {
      // If no staffId, remove the assignment
      if (!staffId) {
        const existing = assignments.find(
          (a) => a.deliveryDate === date && a.zoneId === (zoneId || null),
        );
        if (existing) {
          await supabase.from('delivery_driver_assignments').delete().eq('id', existing.id);
          await load();
        }
        return;
      }

      // Use zone_id as the conflict key — handle null zones with delete+insert
      const effectiveZone = zoneId || null;

      // Delete any existing assignment for this date+zone first, then insert
      // (avoids null unique constraint issues)
      const { data: existing } = await supabase
        .from('delivery_driver_assignments')
        .select('id')
        .eq('delivery_date', date)
        .is('zone_id', effectiveZone ? undefined as any : null);

      // More reliable: filter with eq if zone exists, is-null if not
      let deleteQuery = supabase
        .from('delivery_driver_assignments')
        .delete()
        .eq('delivery_date', date);

      if (effectiveZone) {
        deleteQuery = deleteQuery.eq('zone_id', effectiveZone);
      } else {
        deleteQuery = deleteQuery.is('zone_id', null);
      }
      await deleteQuery;

      // Insert new
      const { error } = await supabase.from('delivery_driver_assignments').insert({
        delivery_date: date,
        staff_id: staffId,
        zone_id: effectiveZone,
      });

      if (error) {
        console.error('Failed to assign driver:', error);
        return;
      }
      await load();
    },
    [load, assignments],
  );

  const removeAssignment = useCallback(
    async (id: string) => {
      await supabase.from('delivery_driver_assignments').delete().eq('id', id);
      await load();
    },
    [load],
  );

  const getDriversForDate = useCallback(
    (date: string): DriverAssignment[] => {
      return assignments.filter((a) => a.deliveryDate === date);
    },
    [assignments],
  );

  const getDriverForZone = useCallback(
    (date: string, zoneId: string): DriverAssignment | null => {
      return assignments.find((a) => a.deliveryDate === date && a.zoneId === zoneId) || null;
    },
    [assignments],
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
    getDriversForDate,
    getDriverForZone,
    drivers, // The delivery_drivers list (for dropdowns)
    reload: load,
  };
}
