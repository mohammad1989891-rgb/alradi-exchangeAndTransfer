import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounts - Get all accounts
export async function GET() {
  try {
    const accounts = await db.account.findMany({
      include: {
        _count: {
          select: {
            transactions: true,
            debts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب الحسابات' }, { status: 500 });
  }
}

// POST /api/accounts - Create new account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, description } = body;
    
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الحساب مطلوب' }, { status: 400 });
    }
    
    const account = await db.account.create({
      data: {
        name,
        type: type || 'PRIVATE',
        description,
      },
      include: {
        _count: {
          select: {
            transactions: true,
            debts: true,
          },
        },
      },
    });
    
    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ success: false, error: 'فشل في إنشاء الحساب' }, { status: 500 });
  }
}

// PUT /api/accounts - Update account
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, type, description, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الحساب مطلوب' }, { status: 400 });
    }
    
    const account = await db.account.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        _count: {
          select: {
            transactions: true,
            debts: true,
          },
        },
      },
    });
    
    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحديث الحساب' }, { status: 500 });
  }
}

// DELETE /api/accounts - Delete account
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الحساب مطلوب' }, { status: 400 });
    }
    
    await db.account.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ success: false, error: 'فشل في حذف الحساب' }, { status: 500 });
  }
}
