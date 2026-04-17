import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/vaults/opening-balance - Update vault opening balance
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { currencyId, openingBalance } = body;
    
    if (!currencyId || openingBalance === undefined) {
      return NextResponse.json({ success: false, error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }
    
    // Get the current vault
    const currentVault = await db.vault.findUnique({
      where: { currencyId },
      include: { currency: true },
    });
    
    if (!currentVault) {
      return NextResponse.json({ success: false, error: 'الصندوق غير موجود' }, { status: 404 });
    }
    
    // Calculate the difference between old and new opening balance
    const oldOpeningBalance = currentVault.openingBalance || 0;
    const difference = openingBalance - oldOpeningBalance;
    
    // Update the vault with new opening balance and adjusted balance
    const vault = await db.vault.update({
      where: { currencyId },
      data: { 
        openingBalance,
        balance: currentVault.balance + difference,
      },
      include: { currency: true },
    });
    
    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    console.error('Error updating opening balance:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحديث رصيد أول المدة' }, { status: 500 });
  }
}
