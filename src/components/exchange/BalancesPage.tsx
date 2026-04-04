'use client';

import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { motion } from 'framer-motion';
import { RefreshCw, Wallet, Settings, Plus, DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import { VaultCard, SummaryCard } from './VaultCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import type { Vault } from '@/lib/localDb';

export function BalancesPage() {
  const { isLoading, setIsLoading, openCurrencyModal } = useAppStore();
  // استخدام البيانات من useLocalData مباشرة لضمان التحديث الفوري
  const { refreshData, totalBalanceUSD, debtRemaining, transactions, vaults, currencies } = useLocalData();

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshData();
    setIsLoading(false);
  };

  // Calculate deferred balances (الآجل)
  const totalDeferredIncome = transactions
    .filter(t => t.type === 'INCOME' && t.paymentType === 'DEFERRED')
    .reduce((sum, t) => sum + t.finalBalance, 0);
  const totalDeferredExpense = transactions
    .filter(t => t.type === 'EXPENSE' && t.paymentType === 'DEFERRED')
    .reduce((sum, t) => sum + t.finalBalance, 0);

  // ============================================
  // حساب إجمالي الأرصدة الصحيح
  // ============================================
  // إجمالي الأرصدة = أرصدة الصناديق النقدية فقط
  // الديون الآجلة لا تدخل في الحساب لأنها غير نقدية
  // الديون النقدية أثرت بالفعل على الصناديق عند إضافتها
  
  // صافي الديون الآجلة (للعرض فقط، لا يدخل في إجمالي الأرصدة)
  const netDeferredDebts = (debtRemaining.deferredReceivableRemaining || 0) - (debtRemaining.deferredPayableRemaining || 0);
  
  // إجمالي الأرصدة النهائي = أرصدة الصناديق فقط (النقد الفعلي)
  // لا نضيف الديون الآجلة لأنها التزامات/مستحقات غير نقدية
  const finalTotalBalance = totalBalanceUSD;
  
  // Get active vaults only
  const activeVaults = vaults.filter((v: Vault) =>
    currencies.some(c => c.id === v.currencyId && c.isActive)
  );

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأرصدة</h1>
          <p className="text-sm text-muted-foreground">إدارة صناديق العملات</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={openCurrencyModal}
            className="rounded-full"
            title="إدارة العملات"
          >
            <Coins className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="rounded-full"
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Total Balance in USD Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl p-5 text-white shadow-lg",
          finalTotalBalance >= 0
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
            : "bg-gradient-to-br from-red-500 to-red-600"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">إجمالي الأرصدة بالدولار</p>
              <p className="text-xs text-white/60">النقد الفعلي في الصناديق</p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-white/60" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">
            {formatNumber(finalTotalBalance)}
          </span>
          <span className="text-xl text-white/80">$</span>
        </div>

        <div className="text-xs text-white/60 mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>عدد الصناديق المفعلة: {activeVaults.length}</span>
          <span>•</span>
          <span>صافي الديون الآجلة: {netDeferredDebts >= 0 ? '+' : ''}{formatNumber(netDeferredDebts)}$ (غير شامل)</span>
        </div>
      </motion.div>

      {/* Deferred Balances Cards - الأرصدة الآجلة */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          title="إجمالي الرصيد لنا (آجل)"
          value={totalDeferredIncome}
          currency="$"
          type="income"
          index={0}
        />
        <SummaryCard
          title="إجمالي الرصيد علينا (آجل)"
          value={totalDeferredExpense}
          currency="$"
          type="expense"
          index={1}
        />
      </div>

      {/* Debt Summary Cards - الديون والدفعات */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white shadow-md"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-sm text-white/80">إجمالي الديون المستحقة</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatNumber(debtRemaining.totalDebts)}</span>
            <span className="text-sm text-white/70">$</span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            {debtRemaining.unpaidDebtsCount + debtRemaining.paidDebtsCount} دين مسجل
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-4 text-white shadow-md"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-sm text-white/80">إجمالي الدفعات المسددة</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatNumber(debtRemaining.totalPaid)}</span>
            <span className="text-sm text-white/70">$</span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            {debtRemaining.paidDebtsCount} دين تم سداده بالكامل
          </p>
        </motion.div>
      </div>

      {/* Debt Remaining Summary */}
      {debtRemaining.totalRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 p-4 border border-rose-200 dark:border-rose-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متبقي للسداد</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatNumber(debtRemaining.totalRemaining)} $
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">نسبة المسدد</p>
              <p className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                {debtRemaining.totalDebts > 0
                  ? Math.round((debtRemaining.totalPaid / debtRemaining.totalDebts) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Vault Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">صناديق العملات</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={openCurrencyModal}
            className="gap-1 text-xs"
          >
            <Plus className="w-3 h-3" />
            إضافة عملة
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : activeVaults.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-muted/30">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">لا توجد صناديق مفعلة</p>
            <Button onClick={openCurrencyModal} variant="outline" size="sm">
              تفعيل عملات
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeVaults.map((vault: Vault, index: number) => (
              <VaultCard key={vault.id} vault={vault} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
