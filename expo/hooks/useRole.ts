import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Role = 'member' | 'instructor' | 'admin';

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        setRole(null); 
        setLoading(false); 
        return; 
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      setRole((data?.role as Role) ?? 'member');
      setLoading(false);
    };
    
    load();
    
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      (async () => {
        if (!s?.user) { 
          setRole(null); 
          return; 
        }
        
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', s.user.id)
          .single();
          
        setRole((data?.role as Role) ?? 'member');
      })();
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  return { 
    role, 
    loading, 
    isStaff: role === 'admin' || role === 'instructor',
    isAdmin: role === 'admin'
  };
}