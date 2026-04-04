'use client';

import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
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
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, History, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CurrencyExchange } from '@/types';

export function VaultQueryModal() {
  const { isVaultQueryOpen, closeVaultQuery, vaults, currencies, transactions, currencyExchanges, selectedVaultForQuery } = useAppStore();
  
  // Get default currency ID
  const defaultCurrencyId = useMemo(() => {
    if (selectedVaultForQuery?.currencyId) {
      return selectedVaultForQuery.currencyId;
    }
    const defaultCurrency = currencies.find(c => c.isDefault);
    return defaultCurrency?.id || currencies[0]?.id || '';
  }, [selectedVaultForQuery, currencies]);
  
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('');
  
  // Set initial value when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedCurrencyId(defaultCurrencyId);
    }
    if (!open) {
      closeVaultQuery();
    }
  };
  
  const selectedVault = vaults.find(v => v.currencyId === selectedCurrencyId);
  const selectedCurrency = currencies.find(c => c.id === selectedCurrencyId);
  
  // Calculate transaction stats for selected currency
  // يتم فلترة الحركات بناءً على عملة الصندوق (baseCurrencyId) أو العملة النهائية (currencyId)
  const { totalIncome, totalExpense, incomeTransactions, expenseTransactions, transactionCount, currencyTransactions } = useMemo(() => {
    // فلترة الحركات التي تؤثر على هذا الصندوق:
    // - الحركات التي baseCurrencyId يساوي عملة الصندوق (المبلغ الأساسي بهذه العملة)
    // - أو الحركات التي currencyId يساوي عملة الصندوق (العملة النهائية بهذه العملة)
    const currencyTx = transactions.filter(t => 
      t.baseCurrencyId === selectedCurrencyId || 
      t.currencyId === selectedCurrencyId
    );
    const incomeTx = currencyTx.filter(t => t.type === 'INCOME');
    const expenseTx = currencyTx.filter(t => t.type === 'EXPENSE');
    
    return {
      totalIncome: incomeTx.reduce((sum, t) => sum + t.finalBalance, 0),
      totalExpense: expenseTx.reduce((sum, t) => sum + t.finalBalance, 0),
      incomeTransactions: incomeTx,
      expenseTransactions: expenseTx,
      transactionCount: currencyTx.length,
      currencyTransactions: currencyTx,
    };
  }, [transactions, selectedCurrencyId]);
  
  // Calculate currency exchange stats for selected currency
  const { 
    exchangeOutgoing, 
    exchangeIncoming, 
    totalExchangeOutgoing, 
    totalExchangeIncoming, 
    exchangeCount,
    currencyExchangesList 
  } = useMemo(() => {
    // عمليات الصرافة حيث هذه العملة هي المصدر (خروج)
    const outgoing = currencyExchanges.filter((e: CurrencyExchange) => e.outgoingCurrencyId === selectedCurrencyId);
    // عمليات الصرافة حيث هذه العملة هي الهدف (دخول)
    const incoming = currencyExchanges.filter((e: CurrencyExchange) => e.incomingCurrencyId === selectedCurrencyId);
    
    return {
      exchangeOutgoing: outgoing,
      exchangeIncoming: incoming,
      totalExchangeOutgoing: outgoing.reduce((sum: number, e: CurrencyExchange) => sum + e.outgoingAmount, 0),
      totalExchangeIncoming: incoming.reduce((sum: number, e: CurrencyExchange) => sum + e.incomingAmount, 0),
      exchangeCount: outgoing.length + incoming.length,
      currencyExchangesList: [...outgoing, ...incoming].sort((a: CurrencyExchange, b: CurrencyExchange) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }, [currencyExchanges, selectedCurrencyId]);
  
  // Combined stats (transactions + exchanges)
  const combinedStats = useMemo(() => ({
    totalIn: totalIncome + totalExchangeIncoming,
    totalOut: totalExpense + totalExchangeOutgoing,
    netBalance: (totalIncome + totalExchangeIncoming) - (totalExpense + totalExchangeOutgoing),
  }), [totalIncome, totalExpense, totalExchangeIncoming, totalExchangeOutgoing]);
  
  return (
    <Dialog open={isVaultQueryOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            استعلام رصيد الصناديق
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Currency Selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">اختر العملة</label>
            <Select value={selectedCurrencyId} onValueChange={setSelectedCurrencyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر العملة" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{currency.symbol}</span>
                      <span>{currency.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Main Balance Card */}
          {selectedVault && selectedCurrency && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl p-6 border-2',
                selectedVault.balance >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              )}
            >
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">الرصيد الحالي</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold">
                    {formatNumber(selectedVault.balance)}
                  </span>
                  <span className="text-xl text-muted-foreground">
                    {selectedCurrency.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {selectedVault.balance >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600">رصيد موجب</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">رصيد سالب</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Opening Balance */}
              {(selectedVault.openingBalance || 0) !== 0 && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">رصيد أول المدة</span>
                    <span className={cn(
                      'text-lg font-semibold',
                      selectedVault.openingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {selectedVault.openingBalance >= 0 ? '' : '-'}{formatNumber(Math.abs(selectedVault.openingBalance))} {selectedCurrency.symbol}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Income */}
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-200/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs text-muted-foreground">إجمالي لنا</span>
              </div>
              <p className="text-lg font-bold text-emerald-600">
                {formatNumber(totalIncome)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {incomeTransactions.length} حركة
              </p>
            </div>
            
            {/* Total Expense */}
            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-4 border border-red-200/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-xs text-muted-foreground">إجمالي علينا</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                {formatNumber(totalExpense)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {expenseTransactions.length} حركة
              </p>
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="rounded-xl bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-3">ملخص الحركات</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">عدد الحركات</span>
                <span className="font-medium">{transactionCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">صافي الرصيد</span>
                <span className={cn(
                  'font-medium',
                  totalIncome - totalExpense >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {formatNumber(totalIncome - totalExpense)} {selectedCurrency?.symbol}
                </span>
              </div>
            </div>
          </div>
          
          {/* Currency Exchange Stats */}
          {exchangeCount > 0 && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200/50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-blue-500" />
                عمليات الصرافة
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Incoming Exchanges */}
                <div className="text-center p-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30">
                  <p className="text-xs text-muted-foreground">شراء (دخول)</p>
                  <p className="text-lg font-bold text-emerald-600">
                    +{formatNumber(totalExchangeIncoming)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {exchangeIncoming.length} عملية
                  </p>
                </div>
                {/* Outgoing Exchanges */}
                <div className="text-center p-2 rounded-lg bg-red-100/50 dark:bg-red-900/30">
                  <p className="text-xs text-muted-foreground">بيع (خروج)</p>
                  <p className="text-lg font-bold text-red-600">
                    -{formatNumber(totalExchangeOutgoing)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {exchangeOutgoing.length} عملية
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200/50 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">صافي الصرافة</span>
                <span className={cn(
                  'font-medium',
                  totalExchangeIncoming - totalExchangeOutgoing >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {totalExchangeIncoming - totalExchangeOutgoing >= 0 ? '+' : ''}{formatNumber(totalExchangeIncoming - totalExchangeOutgoing)} {selectedCurrency?.symbol}
                </span>
              </div>
            </div>
          )}
          
          {/* Combined Summary */}
          {(transactionCount > 0 || exchangeCount > 0) && (
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/20">
              <h4 className="text-sm font-medium mb-3">الملخص الشامل</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">إجمالي الداخل</span>
                  <span className="font-medium text-emerald-600">
                    +{formatNumber(combinedStats.totalIn)} {selectedCurrency?.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">إجمالي الخارج</span>
                  <span className="font-medium text-red-600">
                    -{formatNumber(combinedStats.totalOut)} {selectedCurrency?.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                  <span className="font-medium">صافي الحركات</span>
                  <span className={cn(
                    'font-bold',
                    combinedStats.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {combinedStats.netBalance >= 0 ? '+' : ''}{formatNumber(combinedStats.netBalance)} {selectedCurrency?.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Recent Transactions */}
          {currencyTransactions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                آخر الحركات
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currencyTransactions.slice(0, 5).map((t, index) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      t.type === 'INCOME' ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-red-50/50 dark:bg-red-950/10'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{t.account?.name || t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                      </p>
                    </div>
                    <span className={cn(
                      'font-bold',
                      t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatNumber(t.finalBalance)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Currency Exchanges */}
          {currencyExchangesList.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-blue-500" />
                آخر عمليات الصرافة
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currencyExchangesList.slice(0, 5).map((e: CurrencyExchange, index: number) => {
                  const isOutgoing = e.outgoingCurrencyId === selectedCurrencyId;
                  const outgoingCurrency = currencies.find(c => c.id === e.outgoingCurrencyId);
                  const incomingCurrency = currencies.find(c => c.id === e.incomingCurrencyId);
                  
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        isOutgoing 
                          ? 'bg-red-50/50 dark:bg-red-950/10' 
                          : 'bg-emerald-50/50 dark:bg-emerald-950/10'
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {isOutgoing ? (
                            <>صرف {outgoingCurrency?.symbol} ← {incomingCurrency?.symbol}</>
                          ) : (
                            <>شراء {incomingCurrency?.symbol} ← {outgoingCurrency?.symbol}</>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.date)}
                        </p>
                      </div>
                      <span className={cn(
                        'font-bold',
                        isOutgoing ? 'text-red-600' : 'text-emerald-600'
                      )}>
                        {isOutgoing ? '-' : '+'}{formatNumber(isOutgoing ? e.outgoingAmount : e.incomingAmount)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
