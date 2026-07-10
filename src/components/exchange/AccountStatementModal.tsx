'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { getSalesByAccount } from '@/lib/supabaseDb';
import type { Sale } from '@/lib/supabaseDb';
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
  BookOpen, Printer, FileText, X, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/format';
import type { Transaction, Debt, DebtPayment, Currency } from '@/lib/supabaseDb';

export function AccountStatementModal() {
  const { 
    isAccountStatementOpen, 
    closeAccountStatement, 
    accounts, 
    currencies, 
    selectedAccountForStatement 
  } = useAppStore();
  
  const { transactions, debts, debtPayments } = useSupabaseData();
  
  // Determine initial selected account using useMemo
  const defaultAccountId = useMemo(() => {
    if (selectedAccountForStatement) {
      return selectedAccountForStatement.id;
    }
    return accounts.length > 0 ? accounts[0].id : '';
  }, [selectedAccountForStatement, accounts]);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId);

  // 🔸 Sales linked to the selected account (all in USD per spec)
  const [accountSales, setAccountSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // 🔸 Keep the statement's sales section in sync with the latest data.
  //    The modal fetches sales from the `sales` table via getSalesByAccount
  //    (which selects ALL sales for the account — no payment_method filter —
  //    so both cash and credit sales are always returned).
  //
  //    Root cause of "credit sales don't appear in the statement": the
  //    original effect only refetched when `selectedAccountId` changed, so
  //    sales created/edited/deleted while the modal was closed (or while a
  //    different account was selected) never appeared until the user
  //    manually switched accounts. The fix below adds two more triggers:
  //      1. Refetch when the modal opens (isAccountStatementOpen turns true)
  //         — picks up sales created since the last view.
  //      2. Listen for `sales-updated` + `app-data-refreshed` window events
  //         (dispatched by SaleDialog and SalesPage after create/edit/delete)
  //         and refetch live, so the statement + final balance update
  //         immediately without requiring the user to reopen the modal.
  useEffect(() => {
    if (!selectedAccountId) {
      // No account selected — nothing to fetch. (We intentionally do NOT call
      // setAccountSales([]) here to avoid the set-state-in-effect lint rule;
      // accountSales is reset via the empty result path of getSalesByAccount
      // when a real account is selected, and the modal is hidden when no
      // account exists anyway.)
      return;
    }
    let cancelled = false;

    const load = () => {
      setIsLoadingSales(true);
      getSalesByAccount(selectedAccountId)
        .then((sales) => {
          if (!cancelled) setAccountSales(sales);
        })
        .catch((err) => {
          console.error('Error fetching sales for account:', err);
          if (!cancelled) setAccountSales([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingSales(false);
        });
    };

    // Initial load (fires on mount, on account change, and on modal open)
    load();

    // Live refresh: refetch whenever a sale is created/edited/deleted anywhere
    // in the app, so the statement's balance stays accurate in real time.
    const handleSalesUpdated = () => load();
    window.addEventListener('sales-updated', handleSalesUpdated);
    window.addEventListener('app-data-refreshed', handleSalesUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('sales-updated', handleSalesUpdated);
      window.removeEventListener('app-data-refreshed', handleSalesUpdated);
    };
  }, [selectedAccountId, isAccountStatementOpen]);
  
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
    let filtered = transactions.filter(t => t.accountId === selectedAccountId && t.isComplete !== false);
    
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
  
  // 🔸 Date-filtered sales for this account (all sales are USD per spec)
  const filteredAccountSales = useMemo(() => {
    if (!hasDateFilter) return accountSales;
    return accountSales.filter(s => {
      const sDate = new Date(s.date).toISOString().split('T')[0];
      const matchesDateFrom = !dateFrom || sDate >= dateFrom;
      const matchesDateTo = !dateTo || sDate <= dateTo;
      return matchesDateFrom && matchesDateTo;
    });
  }, [accountSales, dateFrom, dateTo, hasDateFilter]);

  // 🔸 Unified statement item type: a transaction OR a sale, with runningBalance
  type StatementItem = {
    id: string;
    date: Date;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    finalBalance: number;
    description?: string | null;
    runningBalance: number;
    isSale: boolean;
    paymentMethod?: 'cash' | 'credit';
    materialName?: string;
    quantity?: number;
    unitName?: string;
  };

  // Calculate totals per currency — for USD, merge sales into the running balance
  const currencyStats = useMemo(() => {
    const stats: Record<string, {
      currency: Currency | undefined;
      totalIncome: number;
      totalExpense: number;
      netBalance: number;
      items: StatementItem[];
    }> = {};

    // Find USD currency id (sales are always USD)
    const usdCurrency = currencies.find(c => c.code === 'USD');

    for (const currencyId in transactionsByCurrency) {
      const currency = currencies.find(c => c.id === currencyId);
      const txs = transactionsByCurrency[currencyId];

      // Build items: convert transactions to StatementItem
      let items: StatementItem[] = txs.map(tx => ({
        id: tx.id,
        date: new Date(tx.date),
        type: tx.type,
        amount: tx.amount,
        finalBalance: tx.finalBalance,
        description: tx.description,
        runningBalance: 0,
        isSale: false,
      }));

      // 🔸 If this is the USD currency, merge sales (treat each sale as INCOME)
      if (usdCurrency && currencyId === usdCurrency.id && filteredAccountSales.length > 0) {
        const saleItems: StatementItem[] = filteredAccountSales.map(s => ({
          id: s.id,
          date: new Date(s.date),
          type: 'INCOME' as const, // Sale = customer owes us → لنا
          amount: s.totalPrice,
          finalBalance: s.totalPrice,
          description: s.description || `بيع ${s.materialName}`,
          runningBalance: 0,
          isSale: true,
          paymentMethod: s.paymentMethod,
          materialName: s.materialName,
          quantity: s.quantity,
          unitName: s.unitName,
        }));
        items = items.concat(saleItems);
      }

      // Sort by date ascending (then by createdAt for stable order — use id as tiebreaker)
      items.sort((a, b) => {
        const diff = a.date.getTime() - b.date.getTime();
        if (diff !== 0) return diff;
        return a.id.localeCompare(b.id);
      });

      // Compute running balance
      // 🔸 Cash sales are reference-only: they remain visible in the statement
      //    as a historical record (with all invoice data + a "كاش" badge) but
      //    do NOT affect totalIncome / runningBalance, because their value was
      //    already collected directly into the USD vault at sale time.
      //    Only credit sales (unpaid receivables) move the account balance,
      //    since كشف الحساب exists to show الذمم والمبالغ المستحقة.
      let totalIncome = 0;
      let totalExpense = 0;
      let runningBalance = 0;
      items = items.map(it => {
        const isCashSale = it.isSale && it.paymentMethod === 'cash';
        if (!isCashSale) {
          if (it.type === 'INCOME') {
            totalIncome += it.finalBalance;
            runningBalance += it.finalBalance;
          } else {
            totalExpense += it.finalBalance;
            runningBalance -= it.finalBalance;
          }
        }
        return { ...it, runningBalance };
      });

      stats[currencyId] = {
        currency,
        totalIncome,
        totalExpense,
        netBalance: runningBalance,
        items,
      };
    }

    // 🔸 Edge case: account has sales but NO USD transactions — still show USD section
    if (usdCurrency && !stats[usdCurrency.id] && filteredAccountSales.length > 0) {
      let items: StatementItem[] = filteredAccountSales.map(s => ({
        id: s.id,
        date: new Date(s.date),
        type: 'INCOME' as const,
        amount: s.totalPrice,
        finalBalance: s.totalPrice,
        description: s.description || `بيع ${s.materialName}`,
        runningBalance: 0,
        isSale: true,
        paymentMethod: s.paymentMethod,
        materialName: s.materialName,
        quantity: s.quantity,
        unitName: s.unitName,
      }));
      items.sort((a, b) => a.date.getTime() - b.date.getTime());
      // 🔸 Cash sales are reference-only (see main loop comment above) —
      //    visible in the statement but excluded from the balance.
      let totalIncome = 0;
      let runningBalance = 0;
      items = items.map(it => {
        const isCashSale = it.isSale && it.paymentMethod === 'cash';
        if (!isCashSale) {
          totalIncome += it.finalBalance;
          runningBalance += it.finalBalance;
        }
        return { ...it, runningBalance };
      });
      stats[usdCurrency.id] = {
        currency: usdCurrency,
        totalIncome,
        totalExpense: 0,
        netBalance: runningBalance,
        items,
      };
    }

    return stats;
  }, [transactionsByCurrency, currencies, filteredAccountSales]);
  
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
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .header h1 { font-size: 20px; margin-bottom: 2px; }
          .header p { color: #666; font-size: 12px; }
          
          .currency-section {
            margin-bottom: 15px;
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
          .sale-row { background: #f0f9ff; }
          .sale-credit-row { background: #fffbeb; }
          .badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            margin-inline-start: 4px;
          }
          .badge-cash { background: #d1fae5; color: #065f46; }
          .badge-credit { background: #fef3c7; color: #92400e; }
          
          .debt-section {
            margin-top: 15px;
          }
          
          .footer {
            margin-top: 15px;
            padding-top: 10px;
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
            .header { page-break-after: avoid; page-break-inside: avoid; }
            .summary-grid { page-break-inside: avoid; page-break-after: avoid; }
            .currency-title { page-break-after: avoid; }
            .footer { page-break-before: avoid; }
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
            
            ${stat.items.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    <th>الرصيد التراكمي</th>
                    <th>البيان</th>
                  </tr>
                </thead>
                <tbody>
                  ${stat.items.map(t => {
                    const rowClass = t.isSale
                      ? (t.paymentMethod === 'credit' ? 'sale-credit-row' : 'sale-row')
                      : (t.type === 'INCOME' ? 'income-row' : 'expense-row');
                    const typeLabel = t.isSale
                      ? (t.paymentMethod === 'credit'
                          ? '🛒 بيع <span class="badge badge-credit">آجل</span>'
                          : '🛒 بيع <span class="badge badge-cash">كاش</span>')
                      : (t.type === 'INCOME' ? 'لنا' : 'علينا');
                    const descLabel = t.isSale && t.materialName
                      ? `بيع ${t.materialName} (${formatNumber(t.quantity || 0)} ${t.unitName || ''})${t.paymentMethod === 'credit' ? ' — فاتورة غير مسددة' : ''}`
                      : (t.description || '-');
                    return `
                    <tr class="${rowClass}">
                      <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                      <td>${typeLabel}</td>
                      <td class="${t.type === 'INCOME' ? 'income' : 'expense'}">
                        ${t.type === 'INCOME' ? '+' : '-'}${formatNumber(t.finalBalance)}
                      </td>
                      <td>${formatNumber(t.runningBalance)}</td>
                      <td>${descLabel}</td>
                    </tr>
                  `;
                  }).join('')}
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
                      <th>المبلغ الأساسي</th>
                      <th>العملة</th>
                      <th>المبلغ</th>
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
                      const debtCurrency = currencies.find(c => c.id === d.currencyId);
                      
                      return `
                        <tr class="${isFullyPaid ? 'income-row' : 'debt-row'}">
                          <td>${format(new Date(d.date), 'dd/MM/yyyy')}</td>
                          <td>${formatNumber(d.amount)}</td>
                          <td>${debtCurrency ? debtCurrency.code : ''}</td>
                          <td class="debt">${formatNumber(d.finalBalance)}</td>
                          <td class="${isFullyPaid ? 'income' : 'expense'}">${formatNumber(remaining)}</td>
                          <td>${d.description || '-'}</td>
                        </tr>
                        ${payments.map(p => {
                          const pCurrency = currencies.find(c => c.id === p.currencyId);
                          return `
                          <tr style="background: #f0fdfa; font-size: 11px;">
                            <td style="padding-right: 30px;">└ ${format(new Date(p.date), 'dd/MM/yyyy')}</td>
                            <td>${formatNumber(p.amount)}</td>
                            <td>${pCurrency ? pCurrency.code : ''}</td>
                            <td></td>
                            <td></td>
                            <td>${p.description || ''}</td>
                          </tr>
                        `;}).join('')}
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
