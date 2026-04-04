import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/debts - Get all debts
export async function GET() {
  try {
    const debts = await db.debt.findMany({
      include: {
        account: true,
        currency: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ success: true, data: debts });
  } catch (error) {
    console.error('Error fetching debts:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب الديون' }, { status: 500 });
  }
}

// POST /api/debts - Create new debt
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      currencyId,
      amount,
      conversionFactor,
      conversionMethod,
      description,
      date,
    } = body;
    
    if (!accountId || !currencyId || !amount || !date) {
      return NextResponse.json({ success: false, error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }
    
    // Calculate final balance
    let finalBalance = amount;
    
    if (conversionMethod === 'MULTIPLY') {
      finalBalance = amount * (conversionFactor || 1);
    } else {
      finalBalance = amount / (conversionFactor || 1);
    }
    
    const debt = await db.debt.create({
      data: {
        accountId,
        currencyId,
        amount,
        conversionFactor: conversionFactor || 1,
        conversionMethod: conversionMethod || 'MULTIPLY',
        finalBalance,
        description,
        date: new Date(date),
      },
      include: {
        account: true,
        currency: true,
      },
    });
    
    return NextResponse.json({ success: true, data: debt });
  } catch (error) {
    console.error('Error creating debt:', error);
    return NextResponse.json({ success: false, error: 'فشل في إنشاء الدين' }, { status: 500 });
  }
}

// PUT /api/debts - Mark debt as paid
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, isPaid } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الدين مطلوب' }, { status: 400 });
    }
    
    const debt = await db.debt.update({
      where: { id },
      data: {
        isPaid,
        paidAt: isPaid ? new Date() : null,
      },
      include: {
        account: true,
        currency: true,
      },
    });
    
    return NextResponse.json({ success: true, data: debt });
  } catch (error) {
    console.error('Error updating debt:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحديث الدين' }, { status: 500 });
  }
}

// DELETE /api/debts - Delete debt
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الدين مطلوب' }, { status: 400 });
    }
    
    await db.debt.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting debt:', error);
    return NextResponse.json({ success: false, error: 'فشل في حذف الدين' }, { status: 500 });
  }
}
