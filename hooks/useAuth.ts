import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Role = 'member' | 'instructor' | 'admin';

type Profile = { role: Role | null };

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

export function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => {
          console.warn(`⏱️ ${label} timed out after ${ms}ms`);
          reject(new Error(`${label} timeout`));
        }, ms);
        p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
      });
    };

    const bootstrap = async () => {
      try {
        console.log('🔄 Starting auth bootstrap...');
        const { data: { session }, error } = await withTimeout(supabase.auth.getSession(), 10000, 'getSession');

        if (error) {
          console.error('❌ Auth session error:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        console.log('✅ Session loaded:', session ? 'User logged in' : 'No session');
        setSession(session);

        if (session) {
          try {
            await withTimeout(loadRole(session.user.id), 8000, 'loadRole');
          } catch (e) {
            console.warn('⚠️ loadRole failed, defaulting to member');
            setRole('member');
          }
        } else {
          setRole(null);
        }

        setLoading(false);
        console.log('✅ Auth bootstrap complete');
      } catch (err) {
        console.error('❌ Auth bootstrap error:', err);
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      console.log('🔄 Auth state change:', _event, s ? 'User present' : 'No user');
      setSession(s ?? null);

      if (s?.user) {
        try {
          await loadRole(s.user.id);
        } catch (e) {
          console.warn('⚠️ loadRole on state change failed');
        }
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      try {
        sub.subscription.unsubscribe();
      } catch {}
    };
  }, []);

  const loadRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single<Profile>();

      if (error) {
        console.warn('⚠️ Profile missing, defaulting role to member', error);
        setRole('member');
        return;
      }

      const userRole = (data?.role as Role) ?? 'member';
      console.log('✅ User role:', userRole);
      setRole(userRole);
    } catch (e) {
      console.error('❌ Role load exception:', e);
      setRole('member');
    }
  };

  const user = useMemo<AppUser | null>(() => {
    const u = session?.user;
    if (!u) return null;
    const name = (u.user_metadata?.name as string | undefined) ?? (u.user_metadata?.full_name as string | undefined) ?? (u.email?.split('@')[0] ?? 'Member');
    return { id: u.id, email: u.email ?? '', name };
  }, [session]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('❌ Login error:', error);
        return false;
      }
      setSession(data.session);
      if (data.session?.user?.id) await loadRole(data.session.user.id);
      return true;
    } catch (e) {
      console.error('❌ Login exception:', e);
      return false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    consentMarketing: boolean,
    acceptTerms: boolean,
    signWaiver: boolean,
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, phone, consentMarketing, acceptTerms, signWaiver } },
      });
      if (error) {
        console.error('❌ Signup error:', error);
        return false;
      }

      const uid = data.user?.id;
      if (uid) {
        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert({ id: uid, role: 'member' as Role })
          .eq('id', uid);
        if (upsertErr) console.warn('⚠️ Profile upsert warning:', upsertErr);
      }

      setSession(data.session ?? null);
      if (uid) await loadRole(uid);
      return true;
    } catch (e) {
      console.error('❌ Signup exception:', e);
      return false;
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout error:', error);
        return false;
      }
      setSession(null);
      setRole(null);
      return true;
    } catch (e) {
      console.error('❌ Logout exception:', e);
      return false;
    }
  };

  return { session, user, role, loading, isStaff: role === 'admin', login, signup, logout };
}