import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getActiveSessionCounts } from '../services/dashboard.service';

export function ActiveProductionSessions() {
  const [trimSessions, setTrimSessions] = useState(0);
  const [packagingSessions, setPackagingSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();

    const channel = supabase
      .channel('active-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trim_sessions' }, loadSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packaging_sessions' }, loadSessions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadSessions() {
    try {
      const { data } = await getActiveSessionCounts();
      if (data) {
        setTrimSessions(data.trimSessions);
        setPackagingSessions(data.packagingSessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-cult-text-muted">Loading production sessions...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-cult-text-primary uppercase tracking-wide mb-4">Active Production Sessions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-cult-black p-4 border border-cult-border">
          <p className="text-cult-text-muted text-sm uppercase tracking-wider">Trim Sessions</p>
          <p className="text-3xl font-bold text-cult-text-primary mt-2">{trimSessions}</p>
        </div>
        <div className="bg-cult-black p-4 border border-cult-border">
          <p className="text-cult-text-muted text-sm uppercase tracking-wider">Packaging Sessions</p>
          <p className="text-3xl font-bold text-cult-text-primary mt-2">{packagingSessions}</p>
        </div>
      </div>
    </div>
  );
}
