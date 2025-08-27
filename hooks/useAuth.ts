import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Role = 'member'|'instructor'|'admin';
type Profile = { role: Role | null };

export function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        console.log('🔄 Starting auth bootstrap...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth session error:', error);
          setLoading(false);
          return;
        }
        
        if (!mounted) return;
        
        console.log('✅ Session loaded:', session ? 'User logged in' : 'No session');
        setSession(session);

        if (session) {
          try {
            const { data, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single<Profile>();
            
            if (profileError) {
              console.error('❌ Profile fetch error:', profileError);
              setRole('member'); // Default fallback
            } else {
              const userRole = (data?.role as Role) ?? 'member';
              console.log('✅ User role:', userRole);
              setRole(userRole);
            }
          } catch (profileErr) {
            console.error('❌ Profile fetch exception:', profileErr);
            setRole('member'); // Default fallback
          }
        } else {
          setRole(null);
        }
        
        setLoading(false);
        console.log('✅ Auth bootstrap complete');
      } catch (err) {
        console.error('❌ Auth bootstrap error:', err);
        setLoading(false);
      }
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('🔄 Auth state change:', event, s ? 'User present' : 'No user');
      setSession(s ?? null);
      
      if (s?.user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', s.user.id)
            .single<Profile>();
          
          if (error) {
            console.error('❌ Profile fetch error on auth change:', error);
            setRole('member');
          } else {
            setRole((data?.role as Role) ?? 'member');
          }
        } catch (err) {
          console.error('❌ Profile fetch exception on auth change:', err);
          setRole('member');
        }
      } else {
        setRole(null);
      }
    });

    return () => { 
      mounted = false; 
      sub.subscription.unsubscribe(); 
    };
  }, []);

  return { session, role, loading, isStaff: role === 'admin' };
}