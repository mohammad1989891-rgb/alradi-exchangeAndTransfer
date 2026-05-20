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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BookOpen, Printer, FileText, X
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
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const hasDateFilter = dateFrom || dateTo;
  
  // Clear date filter
  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };
  
  // Filter data for selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    let filtered = transactions.filter(t => t.accountId === selectedAccountId);
    
    // Apply date filter
    if (hasDateFilter) {
      filtered = filtered.filter(t => {
        const txDate = new Date(t.date).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || txDate >= dateFrom;
        const matchesDateTo = !dateTo || txDate <= dateTo;
        return matchesDateFrom && matchesDateTo;
      });
    }
    
    return filtered;
  }, [transactions, selectedAccountId, dateFrom, dateTo, hasDateFilter]);
  
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
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 { font-size: 22px; margin-bottom: 4px; }
          .header p { color: #666; font-size: 13px; }
          
          .currency-section {
            margin-bottom: 20px;
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
            margin-top: 20px;
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
            body { padding: 10px; margin: 0; }
            .currency-section { page-break-inside: auto; }
            .debt-section { page-break-inside: auto; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .header { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>دفتر الأستاذ</h1>
          <p>الحساب: ${selectedAccount?.name || ''}</p>
          ${hasDateFilter ? `
            <p style="background: #f0f9ff; padding: 8px 15px; border-radius: 8px; margin: 10px 0; display: inline-block;">
              📅 الفترة: ${dateFrom ? 'من ' + dateFrom : ''} ${dateTo ? 'إلى ' + dateTo : ''}
            </p>
          ` : ''}
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
                    <th>المبلغ الأساسي</th>
                    <th>العملة</th>
                    <th>المبلغ</th>
                    <th>الرصيد التراكمي</th>
                    <th>البيان</th>
                  </tr>
                </thead>
                <tbody>
                  ${stat.transactions.map(t => `
                    <tr class="${t.type === 'INCOME' ? 'income-row' : 'expense-row'}">
                      <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                      <td>${formatNumber(t.amount)}</td>
                      <td>${(() => { const c = currencies.find(c => c.id === (t.baseCurrencyId || t.currencyId)); return c ? c.code : ''; })()}</td>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            دفتر الأستاذ
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col">
          {/* Filters Section */}
          <div className="space-y-4">
            {/* Account Selector */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">الحساب</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="rounded-xl">
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
            
            {/* Date Filter Row */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm rounded-xl"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm rounded-xl"
                />
              </div>
              {hasDateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
                  className="h-10 text-xs text-muted-foreground shrink-0"
                >
                  <X className="w-3 h-3 ml-1" />
                  مسح
                </Button>
              )}
            </div>
          </div>
          
          {/* Status Message */}
          <div className="flex-1 flex items-center justify-center py-8">
            {!hasData ? (
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">لا توجد بيانات لهذا الحساب</p>
                <p className="text-sm mt-2">لم يتم تسجيل أي حركات أو ديون بعد</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">جاهز للطباعة</p>
                <p className="text-sm mt-2">اضغط على زر "طباعة تقرير" أدناه</p>
                {hasDateFilter && (
                  <p className="text-xs mt-2 text-primary">
                    📅 الفترة: {dateFrom ? 'من ' + dateFrom : ''} {dateTo ? 'إلى ' + dateTo : ''}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Print Button - Full Width at Bottom */}
          {hasData && (
            <Button
              onClick={handlePrint}
              className="w-full rounded-xl py-6 text-base font-medium"
              size="lg"
            >
              <Printer className="w-5 h-5 ml-2" />
              طباعة تقرير
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
