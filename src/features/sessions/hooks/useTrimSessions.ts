import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { TrimSession, TrimSessionStats} from '../types';
import { getTrimSessions, getActiveTrimSessions } from '../services/sessions.service';

export function useTrimSessions() {
  const [sessions, setSessions] = useState<TrimSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<TrimSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    const subscription = supabase
      .channel('trim_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trim_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchSessions = async () => {
    const [activeResult, allResult] = await Promise.all([
      getActiveTrimSessions(),
      getTrimSessions()
    ]);

    if (activeResult.data) {
      setActiveSessions(activeResult.data.filter((s) => s.session_status === 'active') || []);
    }

    if (allResult.data) {
      setSessions(allResult.data.filter((s) => s.session_status === 'completed').slice(0, 50) || []);
    }

    setLoading(false);
  };

  const stats: TrimSessionStats = {
    activeSessions: activeSessions.length,
    completedToday: sessions.filter(s =>
      s.session_date === new Date().toISOString().split('T')[0] &&
      s.session_status === 'completed'
    ).length,
    avgGramsPerHour: sessions.filter(s => s.session_status === 'completed' && s.grams_per_hour).length > 0
      ? sessions.filter(s => s.session_status === 'completed').reduce((sum, s) => sum + (s.grams_per_hour || 0), 0) /
        sessions.filter(s => s.session_status === 'completed' && s.grams_per_hour).length
      : 0,
    totalFlowerToday: sessions
      .filter(s =>
        s.session_date === new Date().toISOString().split('T')[0] &&
        s.session_status === 'completed'
      )
      .reduce((sum, s) => sum + (s.big_buds_grams || 0), 0)
  };

  return {
    sessions,
    activeSessions,
    loading,
    stats,
    fetchSessions,
  };
}
