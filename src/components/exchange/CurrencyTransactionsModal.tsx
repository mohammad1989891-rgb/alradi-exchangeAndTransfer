'use client';

import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
import { isSYPCurrency, formatSYPDualDisplay } from '@/lib/syp-conversion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { useMemo } from 'react';

export function CurrencyTransactionsModal() {
  const { 
    isVaultQueryOpen, 
    closeVaultQuery, 
    vaults, 
    currencies, 
    transactions,
    selectedVaultForQuery 
  } = useAppStore();
  
  const selectedCurrencyId = selectedVaultForQuery?.currencyId || '';
  const selectedVault = vaults.find(v => v.currencyId === selectedCurrencyId);
  const selectedCurrency = currencies.find(c => c.id === selectedCurrencyId);
  
  // Get transactions for this currency
  const currencyTransactions = useMemo(() => {
    return transactions.filter(t => t.currencyId === selectedCurrencyId);
  }, [transactions, selectedCurrencyId]);
  
  // Calculate stats
  const stats = useMemo(() => {
    const income = currencyTransactions.filter(t => t.type === 'INCOME');
    const expense = currencyTransactions.filter(t => t.type === 'EXPENSE');
    
    return {
      totalIncome: income.reduce((sum, t) => sum + t.finalBalance, 0),
      totalExpense: expense.reduce((sum, t) => sum + t.finalBalance, 0),
      incomeCount: income.length,
      expenseCount: expense.length,
    };
  }, [currencyTransactions]);
  
  const netBalance = stats.totalIncome - stats.totalExpense;
  
  return (
    <Dialog open={isVaultQueryOpen} onOpenChange={() => closeVaultQuery()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            حركات {selectedCurrency?.name || 'العملة'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Currency Header */}
          {selectedVault && selectedCurrency && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl p-5 border-2',
                selectedVault.balance >= 0
                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg',
                  selectedVault.balance >= 0
                    ? 'bg-white dark:bg-emerald-900/50 text-emerald-600'
                    : 'bg-white dark:bg-red-900/50 text-red-600'
                )}>
                  {selectedCurrency.symbol}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{selectedCurrency.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {formatNumber(selectedVault.balance)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedCurrency.symbol}
                    </span>
                  </div>
                  {isSYPCurrency(selectedCurrency.id, selectedCurrency.code) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatSYPDualDisplay(selectedVault.balance)}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-200/50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">لنا</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                {formatNumber(stats.totalIncome)}
              </p>
              {isSYPCurrency(selectedCurrency?.id, selectedCurrency?.code) && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatSYPDualDisplay(stats.totalIncome)}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.incomeCount} حركة
              </p>
            </div>
            
            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-4 border border-red-200/50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-4 h-4 text-red-600" />
                <span className="text-xs text-muted-foreground">علينا</span>
              </div>
              <p className="text-xl font-bold text-red-600">
                {formatNumber(stats.totalExpense)}
              </p>
              {isSYPCurrency(selectedCurrency?.id, selectedCurrency?.code) && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatSYPDualDisplay(stats.totalExpense)}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.expenseCount} حركة
              </p>
            </div>
          </div>
          
          {/* Net Balance */}
          <div className={cn(
            'rounded-xl p-4 flex items-center justify-between',
            netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'
          )}>
            <span className="text-sm text-muted-foreground">صافي الرصيد</span>
            <div className="text-left">
              <span className={cn(
                'text-lg font-bold',
                netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatNumber(netBalance)} {selectedCurrency?.symbol}
              </span>
              {isSYPCurrency(selectedCurrency?.id, selectedCurrency?.code) && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatSYPDualDisplay(netBalance)}
                </p>
              )}
            </div>
          </div>
          
          {/* Transactions List */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              سجل الحركات ({currencyTransactions.length})
            </h4>
            
            {currencyTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl">
                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد حركات لهذه العملة</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {currencyTransactions.map((t, index) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-colors',
                        t.type === 'INCOME' 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50' 
                          : 'bg-red-50/50 dark:bg-red-950/10 border-red-200/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center',
                          t.type === 'INCOME' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/50' 
                            : 'bg-red-100 dark:bg-red-900/50'
                        )}>
                          {t.type === 'INCOME' ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.account?.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(t.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          'font-bold',
                          t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {t.type === 'INCOME' ? '+' : '-'}{formatNumber(t.finalBalance)}
                        </p>
                        {isSYPCurrency(selectedCurrency?.id, selectedCurrency?.code) && (
                          <p className="text-[9px] text-muted-foreground">
                            {formatSYPDualDisplay(t.finalBalance)}
                          </p>
                        )}
                        {t.description && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
