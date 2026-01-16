import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getBuckingSessions, getActiveBuckingSessions } from '../services/sessions.service';
import type { BuckingSession, BuckingSessionStats } from '../types';

export function useBuckingSessions() {
  const [sessions, setSessions] = useState<BuckingSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<BuckingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    const subscription = supabase
      .channel('bucking_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucking_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchSessions = async () => {
    const [activeResult, allResult] = await Promise.all([
      getActiveBuckingSessions(),
      getBuckingSessions()
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

  const today = new Date().toISOString().split('T')[0];
  const completedToday = sessions.filter(s => s.session_date === today && s.session_status === 'completed');

  const stats: BuckingSessionStats = {
    activeSessions: activeSessions.length,
    completedToday: completedToday.length,
    avgKgPerHour: completedToday.length > 0
      ? completedToday.reduce((sum, s) => sum + (s.kg_per_hour || 0), 0) / completedToday.length
      : 0,
    totalFlowerToday: completedToday.reduce((sum, s) => sum + (s.bucked_flower_grams || 0), 0),
    totalSmallsToday: completedToday.reduce((sum, s) => sum + (s.bucked_smalls_grams || 0), 0),
    totalWasteToday: completedToday.reduce((sum, s) => sum + (s.waste_grams || 0), 0)
  };

  return {
    sessions,
    activeSessions,
    loading,
    stats,
    fetchSessions,
  };
}
