import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Supabase Client Configuration
// 🔸 Uses NEXT_PUBLIC_ prefix so values are embedded in client bundle
// 🔸 Works on ALL devices after build - no local dependency
// 🔸 Graceful fallback if env vars are missing
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Log configuration status for debugging
if (typeof window !== 'undefined') {
  if (isSupabaseConfigured) {
    console.log('[Supabase] ✅ Configured:', supabaseUrl);
  } else {
    console.error('[Supabase] ❌ NOT configured - missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
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
