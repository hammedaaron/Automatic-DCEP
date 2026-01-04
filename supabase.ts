
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, defaultValue: string) => {
  const win = window as any;
  const val = win.process?.env?.[key] || defaultValue;
  return val;
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://qfafrnedebyywisnhbmb.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'sb_publishable_YPahtxrQvXh2cmYivG8cSg_dse-4olx');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20, // Increased for smoother community updates
    },
  },
  db: {
    schema: 'public'
  }
});
