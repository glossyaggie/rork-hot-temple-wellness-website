import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ujenpxsmooeineiznjvx.supabase.co';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZW5weHNtb29laW5laXpuanZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzczODksImV4cCI6MjA3MTgxMzM4OX0.-mNB_mjPEjP33wxDlptHyO02h88K8FP7OxI52btsw2A';

if (!url || !anon) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});