import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface WorkerStaff {
  id: string;
  first_name: string;
  last_name: string | null;
  department: string | null;
  role: string | null;
}

interface WorkerAuthContextType {
  staff: WorkerStaff | null;
  loading: boolean;
  error: string | null;
  loginWithPin: (pin: string) => Promise<WorkerStaff>;
  logout: () => void;
}

const STORAGE_KEY = 'cultops_worker_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface StoredSession {
  staffId: string;
  staffName: string;
  timestamp: number;
}

const WorkerAuthContext = createContext<WorkerAuthContextType | undefined>(undefined);

export function WorkerAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<WorkerStaff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const session: StoredSession = JSON.parse(stored);
      const elapsed = Date.now() - session.timestamp;
      if (elapsed > SESSION_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
        return;
      }

      // Re-fetch staff record to ensure it's still active
      supabase
        .from('staff')
        .select('id, first_name, last_name, department, role')
        .eq('id', session.staffId)
        .eq('is_active', true)
        .single()
        .then(({ data, error: fetchError }) => {
          if (fetchError || !data) {
            localStorage.removeItem(STORAGE_KEY);
          } else {
            setStaff(data);
          }
          setLoading(false);
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
    }
  }, []);

  const loginWithPin = useCallback(async (pin: string): Promise<WorkerStaff> => {
    setError(null);

    const trimmed = pin.trim();
    if (!/^[0-9]{4,6}$/.test(trimmed)) {
      const err = 'PIN must be 4-6 digits';
      setError(err);
      throw new Error(err);
    }

    const { data, error: fetchError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, department, role')
      .eq('pin_code', trimmed)
      .eq('is_active', true)
      .single();

    if (fetchError || !data) {
      const err = 'Invalid PIN. Try again or ask your manager.';
      setError(err);
      throw new Error(err);
    }

    const worker: WorkerStaff = data;
    setStaff(worker);

    // Persist to localStorage
    const session: StoredSession = {
      staffId: worker.id,
      staffName: worker.first_name,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    return worker;
  }, []);

  const logout = useCallback(() => {
    setStaff(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WorkerAuthContext.Provider value={{ staff, loading, error, loginWithPin, logout }}>
      {children}
    </WorkerAuthContext.Provider>
  );
}

export function useWorkerAuth() {
  const ctx = useContext(WorkerAuthContext);
  if (!ctx) throw new Error('useWorkerAuth must be used within WorkerAuthProvider');
  return ctx;
}
