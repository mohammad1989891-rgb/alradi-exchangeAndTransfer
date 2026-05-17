'use client';

import { useMemo, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Coins,
  Users,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  DollarSign,
  FileText,
  HandCoins,
  Banknote,
  Scale,
} from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { isSYPCurrency, formatSYPDualDisplay } from '@/lib/syp-conversion';
import { cn } from '@/lib/utils';

export function ReportsPage() {
  const {
    currencies,
    accounts,
    transactions,
    debts,
    debtPayments,
    currencyExchanges,
  } = useLocalData();

  // ============================================
  // 1. أكثر عملة تداولًا
  // ============================================
  const currencyStats = useMemo(() => {
    const map = new Map<string, { count: number; volume: number; name: string; code: string; symbol: string }>();

    // من الحركات
    transactions.forEach((t) => {
      const cur = currencies.find((c) => c.id === t.currencyId);
      if (!cur) return;
      const existing = map.get(cur.id) || { count: 0, volume: 0, name: cur.name, code: cur.code, symbol: cur.symbol };
      existing.count += 1;
      existing.volume += Math.abs(t.finalBalance);
      map.set(cur.id, existing);
    });

    // من عمليات الصرافة
    currencyExchanges.forEach((e) => {
      const outCur = currencies.find((c) => c.id === e.outgoingCurrencyId);
      const inCur = currencies.find((c) => c.id === e.incomingCurrencyId);
      if (outCur) {
        const existing = map.get(outCur.id) || { count: 0, volume: 0, name: outCur.name, code: outCur.code, symbol: outCur.symbol };
        existing.count += 1;
        existing.volume += Math.abs(e.outgoingUsd);
        map.set(outCur.id, existing);
      }
      if (inCur) {
        const existing = map.get(inCur.id) || { count: 0, volume: 0, name: inCur.name, code: inCur.code, symbol: inCur.symbol };
        existing.count += 1;
        existing.volume += Math.abs(e.incomingUsd);
        map.set(inCur.id, existing);
      }
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [transactions, currencyExchanges, currencies]);

  const mostTradedCurrency = currencyStats[0] || null;

  // ============================================
  // 2. أكثر حساب يتم التعامل معه
  // ============================================
  const accountStats = useMemo(() => {
    const map = new Map<string, { count: number; totalValue: number; name: string }>();

    transactions.forEach((t) => {
      const acc = accounts.find((a) => a.id === t.accountId);
      if (!acc) return;
      const existing = map.get(acc.id) || { count: 0, totalValue: 0, name: acc.name };
      existing.count += 1;
      existing.totalValue += Math.abs(t.finalBalance);
      map.set(acc.id, existing);
    });

    debts.forEach((d) => {
      const acc = accounts.find((a) => a.id === d.accountId);
      if (!acc) return;
      const existing = map.get(acc.id) || { count: 0, totalValue: 0, name: acc.name };
      existing.count += 1;
      existing.totalValue += Math.abs(d.finalBalance);
      map.set(acc.id, existing);
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [transactions, debts, accounts]);

  const mostActiveAccount = accountStats[0] || null;

  // ============================================
  // الأرصدة (كاش + آجل) حسب العملة
  // ============================================
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('cur_usd');

  // أرصدة الكاش حسب العملة
  const cashByCurrency = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach(t => {
      if (t.paymentType !== 'CASH') return;
      const curId = t.baseCurrencyId || t.currencyId;
      if (!curId) return;
      const existing = map.get(curId) || { income: 0, expense: 0 };
      if (t.type === 'INCOME') {
        existing.income += t.finalBalance;
      } else {
        existing.expense += t.finalBalance;
      }
      map.set(curId, existing);
    });
    return map;
  }, [transactions]);

  // أرصدة الآجل حسب العملة
  const deferredByCurrency = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach(t => {
      if (t.paymentType !== 'DEFERRED') return;
      const curId = t.baseCurrencyId || t.currencyId;
      if (!curId) return;
      const existing = map.get(curId) || { income: 0, expense: 0 };
      if (t.type === 'INCOME') {
        existing.income += t.finalBalance;
      } else {
        existing.expense += t.finalBalance;
      }
      map.set(curId, existing);
    });
    return map;
  }, [transactions]);

  // البيانات حسب العملة المختارة
  const selectedCurrency = useMemo(() => {
    return currencies.find(c => c.id === selectedCurrencyId) || { id: 'cur_usd', name: 'دولار', code: 'USD', symbol: '$' };
  }, [currencies, selectedCurrencyId]);

  const selectedCash = useMemo(() => {
    return cashByCurrency.get(selectedCurrencyId) || { income: 0, expense: 0 };
  }, [cashByCurrency, selectedCurrencyId]);

  const selectedDeferred = useMemo(() => {
    return deferredByCurrency.get(selectedCurrencyId) || { income: 0, expense: 0 };
  }, [deferredByCurrency, selectedCurrencyId]);

  // ============================================
  // 3. إحصائيات الديون
  // ============================================
  const unpaidDebts = useMemo(() => {
    return debts.filter((d) => !d.isPaid);
  }, [debts]);

  // الديون الأطول مدة (أقدم دين غير مسدد)
  const longestDebts = useMemo(() => {
    const now = new Date().getTime();
    return unpaidDebts
      .map((d) => {
        const debtDate = new Date(d.date).getTime();
        const daysSince = Math.floor((now - debtDate) / (1000 * 60 * 60 * 24));
        const acc = accounts.find((a) => a.id === d.accountId);
        const cur = currencies.find((c) => c.id === d.currencyId);
        return { ...d, daysSince, accountName: acc?.name || 'غير معروف', currencySymbol: cur?.symbol || '', currencyCode: cur?.code || '', currencyId: cur?.id || '' };
      })
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [unpaidDebts, accounts, currencies]);

  // الديون المتأخرة (أكثر من 30 يومًا بدون تسديد)
  const OVERDUE_THRESHOLD_DAYS = 30;
  const overdueDebts = useMemo(() => {
    return longestDebts.filter((d) => d.daysSince > OVERDUE_THRESHOLD_DAYS);
  }, [longestDebts]);

  // الديون طويلة الأمد (أكثر من 90 يومًا)
  const LONG_TERM_THRESHOLD_DAYS = 90;
  const longTermDebts = useMemo(() => {
    return longestDebts.filter((d) => d.daysSince > LONG_TERM_THRESHOLD_DAYS);
  }, [longestDebts]);

  // ============================================
  // ملخص سريع
  // ============================================
  const summaryStats = useMemo(() => {
    const totalTx = transactions.length;
    const totalExchanges = currencyExchanges.length;
    const totalDebtsCount = unpaidDebts.length;
    const totalOverdue = overdueDebts.length;
    const totalLongTerm = longTermDebts.length;

    const totalVolumeUSD = transactions.reduce((sum, t) => sum + Math.abs(t.finalBalance), 0);
    const totalExchangeVolumeUSD = currencyExchanges.reduce((sum, e) => sum + Math.abs(e.outgoingUsd), 0);

    return { totalTx, totalExchanges, totalDebtsCount, totalOverdue, totalLongTerm, totalVolumeUSD, totalExchangeVolumeUSD };
  }, [transactions, currencyExchanges, unpaidDebts, overdueDebts, longTermDebts]);

  const formatDays = (days: number) => {
    if (days < 30) return `${days} يوم`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      const remainDays = days % 30;
      return remainDays > 0 ? `${months} شهر و ${remainDays} يوم` : `${months} شهر`;
    }
    const years = Math.floor(days / 365);
    const remainMonths = Math.floor((days % 365) / 30);
    return remainMonths > 0 ? `${years} سنة و ${remainMonths} شهر` : `${years} سنة`;
  };

  const formatDebtAmount = (amount: number, currencyId: string, currencyCode: string) => {
    if (isSYPCurrency(currencyId, currencyCode)) {
      return formatSYPDualDisplay(Math.abs(amount));
    }
    return formatNumber(Math.abs(amount));
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
            <p className="text-sm text-muted-foreground">إحصائيات وتحليلات مفصلة</p>
          </div>
        </div>
      </motion.div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 text-white text-center shadow-md"
        >
          <ArrowRightLeft className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xl font-bold">{summaryStats.totalTx}</p>
          <p className="text-[10px] text-white/70">حركة</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 text-white text-center shadow-md"
        >
          <DollarSign className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xl font-bold">{summaryStats.totalExchanges}</p>
          <p className="text-[10px] text-white/70">صرفة</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "rounded-xl p-3 text-white text-center shadow-md",
            summaryStats.totalOverdue > 0
              ? "bg-gradient-to-br from-red-500 to-rose-500"
              : "bg-gradient-to-br from-amber-500 to-orange-500"
          )}
        >
          <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xl font-bold">{summaryStats.totalDebtsCount}</p>
          <p className="text-[10px] text-white/70">دين غير مسدد</p>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* 🔹 ملخص الأرصدة (كاش + آجل) حسب العملة */}
      {/* ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl bg-card border border-border p-4 space-y-3"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">ملخص الأرصدة</h2>
              <p className="text-xs text-muted-foreground">كاش وآجل حسب العملة</p>
            </div>
          </div>
          {/* Dropdown اختيار العملة */}
          <select
            value={selectedCurrencyId}
            onChange={(e) => setSelectedCurrencyId(e.target.value)}
            className="text-sm rounded-lg border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-[140px]"
          >
            {currencies.filter(c => c.isActive).map(cur => (
              <option key={cur.id} value={cur.id}>
                {cur.name} ({cur.code})
              </option>
            ))}
          </select>
        </div>

        {/* 🔸 قسم الكاش */}
        <div className="flex items-center gap-2 pt-1">
          <Banknote className="w-4 h-4 text-teal-500" />
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">أرصدة الكاش</span>
        </div>

        {/* الرصيد الكاش لنا */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400 truncate">الكاش لنا</p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">الحركات النقدية الواردة</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap flex-shrink-0 mr-2" dir="ltr">
            {formatNumber(selectedCash.income)} {selectedCurrency.symbol}
          </p>
        </div>

        {/* الرصيد الكاش علينا */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 flex-shrink-0">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-red-700 dark:text-red-400 truncate">الكاش علينا</p>
              <p className="text-[10px] text-red-600/70 dark:text-red-400/70">الحركات النقدية الصادرة</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 whitespace-nowrap flex-shrink-0 mr-2" dir="ltr">
            {formatNumber(selectedCash.expense)} {selectedCurrency.symbol}
          </p>
        </div>

        {/* فاصل */}
        <div className="border-t border-border" />

        {/* 🔸 قسم الآجل */}
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">أرصدة الآجل</span>
        </div>

        {/* الرصيد الآجل لنا */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400 truncate">الآجل لنا</p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">الحركات الآجلة الواردة</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap flex-shrink-0 mr-2" dir="ltr">
            {formatNumber(selectedDeferred.income)} {selectedCurrency.symbol}
          </p>
        </div>

        {/* الرصيد الآجل علينا */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 flex-shrink-0">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-red-700 dark:text-red-400 truncate">الآجل علينا</p>
              <p className="text-[10px] text-red-600/70 dark:text-red-400/70">الحركات الآجلة الصادرة</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 whitespace-nowrap flex-shrink-0 mr-2" dir="ltr">
            {formatNumber(selectedDeferred.expense)} {selectedCurrency.symbol}
          </p>
        </div>
      </motion.div>

      {/* أكثر عملة تداولًا */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl bg-card border border-border p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">أكثر العملات تداولًا</h2>
            <p className="text-xs text-muted-foreground">بناءً على عدد العمليات</p>
          </div>
        </div>

        {currencyStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات كافية</p>
        ) : (
          <div className="space-y-2">
            {currencyStats.slice(0, 5).map((cur, index) => (
              <div
                key={cur.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl",
                  index === 0 ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" : "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    index === 0 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", index === 0 && "text-blue-700 dark:text-blue-400")}>
                      {cur.name} ({cur.code})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cur.count} عملية
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={cn("text-sm font-semibold", index === 0 && "text-blue-700 dark:text-blue-400")} dir="ltr">
                    {formatNumber(cur.volume)} $
                  </p>
                  <p className="text-[10px] text-muted-foreground">حجم التداول</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* أكثر حساب نشاطًا */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-card border border-border p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">أكثر الحسابات نشاطًا</h2>
            <p className="text-xs text-muted-foreground">بناءً على عدد العمليات</p>
          </div>
        </div>

        {accountStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات كافية</p>
        ) : (
          <div className="space-y-2">
            {accountStats.slice(0, 5).map((acc, index) => (
              <div
                key={acc.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl",
                  index === 0 ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800" : "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    index === 0 ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", index === 0 && "text-purple-700 dark:text-purple-400")}>
                      {acc.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {acc.count} عملية
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={cn("text-sm font-semibold", index === 0 && "text-purple-700 dark:text-purple-400")} dir="ltr">
                    {formatNumber(acc.totalValue)} $
                  </p>
                  <p className="text-[10px] text-muted-foreground">إجمالي القيم</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* إحصائيات الديون */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-card border border-border p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">إحصائيات الديون</h2>
            <p className="text-xs text-muted-foreground">الديون المتأخرة وطويلة الأمد</p>
          </div>
        </div>

        {/* شريط ملخص الديون */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <p className="text-lg font-bold text-amber-600">{summaryStats.totalDebtsCount}</p>
            <p className="text-[10px] text-amber-600/70">غير مسدد</p>
          </div>
          <div className={cn(
            "text-center p-3 rounded-xl",
            summaryStats.totalOverdue > 0
              ? "bg-red-50 dark:bg-red-950/30"
              : "bg-muted/50"
          )}>
            <p className={cn(
              "text-lg font-bold",
              summaryStats.totalOverdue > 0 ? "text-red-600" : "text-muted-foreground"
            )}>{summaryStats.totalOverdue}</p>
            <p className={cn(
              "text-[10px]",
              summaryStats.totalOverdue > 0 ? "text-red-600/70" : "text-muted-foreground"
            )}>متأخرة +30 يوم</p>
          </div>
          <div className={cn(
            "text-center p-3 rounded-xl",
            summaryStats.totalLongTerm > 0
              ? "bg-orange-50 dark:bg-orange-950/30"
              : "bg-muted/50"
          )}>
            <p className={cn(
              "text-lg font-bold",
              summaryStats.totalLongTerm > 0 ? "text-orange-600" : "text-muted-foreground"
            )}>{summaryStats.totalLongTerm}</p>
            <p className={cn(
              "text-[10px]",
              summaryStats.totalLongTerm > 0 ? "text-orange-600/70" : "text-muted-foreground"
            )}>طويلة الأمد +90 يوم</p>
          </div>
        </div>

        {/* قائمة الديون المتأخرة والأطول مدة */}
        {longestDebts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد ديون غير مسددة</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {longestDebts.slice(0, 15).map((debt) => {
              const isOverdue = debt.daysSince > OVERDUE_THRESHOLD_DAYS;
              const isLongTerm = debt.daysSince > LONG_TERM_THRESHOLD_DAYS;

              return (
                <div
                  key={debt.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border",
                    isLongTerm
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                      : isOverdue
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                        : "bg-muted/50 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      isLongTerm
                        ? "bg-orange-500/10 text-orange-500"
                        : isOverdue
                          ? "bg-red-500/10 text-red-500"
                          : "bg-amber-500/10 text-amber-500"
                    )}>
                      {isLongTerm ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isOverdue ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{debt.accountName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {debt.debtType === 'RECEIVABLE' ? 'لنا' : 'علينا'}
                        {' • '}
                        {debt.debtMode === 'CASH' ? 'نقدي' : 'آجل'}
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0 mr-2">
                    <p className="text-sm font-semibold" dir="ltr">
                      {formatDebtAmount(debt.finalBalance, debt.currencyId, debt.currencyCode)} {debt.currencySymbol}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {isLongTerm && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                          طويلة الأمد
                        </span>
                      )}
                      {isOverdue && !isLongTerm && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          متأخرة
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px]",
                        isLongTerm ? "text-orange-600" : isOverdue ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {formatDays(debt.daysSince)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
