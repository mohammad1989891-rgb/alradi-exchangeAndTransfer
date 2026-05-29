'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  CalendarX,
  Calculator,
  DollarSign,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyExchangeCard } from './CurrencyExchangeCard';
import {
  getCurrencyExchanges,
  getExchangeStats,
  deleteCurrencyExchange,
  CurrencyExchange,
} from '@/lib/supabaseDb';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export function CurrencyExchangePage() {
  const { openExchangeModal } = useAppStore();
  const { currencies, refreshData } = useSupabaseData();
  const { toast } = useToast();

  const [exchanges, setExchanges] = useState<CurrencyExchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stats, setStats] = useState({
    totalExchanges: 0,
    totalProfit: 0,
    totalOutgoingUsd: 0,
    totalIncomingUsd: 0,
    profitCount: 0,
    lossCount: 0,
  });

  const hasDateFilter = fromDate || toDate;

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  // Load exchanges
  const loadExchanges = async () => {
    setIsLoading(true);
    try {
      const [exchangeData, statsData] = await Promise.all([
        getCurrencyExchanges(200),
        getExchangeStats(),
      ]);
      setExchanges(exchangeData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load exchanges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExchanges();
  }, []);

  // Refresh when data changes
  useEffect(() => {
    const handleRefresh = () => {
      loadExchanges();
    };
    // Listen for data refresh events
    window.addEventListener('exchange-refresh', handleRefresh);
    return () => window.removeEventListener('exchange-refresh', handleRefresh);
  }, []);

  // Filter exchanges by date
  const filteredExchanges = useMemo(() => {
    if (!hasDateFilter) return exchanges;

    return exchanges.filter(exchange => {
      let matchesDate = true;
      const exDate = new Date(exchange.date);
      exDate.setHours(0, 0, 0, 0);
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && exDate >= from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && exDate <= to;
      }
      return matchesDate;
    });
  }, [exchanges, fromDate, toDate, hasDateFilter]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    if (!hasDateFilter) return stats;

    return {
      totalExchanges: filteredExchanges.length,
      totalProfit: filteredExchanges.reduce((sum, e) => sum + e.profit, 0),
      totalOutgoingUsd: filteredExchanges.reduce((sum, e) => sum + e.outgoingUsd, 0),
      totalIncomingUsd: filteredExchanges.reduce((sum, e) => sum + e.incomingUsd, 0),
      profitCount: filteredExchanges.filter(e => e.profit > 0).length,
      lossCount: filteredExchanges.filter(e => e.profit < 0).length,
    };
  }, [filteredExchanges, stats, hasDateFilter]);

  // Handle delete exchange
  const handleDeleteExchange = async (id: string) => {
    try {
      await deleteCurrencyExchange(id);
      await loadExchanges();
      await refreshData();

      toast({
        title: 'تم الحذف',
        description: 'تم حذف عملية الصرف وإعادة الأرصدة',
        className: 'bg-emerald-500 text-white',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف',
        variant: 'destructive',
      });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    await loadExchanges();
    await refreshData();
  };

  // Sort by date (newest first), ثم بوقت الإنشاء كعامل ثانوي
  const sortedExchanges = useMemo(() => {
    return [...filteredExchanges].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // ترتيب ثانوي: الأحدث إنشاءً أولاً عند تساوي التاريخ
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredExchanges]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الصرافة</h1>
            <p className="text-sm text-muted-foreground">عمليات التحويل والتبديل</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-4 text-white shadow-md"
        >
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-4 h-4" />
            <p className="text-sm text-white/80">إجمالي العمليات</p>
          </div>
          <p className="text-2xl font-bold">{filteredStats.totalExchanges}</p>
          <div className="flex gap-2 mt-1 text-xs text-white/70">
            <span>{filteredStats.profitCount} ربح</span>
            <span>|</span>
            <span>{filteredStats.lossCount} خسارة</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl p-4 text-white shadow-md ${
            filteredStats.totalProfit >= 0
              ? 'bg-gradient-to-br from-green-500 to-emerald-500'
              : 'bg-gradient-to-br from-red-500 to-rose-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {filteredStats.totalProfit >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <p className="text-sm text-white/80">صافي الربح</p>
          </div>
          <p className="text-2xl font-bold">
            {filteredStats.totalProfit >= 0 ? '+' : ''}{filteredStats.totalProfit.toFixed(2)} $
          </p>
          <p className="text-xs text-white/70 mt-1">USD</p>
        </motion.div>
      </div>

      {/* Add Button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={openExchangeModal}
          className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg"
        >
          <Plus className="w-5 h-5 ml-2" />
          عملية صرف جديدة
        </Button>
      </motion.div>

      {/* Date Filter - نفس أسلوب قسم الحركات */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        {hasDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateFilter}
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Exchange List */}
      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
            <p className="text-muted-foreground">جاري التحميل...</p>
          </CardContent>
        </Card>
      ) : sortedExchanges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              {hasDateFilter ? (
                <>
                  <div className="p-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900">
                    <CalendarX className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">لا توجد عمليات في هذه الفترة</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      جرب تغيير الفلتر أو اختر فترة زمنية أخرى
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                    <ArrowRightLeft className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">لا توجد عمليات صرف</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      اضغط على زر "عملية صرف جديدة" للبدء
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              {hasDateFilter 
                ? `نتائج الفلتر (${sortedExchanges.length})`
                : `عمليات الصرف (${sortedExchanges.length})`
              }
            </span>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-3 h-3 ml-1" />
              تحديث
            </Button>
          </div>
          <AnimatePresence mode="popLayout">
            {sortedExchanges.map((exchange) => (
              <CurrencyExchangeCard
                key={exchange.id}
                exchange={exchange}
                currencies={currencies}
                onDelete={handleDeleteExchange}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
