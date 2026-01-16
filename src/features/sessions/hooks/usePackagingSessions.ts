import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PackagingSession, PackagingSessionStats } from '../types';
import { getPackagingSessions, getActivePackagingSessions } from '../services/sessions.service';

export function usePackagingSessions() {
  const [sessions, setSessions] = useState<PackagingSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<PackagingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const [activeResult, allResult] = await Promise.all([
      getActivePackagingSessions(),
      getPackagingSessions()
    ]);

    if (activeResult.error) {
      console.error('Error fetching active sessions:', activeResult.error);
    } else {
      setActiveSessions(activeResult.data || []);
    }

    if (allResult.error) {
      console.error('Error fetching sessions:', allResult.error);
    } else {
      setSessions(allResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();

    // Subscribe to packaging sessions changes
    const sessionsSubscription = supabase
      .channel('packaging_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packaging_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    // Subscribe to inventory_items changes to reflect reservation updates
    const inventorySubscription = supabase
      .channel('inventory_items_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory_items' }, () => {
        // Refetch sessions when inventory changes (may affect available packages)
        fetchSessions();
      })
      .subscribe();

    return () => {
      sessionsSubscription.unsubscribe();
      inventorySubscription.unsubscribe();
    };
  }, []);

  const stats: PackagingSessionStats = {
    activeSessions: activeSessions.length,
    completedToday: sessions.filter(s => s.session_date === new Date().toISOString().split('T')[0] && s.session_status === 'completed').length,
    avgUnitsPerHour: sessions.filter(s => s.session_status === 'completed' && s.units_per_hour).length > 0
      ? sessions.filter(s => s.session_status === 'completed').reduce((sum, s) => sum + (s.units_per_hour || 0), 0) / sessions.filter(s => s.session_status === 'completed' && s.units_per_hour).length
      : 0,
    totalUnitsToday: sessions
      .filter(s => s.session_date === new Date().toISOString().split('T')[0] && s.session_status === 'completed')
      .reduce((sum, s) => sum + (s.units_3_5g || 0) + (s.units_14g || 0) + (s.units_454g || 0), 0)
  };

  return {
    sessions,
    activeSessions,
    loading,
    stats,
    fetchSessions
  };
}
