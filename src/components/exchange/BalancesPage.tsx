'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Wallet, Plus, DollarSign, TrendingUp, Coins, RefreshCcw, ChevronDown, ChevronUp, HandCoins, Scale } from 'lucide-react';
import { VaultCard, SummaryCard } from './VaultCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSYPSettings } from '@/store/useSYPSettings';
import { formatNumber } from '@/lib/format';
import type { Vault } from '@/lib/localDb';

export function BalancesPage() {
  const { isLoading, setIsLoading, openCurrencyModal } = useAppStore();
  // استخدام البيانات من useLocalData مباشرة لضمان التحديث الفوري
  const { refreshData, totalBalanceUSD, debtRemaining, transactions, vaults, currencies, debts, debtPayments } = useLocalData();
  
  // حالة إظهار/إخفاء تفاصيل الديون
  const [showDebtDetails, setShowDebtDetails] = useState(false);

  // SYP display version toggle
  const { displayVersion, toggleDisplayVersion } = useSYPSettings();
  const isSYPActive = currencies.some(c => c.code === 'SYP' && c.isActive);

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
  
  // ============================================
  // حسابات الديون الجديدة (الأصول والالتزامات)
  // ============================================
  
  // الأصول (الديون لنا) = نقدي + آجل
  const totalReceivables = (debtRemaining.cashReceivable || 0) + (debtRemaining.deferredReceivable || 0);
  const totalReceivablesPaid = (debtRemaining.cashReceivablePaid || 0) + (debtRemaining.deferredReceivablePaid || 0);
  const totalReceivablesRemaining = (debtRemaining.cashReceivableRemaining || 0) + (debtRemaining.deferredReceivableRemaining || 0);
  
  // الالتزامات (الديون علينا) = نقدي + آجل
  const totalPayables = (debtRemaining.cashPayable || 0) + (debtRemaining.deferredPayable || 0);
  const totalPayablesPaid = (debtRemaining.cashPayablePaid || 0) + (debtRemaining.deferredPayablePaid || 0);
  const totalPayablesRemaining = (debtRemaining.cashPayableRemaining || 0) + (debtRemaining.deferredPayableRemaining || 0);
  
  // الرصيد النهائي (صافي الديون)
  const netDebtBalance = totalReceivablesRemaining - totalPayablesRemaining;
  
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
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الأرصدة</h1>
            <p className="text-sm text-muted-foreground">إدارة صناديق العملات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSYPActive && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDisplayVersion}
                className="rounded-xl bg-muted/50 gap-1 text-xs"
                title="تبديل إصدار الليرة السورية"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{displayVersion === 'NEW' ? 'ل.س جديد' : 'ل.س قديم'}</span>
              </Button>
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={openCurrencyModal}
              className="rounded-xl bg-muted/50"
              title="إدارة العملات"
            >
              <Coins className="w-5 h-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="rounded-xl bg-muted/50"
            >
              <RefreshCcw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
            </Button>
          </motion.div>
        </div>
      </motion.div>

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

      {/* ============================================ */}
      {/* قسم الديون الجديد - الأصول والالتزامات */}
      {/* ============================================ */}
      <div className="space-y-3">
        {/* عنوان القسم مع زر إظهار/إخفاء التفاصيل */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">ملخص الديون</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebtDetails(!showDebtDetails)}
            className="gap-1 text-xs"
          >
            {showDebtDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                إخفاء التفاصيل
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                إظهار التفاصيل
              </>
            )}
          </Button>
        </div>

        {/* بطاقات الأصول والالتزامات */}
        <div className="grid grid-cols-2 gap-3">
          {/* بطاقة الأصول (الديون لنا) - أخضر فاتح */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-4 shadow-md border border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">الأصول (لنا)</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap overflow-hidden text-ellipsis" dir="ltr">
              {formatNumber(totalReceivablesRemaining)} $
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">المتبقي لنا</p>
          </motion.div>

          {/* بطاقة الالتزامات (الديون علينا) - أحمر فاتح */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-red-50 dark:bg-red-950/50 p-4 shadow-md border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 rotate-180 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">الالتزامات (علينا)</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300 whitespace-nowrap overflow-hidden text-ellipsis" dir="ltr">
              {formatNumber(totalPayablesRemaining)} $
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">المتبقي علينا</p>
          </motion.div>
        </div>

        {/* بطاقة صافي الديون - ديناميكي حسب القيمة */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "rounded-xl p-4 shadow-md border",
            netDebtBalance > 0
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
              : netDebtBalance < 0
                ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800"
                : "bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className={cn(
                "w-5 h-5",
                netDebtBalance > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : netDebtBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
              )} />
              <div>
                <p className={cn(
                  "text-sm",
                  netDebtBalance > 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : netDebtBalance < 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-gray-700 dark:text-gray-300"
                )}>صافي الديون</p>
                <p className={cn(
                  "text-xs",
                  netDebtBalance > 0
                    ? "text-emerald-600/70 dark:text-emerald-400/70"
                    : netDebtBalance < 0
                      ? "text-red-600/70 dark:text-red-400/70"
                      : "text-gray-600/70 dark:text-gray-400/70"
                )}>الأصول - الالتزامات</p>
              </div>
            </div>
            <div className="text-left">
              <p className={cn(
                "text-xl sm:text-2xl font-bold whitespace-nowrap",
                netDebtBalance > 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : netDebtBalance < 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-gray-700 dark:text-gray-300"
              )} dir="ltr">
                {netDebtBalance >= 0 ? '+' : ''}{formatNumber(netDebtBalance)} $
              </p>
              <p className={cn(
                "text-xs",
                netDebtBalance > 0
                  ? "text-emerald-600/70 dark:text-emerald-400/70"
                  : netDebtBalance < 0
                    ? "text-red-600/70 dark:text-red-400/70"
                    : "text-gray-600/70 dark:text-gray-400/70"
              )}>
                {netDebtBalance > 0 ? 'لصالحنا' : netDebtBalance < 0 ? 'علينا' : 'متوازن'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* تفاصيل الديون (قابلة للإظهار/الإخفاء) */}
        <AnimatePresence>
          {showDebtDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 overflow-hidden"
            >
              {/* تفاصيل الأصول */}
              <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  تفاصيل الأصول (لنا)
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">➜ الإجمالي:</span>
                    <span className="font-semibold text-emerald-600">{formatNumber(totalReceivables)} $</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">➜ مجموع المدفوع:</span>
                    <span className="font-medium text-emerald-600">{formatNumber(totalReceivablesPaid)} $</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-border">
                    <span>➜ المتبقي:</span>
                    <span className="text-emerald-600">{formatNumber(totalReceivablesRemaining)} $</span>
                  </div>
                </div>
              </div>

              {/* تفاصيل الالتزامات */}
              <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  تفاصيل الالتزامات (علينا)
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">➜ الإجمالي:</span>
                    <span className="font-semibold text-red-600">{formatNumber(totalPayables)} $</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">➜ مجموع المدفوع:</span>
                    <span className="font-medium text-red-600">{formatNumber(totalPayablesPaid)} $</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-border">
                    <span>➜ المتبقي:</span>
                    <span className="text-red-600">{formatNumber(totalPayablesRemaining)} $</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
