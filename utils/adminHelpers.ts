import { supabase } from '@/lib/supabase';

export const promoteUserToAdmin = async (email: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);
      
    if (error) throw error;
    console.log('✅ User promoted to admin:', email);
    return true;
  } catch (error) {
    console.error('Error promoting user:', error);
    return false;
  }
};

export const promoteUserToInstructor = async (email: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        role: 'instructor',
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);
      
    if (error) throw error;
    console.log('✅ User promoted to instructor:', email);
    return true;
  } catch (error) {
    console.error('Error promoting user:', error);
    return false;
  }
};

export const demoteUserToMember = async (email: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        role: 'member',
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);
      
    if (error) throw error;
    console.log('✅ User demoted to member:', email);
    return true;
  } catch (error) {
    console.error('Error demoting user:', error);
    return false;
  }
};