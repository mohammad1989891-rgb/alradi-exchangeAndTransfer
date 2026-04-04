'use client';

import { useState, useMemo, Fragment } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Printer, TrendingUp, TrendingDown, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Coins, CreditCard, FileText 
} from 'lucide-react';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/format';
import type { Transaction, Debt, DebtPayment, Currency } from '@/lib/localDb';

export function AccountStatementModal() {
  const { 
    isAccountStatementOpen, 
    closeAccountStatement, 
    accounts, 
    currencies, 
    selectedAccountForStatement 
  } = useAppStore();
  
  const { transactions, debts, debtPayments } = useLocalData();
  
  // Determine initial selected account using useMemo
  const defaultAccountId = useMemo(() => {
    if (selectedAccountForStatement) {
      return selectedAccountForStatement.id;
    }
    return accounts.length > 0 ? accounts[0].id : '';
  }, [selectedAccountForStatement, accounts]);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId);
  
  // Filter data for selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return transactions.filter(t => t.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);
  
  const accountDebts = useMemo(() => {
    if (!selectedAccountId) return [];
    return debts.filter(d => d.accountId === selectedAccountId);
  }, [debts, selectedAccountId]);
  
  // Group transactions by currency
  const transactionsByCurrency = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    
    for (const tx of accountTransactions) {
      const currencyId = tx.currencyId;
      if (!grouped[currencyId]) {
        grouped[currencyId] = [];
      }
      grouped[currencyId].push(tx);
    }
    
    // Sort each group by date
    for (const currencyId in grouped) {
      grouped[currencyId].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    return grouped;
  }, [accountTransactions]);
  
  // Calculate totals per currency
  const currencyStats = useMemo(() => {
    const stats: Record<string, {
      currency: Currency | undefined;
      totalIncome: number;
      totalExpense: number;
      netBalance: number;
      transactions: (Transaction & { runningBalance: number })[];
    }> = {};
    
    for (const currencyId in transactionsByCurrency) {
      const currency = currencies.find(c => c.id === currencyId);
      const txs = transactionsByCurrency[currencyId];
      
      let totalIncome = 0;
      let totalExpense = 0;
      let runningBalance = 0;
      
      const txsWithBalance = txs.map(tx => {
        if (tx.type === 'INCOME') {
          totalIncome += tx.finalBalance;
          runningBalance += tx.finalBalance;
        } else {
          totalExpense += tx.finalBalance;
          runningBalance -= tx.finalBalance;
        }
        return { ...tx, runningBalance };
      });
      
      stats[currencyId] = {
        currency,
        totalIncome,
        totalExpense,
        netBalance: runningBalance,
        transactions: txsWithBalance,
      };
    }
    
    return stats;
  }, [transactionsByCurrency, currencies]);
  
  // Group debts by currency
  const debtsByCurrency = useMemo(() => {
    const grouped: Record<string, Debt[]> = {};
    
    for (const debt of accountDebts) {
      const currencyId = debt.currencyId;
      if (!grouped[currencyId]) {
        grouped[currencyId] = [];
      }
      grouped[currencyId].push(debt);
    }
    
    // Sort each group by date
    for (const currencyId in grouped) {
      grouped[currencyId].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return grouped;
  }, [accountDebts]);
  
  // Calculate debt totals per currency with payments
  const debtStats = useMemo(() => {
    const stats: Record<string, {
      currency: Currency | undefined;
      totalDebt: number;
      paidDebt: number;
      unpaidDebt: number;
      debts: Debt[];
      // إضافة بيانات الدفعات
      paymentsByDebt: Record<string, DebtPayment[]>;
      // حساب الرصيد المتبقي لكل دين
      remainingByDebt: Record<string, number>;
    }> = {};

    for (const currencyId in debtsByCurrency) {
      const currency = currencies.find(c => c.id === currencyId);
      const currencyDebts = debtsByCurrency[currencyId];

      // حساب الدفعات لكل دين
      const paymentsByDebt: Record<string, DebtPayment[]> = {};
      const remainingByDebt: Record<string, number> = {};

      let totalDebt = 0;
      let totalPaid = 0;

      for (const debt of currencyDebts) {
        // جلب الدفعات المرتبطة بهذا الدين
        const debtPaymentsList = debtPayments.filter(p => p.debtId === debt.id);
        paymentsByDebt[debt.id] = debtPaymentsList;

        // حساب إجمالي المدفوع لهذا الدين
        const paidAmount = debtPaymentsList.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, debt.finalBalance - paidAmount);

        remainingByDebt[debt.id] = remaining;
        totalDebt += debt.finalBalance;
        totalPaid += paidAmount;
      }

      stats[currencyId] = {
        currency,
        totalDebt,
        paidDebt: totalPaid,
        unpaidDebt: totalDebt - totalPaid,
        debts: currencyDebts,
        paymentsByDebt,
        remainingByDebt,
      };
    }

    return stats;
  }, [debtsByCurrency, currencies, debtPayments]);
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  
  const handlePrint = () => {
    const printContent = document.getElementById('print-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>دفتر الأستاذ - ${selectedAccount?.name || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 20px;
            direction: rtl;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          
          .currency-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .currency-title {
            background: #f5f5f5;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .currency-title h3 { font-size: 16px; }
          .currency-title .net { font-weight: bold; }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
          }
          .summary-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }
          .summary-card .label { font-size: 12px; color: #666; }
          .summary-card .value { font-size: 16px; font-weight: bold; margin-top: 5px; }
          .income { color: #16a34a; }
          .expense { color: #dc2626; }
          .debt { color: #d97706; }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: right;
          }
          th {
            background: #f5f5f5;
            font-weight: bold;
            font-size: 12px;
          }
          td { font-size: 12px; }
          .income-row { background: #f0fdf4; }
          .expense-row { background: #fef2f2; }
          .debt-row { background: #fffbeb; }
          
          .debt-section {
            margin-top: 30px;
            page-break-inside: avoid;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          
          @media print {
            body { padding: 10px; }
            .currency-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>دفتر الأستاذ</h1>
          <p>الحساب: ${selectedAccount?.name || ''}</p>
          <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        
        ${Object.entries(currencyStats).map(([currencyId, stat]) => `
          <div class="currency-section">
            <div class="currency-title">
              <h3>${stat.currency?.name || ''} (${stat.currency?.symbol || ''})</h3>
              <span class="net ${stat.netBalance >= 0 ? 'income' : 'expense'}">
                الصافي: ${formatNumber(stat.netBalance)} ${stat.currency?.symbol || ''}
              </span>
            </div>
            
            <div class="summary-grid">
              <div class="summary-card">
                <div class="label">لنا</div>
                <div class="value income">${formatNumber(stat.totalIncome)}</div>
              </div>
              <div class="summary-card">
                <div class="label">علينا</div>
                <div class="value expense">${formatNumber(stat.totalExpense)}</div>
              </div>
              <div class="summary-card">
                <div class="label">الرصيد</div>
                <div class="value ${stat.netBalance >= 0 ? 'income' : 'expense'}">${formatNumber(stat.netBalance)}</div>
              </div>
            </div>
            
            ${stat.transactions.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>الدفع</th>
                    <th>المبلغ</th>
                    <th>الرصيد التراكمي</th>
                    <th>البيان</th>
                  </tr>
                </thead>
                <tbody>
                  ${stat.transactions.map(t => `
                    <tr class="${t.type === 'INCOME' ? 'income-row' : 'expense-row'}">
                      <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                      <td>${t.type === 'INCOME' ? 'لنا' : 'علينا'}</td>
                      <td>${t.paymentType === 'CASH' ? 'كاش' : 'آجل'}</td>
                      <td class="${t.type === 'INCOME' ? 'income' : 'expense'}">
                        ${t.type === 'INCOME' ? '+' : '-'}${formatNumber(t.finalBalance)}
                      </td>
                      <td>${formatNumber(t.runningBalance)}</td>
                      <td>${t.description || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="text-align: center; color: #999;">لا توجد حركات</p>'}
          </div>
        `).join('')}
        
        ${Object.keys(debtStats).length > 0 ? `
          <div class="debt-section">
            <h2 style="margin-bottom: 15px; padding: 10px; background: #fffbeb; border-radius: 8px;">
              الديون
            </h2>
            
            ${Object.entries(debtStats).map(([currencyId, stat]) => {
              const paymentsByDebt = stat.paymentsByDebt || {};
              const remainingByDebt = stat.remainingByDebt || {};
              
              return `
              <div class="currency-section">
                <div class="currency-title" style="background: #fffbeb;">
                  <h3>${stat.currency?.name || ''} (${stat.currency?.symbol || ''})</h3>
                  <span class="debt">
                    المتبقي: ${formatNumber(stat.unpaidDebt)} ${stat.currency?.symbol || ''}
                  </span>
                </div>
                
                <div class="summary-grid">
                  <div class="summary-card">
                    <div class="label">إجمالي الديون</div>
                    <div class="value debt">${formatNumber(stat.totalDebt)}</div>
                  </div>
                  <div class="summary-card">
                    <div class="label">مدفوع</div>
                    <div class="value income">${formatNumber(stat.paidDebt)}</div>
                  </div>
                  <div class="summary-card">
                    <div class="label">متبقي</div>
                    <div class="value expense">${formatNumber(stat.unpaidDebt)}</div>
                  </div>
                </div>
                
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>النوع</th>
                      <th>المبلغ</th>
                      <th>مدفوع</th>
                      <th>متبقي</th>
                      <th>البيان</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${stat.debts.map(d => {
                      const payments = paymentsByDebt[d.id] || [];
                      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
                      const remaining = remainingByDebt[d.id] ?? d.finalBalance;
                      const isReceivable = d.debtType === 'RECEIVABLE' || !d.debtType;
                      const isFullyPaid = remaining <= 0;
                      
                      return `
                        <tr class="${isFullyPaid ? 'income-row' : 'debt-row'}">
                          <td>${format(new Date(d.date), 'dd/MM/yyyy')}</td>
                          <td>${isReceivable ? 'لنا' : 'علينا'}</td>
                          <td class="debt">${formatNumber(d.finalBalance)}</td>
                          <td class="income">${formatNumber(paid)}</td>
                          <td class="${isFullyPaid ? 'income' : 'expense'}">${formatNumber(remaining)}</td>
                          <td>${d.description || '-'}</td>
                        </tr>
                        ${payments.map(p => `
                          <tr style="background: #f0fdfa; font-size: 11px;">
                            <td style="padding-right: 30px;">└ ${format(new Date(p.date), 'dd/MM/yyyy')}</td>
                            <td>دفعة</td>
                            <td></td>
                            <td class="income">-${formatNumber(p.amount)}</td>
                            <td></td>
                            <td>${p.description || ''}</td>
                          </tr>
                        `).join('')}
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `;
            }).join('')}
          </div>
        ` : ''}
        
        <div class="footer">
          <p>نظام الصرافة والحوالات</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };
  
  const hasData = Object.keys(currencyStats).length > 0 || Object.keys(debtStats).length > 0;
  
  return (
    <Dialog open={isAccountStatementOpen} onOpenChange={closeAccountStatement}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            دفتر الأستاذ
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Account Selector */}
          <div className="w-full md:w-1/2">
            <label className="text-sm text-muted-foreground mb-2 block">الحساب</label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الحساب" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {!hasData ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">لا توجد بيانات لهذا الحساب</p>
              <p className="text-sm mt-2">لم يتم تسجيل أي حركات أو ديون بعد</p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]" id="print-content">
              <div className="space-y-6 pr-4">
                {/* Transactions by Currency */}
                {Object.entries(currencyStats).map(([currencyId, stat]) => (
                  <motion.div
                    key={currencyId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border overflow-hidden"
                  >
                    {/* Currency Header */}
                    <div className="bg-muted/50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Coins className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{stat.currency?.name}</h3>
                          <p className="text-xs text-muted-foreground">{stat.currency?.symbol}</p>
                        </div>
                      </div>
                      <div className={cn(
                        'text-lg font-bold',
                        stat.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {formatNumber(stat.netBalance)} {stat.currency?.symbol}
                      </div>
                    </div>
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-muted/20">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">لنا</p>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatNumber(stat.totalIncome)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">علينا</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatNumber(stat.totalExpense)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">الصافي</p>
                        <p className={cn(
                          'text-lg font-bold',
                          stat.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {formatNumber(stat.netBalance)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Transactions Table */}
                    {stat.transactions.length > 0 && (
                      <div className="border-t">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30">
                            <tr>
                              <th className="p-3 text-right font-medium">التاريخ</th>
                              <th className="p-3 text-right font-medium">النوع</th>
                              <th className="p-3 text-right font-medium">الدفع</th>
                              <th className="p-3 text-right font-medium">المبلغ</th>
                              <th className="p-3 text-right font-medium">الرصيد</th>
                              <th className="p-3 text-right font-medium">البيان</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stat.transactions.map((t, index) => (
                              <tr
                                key={t.id}
                                className={cn(
                                  'border-t',
                                  t.type === 'INCOME' 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/10' 
                                    : 'bg-red-50/50 dark:bg-red-950/10'
                                )}
                              >
                                <td className="p-3">
                                  {format(new Date(t.date), 'dd/MM/yyyy')}
                                </td>
                                <td className="p-3">
                                  <span className={cn(
                                    'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                                    t.type === 'INCOME'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                  )}>
                                    {t.type === 'INCOME' ? (
                                      <><ArrowUpRight className="w-3 h-3" /> لنا</>
                                    ) : (
                                      <><ArrowDownRight className="w-3 h-3" /> علينا</>
                                    )}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={cn(
                                    'text-xs px-2 py-1 rounded-full',
                                    t.paymentType === 'CASH'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                  )}>
                                    {t.paymentType === 'CASH' ? 'كاش' : 'آجل'}
                                  </span>
                                </td>
                                <td className={cn(
                                  'p-3 font-mono font-medium',
                                  t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                                )}>
                                  {t.type === 'INCOME' ? '+' : '-'}{formatNumber(t.finalBalance)}
                                </td>
                                <td className="p-3 font-mono">
                                  {formatNumber(t.runningBalance)}
                                </td>
                                <td className="p-3 text-muted-foreground text-xs max-w-[150px] truncate">
                                  {t.description || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {/* Debts Section */}
                {Object.keys(debtStats).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden"
                  >
                    {/* Debts Header */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-amber-600" />
                      <h3 className="font-medium text-amber-700 dark:text-amber-400">الديون</h3>
                    </div>
                    
                    {/* Debts by Currency */}
                    {Object.entries(debtStats).map(([currencyId, stat]) => (
                      <div key={currencyId} className="border-t first:border-t-0">
                        <div className="bg-muted/30 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{stat.currency?.name}</span>
                            <span className="text-xs text-muted-foreground">({stat.currency?.symbol})</span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">
                              إجمالي: <span className="font-medium text-amber-600">{formatNumber(stat.totalDebt)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              مدفوع: <span className="font-medium text-teal-600">{formatNumber(stat.paidDebt)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              متبقي: <span className="font-medium text-red-600">{formatNumber(stat.unpaidDebt)}</span>
                            </span>
                          </div>
                        </div>
                        
                        <table className="w-full text-sm">
                          <thead className="bg-muted/20">
                            <tr>
                              <th className="p-3 text-right font-medium">التاريخ</th>
                              <th className="p-3 text-right font-medium">النوع</th>
                              <th className="p-3 text-right font-medium">المبلغ</th>
                              <th className="p-3 text-right font-medium">مدفوع</th>
                              <th className="p-3 text-right font-medium">متبقي</th>
                              <th className="p-3 text-right font-medium">البيان</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stat.debts.map((d) => {
                              const remaining = stat.remainingByDebt[d.id] ?? d.finalBalance;
                              const paid = (stat.paymentsByDebt[d.id] ?? []).reduce((sum, p) => sum + p.amount, 0);
                              const isReceivable = d.debtType === 'RECEIVABLE' || !d.debtType;
                              const isFullyPaid = remaining <= 0;
                              
                              return (
                                <Fragment key={d.id}>
                                  <tr
                                    className={cn(
                                      'border-t',
                                      isFullyPaid
                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/5'
                                        : isReceivable
                                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                                          : 'bg-red-50/50 dark:bg-red-950/10'
                                    )}
                                  >
                                    <td className="p-3">
                                      {format(new Date(d.date), 'dd/MM/yyyy')}
                                    </td>
                                    <td className="p-3">
                                      <span className={cn(
                                        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                                        isReceivable
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                          : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                      )}>
                                        {isReceivable ? (
                                          <><ArrowUpRight className="w-3 h-3" /> لنا</>
                                        ) : (
                                          <><ArrowDownRight className="w-3 h-3" /> علينا</>
                                        )}
                                      </span>
                                    </td>
                                    <td className="p-3 font-mono font-medium text-amber-600">
                                      {formatNumber(d.finalBalance)}
                                    </td>
                                    <td className="p-3 font-mono text-teal-600">
                                      {formatNumber(paid)}
                                    </td>
                                    <td className={cn(
                                      'p-3 font-mono font-bold',
                                      isFullyPaid ? 'text-green-600' : 'text-red-600'
                                    )}>
                                      {formatNumber(remaining)}
                                    </td>
                                    <td className="p-3 text-muted-foreground text-xs">
                                      {d.description || '-'}
                                    </td>
                                  </tr>
                                  
                                  {/* عرض الدفعات تحت كل دين */}
                                  {(stat.paymentsByDebt[d.id] ?? []).length > 0 && (
                                    stat.paymentsByDebt[d.id].map((payment, idx) => (
                                      <tr
                                        key={`payment-${payment.id}`}
                                        className="border-t bg-teal-50/30 dark:bg-teal-950/10"
                                      >
                                        <td className="p-2 pr-8 text-xs text-muted-foreground">
                                          └ {format(new Date(payment.date), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="p-2 text-xs text-teal-600">دفعة</td>
                                        <td className="p-2"></td>
                                        <td className="p-2 font-mono text-teal-600 text-xs">
                                          -{formatNumber(payment.amount)}
                                        </td>
                                        <td className="p-2"></td>
                                        <td className="p-2 text-xs text-muted-foreground">
                                          {payment.description || ''}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          )}
          
          {/* Print Button */}
          {hasData && (
            <Button
              onClick={handlePrint}
              className="w-full gap-2"
            >
              <Printer className="w-4 h-4" />
              طباعة التقرير
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
