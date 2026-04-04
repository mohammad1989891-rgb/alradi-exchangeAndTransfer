import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/vaults - Get all vaults with currency info
export async function GET() {
  try {
    const vaults = await db.vault.findMany({
      include: {
        currency: true,
      },
      orderBy: {
        currency: { isDefault: 'desc' },
      },
    });
    return NextResponse.json({ success: true, data: vaults });
  } catch (error) {
    console.error('Error fetching vaults:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب الأرصدة' }, { status: 500 });
  }
}

// PUT /api/vaults - Update vault balance
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { currencyId, balance } = body;
    
    if (!currencyId || balance === undefined) {
      return NextResponse.json({ success: false, error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }
    
    const vault = await db.vault.update({
      where: { currencyId },
      data: { balance },
      include: { currency: true },
    });
    
    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    console.error('Error updating vault:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحديث الرصيد' }, { status: 500 });
  }
}
