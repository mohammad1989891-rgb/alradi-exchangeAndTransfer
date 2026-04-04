import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/statements - Get account statement
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const currencyId = searchParams.get('currencyId');
    
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'معرف الحساب مطلوب' }, { status: 400 });
    }
    
    // Get account details
    const account = await db.account.findUnique({
      where: { id: accountId },
    });
    
    if (!account) {
      return NextResponse.json({ success: false, error: 'الحساب غير موجود' }, { status: 404 });
    }
    
    // Get transactions for this account
    const transactions = await db.transaction.findMany({
      where: {
        accountId,
        ...(currencyId && { currencyId }),
      },
      include: {
        currency: true,
      },
      orderBy: { date: 'asc' },
    });
    
    // Get debts for this account
    const debts = await db.debt.findMany({
      where: {
        accountId,
        ...(currencyId && { currencyId }),
      },
      include: {
        currency: true,
      },
      orderBy: { date: 'asc' },
    });
    
    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = transactions.map(t => {
      if (t.type === 'INCOME') {
        runningBalance += t.finalBalance;
      } else {
        runningBalance -= t.finalBalance;
      }
      return { ...t, runningBalance };
    });
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.finalBalance, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.finalBalance, 0);
    
    const totalDebts = debts
      .filter(d => !d.isPaid)
      .reduce((sum, d) => sum + d.finalBalance, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        account,
        totalIncome,
        totalExpense,
        totalDebts,
        netBalance: totalIncome - totalExpense,
        transactions: transactionsWithBalance,
        debts,
      },
    });
  } catch (error) {
    console.error('Error fetching statement:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب كشف الحساب' }, { status: 500 });
  }
}
