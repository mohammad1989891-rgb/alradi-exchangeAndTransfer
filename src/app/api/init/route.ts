import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/init - Initialize and get all data
export async function GET() {
  try {
    const [currencies, vaults, accounts, transactions, debts] = await Promise.all([
      db.currency.findMany({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      }),
      db.vault.findMany({
        include: { currency: true },
        orderBy: { currency: { isDefault: 'desc' } },
      }),
      db.account.findMany({
        include: {
          _count: {
            select: {
              transactions: true,
              debts: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.transaction.findMany({
        include: { account: true, currency: true },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      db.debt.findMany({
        include: { account: true, currency: true },
        orderBy: { date: 'desc' },
        take: 100,
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        currencies,
        vaults,
        accounts,
        transactions,
        debts,
      },
    });
  } catch (error) {
    console.error('Error initializing data:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحميل البيانات' }, { status: 500 });
  }
}
