import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/currencies - Get all currencies
export async function GET() {
  try {
    const currencies = await db.currency.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
    return NextResponse.json({ success: true, data: currencies });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب العملات' }, { status: 500 });
  }
}

// POST /api/currencies - Create new currency
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, symbol } = body;
    
    if (!code || !name || !symbol) {
      return NextResponse.json({ success: false, error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }
    
    // Check if currency already exists
    const existing = await db.currency.findUnique({
      where: { code: code.toUpperCase() },
    });
    
    if (existing) {
      return NextResponse.json({ success: false, error: 'رمز العملة موجود مسبقاً' }, { status: 400 });
    }
    
    const currency = await db.currency.create({
      data: {
        code: code.toUpperCase(),
        name,
        symbol,
      },
    });
    
    // Create vault for the new currency
    await db.vault.create({
      data: {
        currencyId: currency.id,
        balance: 0,
      },
    });
    
    return NextResponse.json({ success: true, data: currency });
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json({ success: false, error: 'فشل في إنشاء العملة' }, { status: 500 });
  }
}

// DELETE /api/currencies - Delete currency
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف العملة مطلوب' }, { status: 400 });
    }
    
    // Check if it's the default currency
    const currency = await db.currency.findUnique({
      where: { id },
    });
    
    if (!currency) {
      return NextResponse.json({ success: false, error: 'العملة غير موجودة' }, { status: 404 });
    }
    
    if (currency.isDefault) {
      return NextResponse.json({ success: false, error: 'لا يمكن حذف العملة الافتراضية' }, { status: 400 });
    }
    
    // Delete vault first (cascade)
    await db.vault.deleteMany({
      where: { currencyId: id },
    });
    
    // Delete the currency (soft delete by setting isActive to false)
    await db.currency.update({
      where: { id },
      data: { isActive: false },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting currency:', error);
    return NextResponse.json({ success: false, error: 'فشل في حذف العملة' }, { status: 500 });
  }
}
