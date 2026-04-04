import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/data/clear - Clear all data except default currencies and main vault
export async function POST() {
  try {
    // Delete all transactions
    await db.transaction.deleteMany({});
    
    // Delete all debts
    await db.debt.deleteMany({});
    
    // Delete all accounts
    await db.account.deleteMany({});
    
    // Reset vault balances (keep structure but reset balances)
    await db.vault.updateMany({
      where: { isMain: false },
      data: { 
        balance: 0,
        openingBalance: 0,
      },
    });
    
    // Reset main vault balance
    await db.vault.updateMany({
      where: { isMain: true },
      data: { 
        balance: 0,
        openingBalance: 0,
      },
    });
    
    // Fetch remaining data
    const [currencies, vaults] = await Promise.all([
      db.currency.findMany({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      }),
      db.vault.findMany({
        include: { currency: true },
        orderBy: { currency: { isDefault: 'desc' } },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        currencies,
        vaults,
        message: 'تم مسح جميع البيانات بنجاح',
      },
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json({ success: false, error: 'فشل في مسح البيانات' }, { status: 500 });
  }
}
