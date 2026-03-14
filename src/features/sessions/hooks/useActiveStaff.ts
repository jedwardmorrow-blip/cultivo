import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ActiveStaffMember {
  id: string;
  first_name: string;
  last_name: string | null;
  role: string | null;
  department: string | null;
}

/**
 * Hook to fetch active staff members for session assignment dropdowns.
 * Replaces hardcoded AVAILABLE_TRIMMERS / AVAILABLE_BUCKERS / AVAILABLE_PACKAGERS arrays.
 *
 * Returns active staff sorted by first_name, along with a helper to
 * build a display label like "Laura S." or just "Laura".
 */
export function useActiveStaff() {
  const [staff, setStaff] = useState<ActiveStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, role, department')
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        console.error('Failed to fetch active staff:', error);
        setStaff([]);
        return;
      }

      setStaff((data ?? []) as ActiveStaffMember[]);
    } catch (err) {
      console.error('Error fetching active staff:', err);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /** Build display name: "Laura S." or just "Laura" if no last name */
  const getDisplayName = (member: ActiveStaffMember): string => {
    if (member.last_name) {
      return `${member.first_name} ${member.last_name.charAt(0)}.`;
    }
    return member.first_name;
  };

  return { staff, loading, fetchStaff, getDisplayName };
}
