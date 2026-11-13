import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://btchfwzycgisperjgwqo.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_-2J6Es2-4Q0ySP3Upw2ibQ_TWaH_dsA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

export const REALTIME_CHANNEL_NAME = 'redlion_menusync_realtime_v1';
export const BROADCAST_CHANNEL_NAME = 'redlion_local_bus_v1';

