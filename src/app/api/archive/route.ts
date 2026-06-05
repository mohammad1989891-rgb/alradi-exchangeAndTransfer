import { NextResponse } from 'next/server';
import { autoArchiveOldRecords, getArchivedCounts, archiveRecords, unarchiveRecords } from '@/lib/supabaseDb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table, ids, monthsThreshold } = body;
    
    switch (action) {
      case 'auto-archive': {
        const result = await autoArchiveOldRecords(monthsThreshold || 6);
        return NextResponse.json({ success: true, ...result });
      }
      case 'archive': {
        if (!table || !ids || !Array.isArray(ids)) {
          return NextResponse.json({ success: false, error: 'table and ids required' }, { status: 400 });
        }
        await archiveRecords(table, ids);
        return NextResponse.json({ success: true });
      }
      case 'unarchive': {
        if (!table || !ids || !Array.isArray(ids)) {
          return NextResponse.json({ success: false, error: 'table and ids required' }, { status: 400 });
        }
        await unarchiveRecords(table, ids);
        return NextResponse.json({ success: true });
      }
      case 'counts': {
        const counts = await getArchivedCounts();
        return NextResponse.json({ success: true, counts });
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
