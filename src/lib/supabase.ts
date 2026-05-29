import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Supabase Client Configuration
// 🔸 Uses NEXT_PUBLIC_ prefix so values are embedded in client bundle
// 🔸 Works on ALL devices after build - no local dependency
// 🔸 Graceful fallback if env vars are missing
// 🔸 Hardcoded defaults as last resort (for Vercel deployment without env vars)
// ============================================

// Hardcoded defaults — these are PUBLIC values (anon key is safe to expose)
// They serve as fallback when env vars are not set (e.g., on Vercel without config)
const HARDCODED_SUPABASE_URL = 'https://hdlpvtuplwthqcksaynt.supabase.co';
const HARDCODED_SUPABASE_ANON_KEY = 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_SUPABASE_ANON_KEY;

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Log configuration status for debugging — detailed for cross-device troubleshooting
if (typeof window !== 'undefined') {
  if (isSupabaseConfigured) {
    console.log('[Supabase] ✅ Client configured successfully');
    console.log('[Supabase] 🔗 URL:', supabaseUrl);
    console.log('[Supabase] 🔑 Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');
  } else {
    console.error('[Supabase] ❌ NOT configured - missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('[Supabase] 🔗 URL value:', supabaseUrl || '(empty)');
    console.error('[Supabase] 🔑 Anon Key value:', supabaseAnonKey ? 'present' : '(empty)');
    console.error('[Supabase] 💡 Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('[Supabase] 💡 On Vercel: add these in Settings → Environment Variables');
  }
}

// Create the Supabase client - use placeholder if not configured
// This prevents crashes while still allowing the app to load
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public',
    },
  }
);

// Service role client for admin operations (server-side only)
// Service role key must be set via env var — it's a secret and cannot be hardcoded
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient = (isSupabaseConfigured && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      db: {
        schema: 'public',
      },
    })
  : supabase;

export default supabase;
