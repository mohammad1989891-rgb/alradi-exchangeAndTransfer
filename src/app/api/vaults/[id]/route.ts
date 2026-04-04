import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/vaults/[id] - Update vault fields (like conversionFactorToMain, conversionMethod)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updateData: Record<string, unknown> = {};
    
    if (body.conversionFactorToMain !== undefined) {
      updateData.conversionFactorToMain = body.conversionFactorToMain;
    }
    if (body.conversionMethod !== undefined) {
      updateData.conversionMethod = body.conversionMethod;
    }
    if (body.balance !== undefined) {
      updateData.balance = body.balance;
    }
    if (body.openingBalance !== undefined) {
      updateData.openingBalance = body.openingBalance;
    }
    if (body.isMain !== undefined) {
      updateData.isMain = body.isMain;
    }
    
    const vault = await db.vault.update({
      where: { id },
      data: updateData,
      include: { currency: true },
    });
    
    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    console.error('Error updating vault:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحديث الصندوق' }, { status: 500 });
  }
}

// GET /api/vaults/[id] - Get single vault
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const vault = await db.vault.findUnique({
      where: { id },
      include: { currency: true },
    });
    
    if (!vault) {
      return NextResponse.json({ success: false, error: 'الصندوق غير موجود' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    console.error('Error fetching vault:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب الصندوق' }, { status: 500 });
  }
}
