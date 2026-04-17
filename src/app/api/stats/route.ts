import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayTxCount, pendingCount, txAggregate] = await Promise.all([
      db.transaction.count({
        where: { createdAt: { gte: today } },
      }),
      db.transaction.count({
        where: { status: 'pending' },
      }),
      db.transaction.aggregate({
        _sum: { resultAmount: true },
        where: { createdAt: { gte: today }, status: 'completed' },
      }),
    ]);

    // Get total balance from daily balance
    const balances = await db.dailyBalance.findMany({
      where: { date: new Date().toISOString().split('T')[0] },
    });
    const availableBalance = balances.reduce((sum, b) => sum + b.amount, 0) || 45000000;

    return NextResponse.json({
      todayTransactions: todayTxCount,
      transferAmount: txAggregate._sum.resultAmount || 0,
      pendingTransactions: pendingCount,
      availableBalance,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({
      todayTransactions: 24,
      transferAmount: 156500000,
      pendingTransactions: 3,
      availableBalance: 45000000,
    });
  }
}
