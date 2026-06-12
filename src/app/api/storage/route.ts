import { NextResponse } from 'next/server';

// ============================================
// Storage Management API (Lightweight)
// 🔸 Returns basic configuration data only
// 🔸 Detailed storage analysis is done client-side
//    (in StorageDashboard component using already-loaded data)
// 🔸 This avoids server crashes from many sequential Supabase queries
// ============================================

const STORAGE_LIMIT_MB = 500;

export async function GET() {
  try {
    // Return configuration only — actual data is computed client-side
    // from data already loaded in the useSupabaseData hook
    return NextResponse.json({
      storageLimitMB: STORAGE_LIMIT_MB,
      message: 'Storage data is computed client-side for performance',
    });
  } catch (error) {
    console.error('[Storage API] Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحليل التخزين' },
      { status: 500 }
    );
  }
}
