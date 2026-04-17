import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { action?: string };
    const action = body.action;

    if (action === 'complete') {
      await db.transaction.update({
        where: { id },
        data: { status: 'completed' },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'cancel') {
      await db.transaction.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Remittance PUT error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
