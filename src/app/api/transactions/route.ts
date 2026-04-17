import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/transactions - Get all transactions
export async function GET() {
  try {
    const transactions = await db.transaction.findMany({
      include: {
        account: true,
        currency: true,
        baseCurrency: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب الحركات' }, { status: 500 });
  }
}

// Helper function to calculate final balance
function calculateFinalBalance(
  amount: number,
  conversionFactor: number,
  conversionMethod: string,
  feesType: string,
  feesAmount: number,
  feesDirection: string
): number {
  let finalBalance = amount;
  
  // Apply conversion factor
  if (conversionMethod === 'MULTIPLY') {
    finalBalance = amount * conversionFactor;
  } else {
    finalBalance = amount / conversionFactor;
  }
  
  // Apply fees
  let feesDeduction = 0;
  if (feesAmount && feesAmount > 0) {
    switch (feesType) {
      case 'FIXED':
        feesDeduction = feesAmount;
        break;
      case 'PERCENTAGE':
        feesDeduction = (finalBalance * feesAmount) / 100;
        break;
      case 'PER_THOUSAND':
        feesDeduction = (finalBalance * feesAmount) / 1000;
        break;
    }
    
    if (feesDirection === 'INCOME') {
      finalBalance = finalBalance + feesDeduction;
    } else {
      finalBalance = finalBalance - feesDeduction;
    }
  }
  
  return finalBalance;
}

// POST /api/transactions - Create new transaction
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      currencyId,
      baseCurrencyId,
      type,
      paymentType,
      amount,
      conversionFactor,
      conversionMethod,
      feesType,
      feesDirection,
      feesAmount,
      description,
      date,
    } = body;
    
    if (!accountId || !currencyId || !amount || !date) {
      return NextResponse.json({ success: false, error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }
    
    const factor = conversionFactor || 1;
    const finalBalance = calculateFinalBalance(
      amount,
      factor,
      conversionMethod || 'MULTIPLY',
      feesType || 'FIXED',
      feesAmount || 0,
      feesDirection || 'INCOME'
    );
    
    // For CASH + INCOME (لنا), check if vault has sufficient balance
    // لنا + كاش = نعطي العميل المبلغ = خصم من الصندوق
    if (paymentType === 'CASH' && type === 'INCOME') {
      const vaultCurrencyId = baseCurrencyId || currencyId;
      const vault = await db.vault.findUnique({
        where: { currencyId: vaultCurrencyId },
        include: { currency: true },
      });
      
      if (vault) {
        const newBalance = vault.balance - amount;
        
        if (newBalance < 0) {
          return NextResponse.json({ 
            success: false, 
            error: `الرصيد غير كافٍ في صندوق ${vault.currency?.name || ''}. الرصيد الحالي: ${vault.balance} ${vault.currency?.symbol || ''}، المطلوب: ${amount} ${vault.currency?.symbol || ''}`,
            vaultBalance: vault.balance,
            requiredAmount: amount,
          }, { status: 400 });
        }
      }
    }
    
    const transaction = await db.transaction.create({
      data: {
        accountId,
        currencyId,
        baseCurrencyId: baseCurrencyId || null,
        type: type || 'INCOME',
        paymentType: paymentType || 'CASH',
        amount,
        conversionFactor: factor,
        conversionMethod: conversionMethod || 'MULTIPLY',
        feesType: feesType || 'FIXED',
        feesDirection: feesDirection || 'INCOME',
        feesAmount: feesAmount || 0,
        finalBalance,
        description,
        date: new Date(date),
      },
      include: {
        account: true,
        currency: true,
        baseCurrency: true,
      },
    });
    
    // Update vault balance ONLY for CASH transactions
    if (paymentType === 'CASH') {
      const vaultCurrencyId = baseCurrencyId || currencyId;
      const vault = await db.vault.findUnique({
        where: { currencyId: vaultCurrencyId },
      });
      
      if (vault) {
        // لنا = خصم من الصندوق (نعطي العميل)
        // علينا = إضافة للصندوق (نستلم من العميل)
        const newBalance = type === 'INCOME'
          ? vault.balance - amount  // خصم
          : vault.balance + amount;  // إضافة
        
        await db.vault.update({
          where: { id: vault.id },
          data: { balance: newBalance },
        });
      }
    }
    
    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ success: false, error: 'فشل في إنشاء الحركة' }, { status: 500 });
  }
}

// PUT /api/transactions - Update transaction
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الحركة مطلوب' }, { status: 400 });
    }
    
    // Get old transaction
    const oldTransaction = await db.transaction.findUnique({
      where: { id },
    });
    
    if (!oldTransaction) {
      return NextResponse.json({ success: false, error: 'الحركة غير موجودة' }, { status: 404 });
    }
    
    const body = await request.json();
    const {
      accountId,
      currencyId,
      baseCurrencyId,
      type,
      paymentType,
      amount,
      conversionFactor,
      conversionMethod,
      feesType,
      feesDirection,
      feesAmount,
      description,
      date,
    } = body;
    
    const factor = conversionFactor || 1;
    const finalBalance = calculateFinalBalance(
      amount,
      factor,
      conversionMethod || 'MULTIPLY',
      feesType || 'FIXED',
      feesAmount || 0,
      feesDirection || 'INCOME'
    );
    
    // For CASH + INCOME (لنا), check if vault has sufficient balance
    if (paymentType === 'CASH' && type === 'INCOME') {
      const vaultCurrencyId = baseCurrencyId || currencyId;
      const vault = await db.vault.findUnique({
        where: { currencyId: vaultCurrencyId },
      });
      
      if (vault) {
        // Calculate the effect of removing old transaction and adding new one
        let balanceAfterReverse = vault.balance;
        
        // Reverse old transaction effect if it was from same vault
        const oldVaultCurrencyId = oldTransaction.baseCurrencyId || oldTransaction.currencyId;
        if (oldVaultCurrencyId === vaultCurrencyId && oldTransaction.paymentType === 'CASH') {
          balanceAfterReverse = oldTransaction.type === 'INCOME'
            ? vault.balance + oldTransaction.amount  // reverse deduction
            : vault.balance - oldTransaction.amount;  // reverse addition
        }
        
        const newBalance = balanceAfterReverse - amount;
        
        if (newBalance < 0) {
          const currency = await db.currency.findUnique({ where: { id: vaultCurrencyId } });
          return NextResponse.json({ 
            success: false, 
            error: `الرصيد غير كافٍ في صندوق ${currency?.name || ''}. الرصيد المتاح: ${balanceAfterReverse} ${currency?.symbol || ''}، المطلوب: ${amount} ${currency?.symbol || ''}`,
          }, { status: 400 });
        }
      }
    }
    
    // Reverse old vault effect
    if (oldTransaction.paymentType === 'CASH') {
      const oldVaultCurrencyId = oldTransaction.baseCurrencyId || oldTransaction.currencyId;
      const oldVault = await db.vault.findUnique({
        where: { currencyId: oldVaultCurrencyId },
      });
      
      if (oldVault) {
        const reversedBalance = oldTransaction.type === 'INCOME'
          ? oldVault.balance + oldTransaction.amount  // reverse deduction
          : oldVault.balance - oldTransaction.amount;  // reverse addition
        
        await db.vault.update({
          where: { id: oldVault.id },
          data: { balance: reversedBalance },
        });
      }
    }
    
    // Update transaction
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        accountId,
        currencyId,
        baseCurrencyId: baseCurrencyId || null,
        type,
        paymentType,
        amount,
        conversionFactor: factor,
        conversionMethod,
        feesType,
        feesDirection,
        feesAmount,
        finalBalance,
        description,
        date: new Date(date),
      },
      include: {
        account: true,
        currency: true,
        baseCurrency: true,
      },
    });
    
    // Apply new vault effect
    if (paymentType === 'CASH') {
      const vaultCurrencyId = baseCurrencyId || currencyId;
      const vault = await db.vault.findUnique({
        where: { currencyId: vaultCurrencyId },
      });
      
      if (vault) {
        const newBalance = type === 'INCOME'
          ? vault.balance - amount  // خصم
          : vault.balance + amount;  // إضافة
        
        await db.vault.update({
          where: { id: vault.id },
          data: { balance: newBalance },
        });
      }
    }
    
    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ success: false, error: 'فشل في تحديث الحركة' }, { status: 500 });
  }
}

// DELETE /api/transactions - Delete transaction
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الحركة مطلوب' }, { status: 400 });
    }
    
    // Get transaction details before deletion
    const transaction = await db.transaction.findUnique({
      where: { id },
    });
    
    if (!transaction) {
      return NextResponse.json({ success: false, error: 'الحركة غير موجودة' }, { status: 404 });
    }
    
    // Reverse the vault balance ONLY if it was a CASH transaction
    if (transaction.paymentType === 'CASH') {
      const vaultCurrencyId = transaction.baseCurrencyId || transaction.currencyId;
      const vault = await db.vault.findUnique({
        where: { currencyId: vaultCurrencyId },
      });
      
      if (vault) {
        const newBalance = transaction.type === 'INCOME'
          ? vault.balance + transaction.amount  // reverse deduction
          : vault.balance - transaction.amount;  // reverse addition
        
        await db.vault.update({
          where: { id: vault.id },
          data: { balance: newBalance },
        });
      }
    }
    
    await db.transaction.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ success: false, error: 'فشل في حذف الحركة' }, { status: 500 });
  }
}
