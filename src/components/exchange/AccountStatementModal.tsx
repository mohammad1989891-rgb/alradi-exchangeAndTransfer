'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAccountStatement } from '@/hooks/useAccountStatement';
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

export function AccountStatementModal() {
  const { 
    isAccountStatementOpen, 
    closeAccountStatement, 
    accounts, 
    currencies,
    selectedAccountForStatement 
  } = useAppStore();
  
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
  
  // 🔸 Single Source of Truth — all balance calculations are now centralized
  //    in the useAccountStatement hook, which is shared with AccountMatchModal.
  //    This guarantees the statement and the match modal produce IDENTICAL
  //    balances, income totals, and expense totals for the same account.
  //    No duplicate logic lives in this component anymore.
  const { currencyStats, debtStats, hasData } = useAccountStatement(
    selectedAccountId,
    dateFrom || undefined,
    dateTo || undefined,
    true, // listen to live `sales-updated` / `app-data-refreshed` events
  );
  
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
  
  // 🔸 `hasData` comes from the useAccountStatement hook (Single Source of
  //    Truth). No local redefinition needed.
  
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
