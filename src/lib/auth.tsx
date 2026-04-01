import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getSiteUrl } from './utils';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Buffer before actual expiry to trigger a proactive refresh (5 minutes) */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

  /**
   * Check if the current session is expired or about to expire,
   * and proactively refresh it. This handles background tabs and
   * laptop sleep where the SDK's auto-refresh timer gets throttled.
   */
  const ensureValidSession = useCallback(async () => {
    if (refreshingRef.current) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now() + REFRESH_BUFFER_MS) {
        refreshingRef.current = true;
        console.log('[Auth] Token expiring soon or expired, refreshing...');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[Auth] Token refresh failed:', error.message);
          // Session is truly dead — clear state so user sees login screen
          setUser(null);
          setProfile(null);
        } else if (data.session?.user) {
          console.log('[Auth] Token refreshed successfully');
          setUser(data.session.user);
        }
        refreshingRef.current = false;
      }
    } catch (err) {
      console.error('[Auth] Session check error:', err);
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // --- Initial session load ---
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 < Date.now() + REFRESH_BUFFER_MS) {
          const { data } = await supabase.auth.refreshSession();
          if (data.session?.user) {
            setUser(data.session.user);
            fetchProfile(data.session.user.id);
            return;
          }
        }
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // --- Auth state change listener ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed via SDK');
      }
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // --- Visibility change handler ---
    // When the tab comes back from background or laptop wakes from sleep,
    // check if the token is still valid and refresh if needed.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ensureValidSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- Focus handler (belt-and-suspenders with visibilitychange) ---
    const handleFocus = () => {
      ensureValidSession();
    };
    window.addEventListener('focus', handleFocus);

    // --- Periodic check every 4 minutes ---
    // Catches edge cases where the tab stays visible but timers drifted
    const intervalId = setInterval(ensureValidSession, 4 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [ensureValidSession]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
        emailRedirectTo: undefined,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // If signOut fails because token is already expired (403),
      // clear local state anyway so the user can re-authenticate
      console.warn('[Auth] signOut error (clearing local state anyway):', error);
    }
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isSales: profile?.role === 'sales',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
