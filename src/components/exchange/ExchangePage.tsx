'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useData } from '@/contexts/DataProvider';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Clock, CalendarX } from 'lucide-react';
import { ExchangeCard } from './ExchangeCard';
import { DateFilter, DateFilterValue, isDateInRange } from './DateFilter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ExchangePage() {
  const { openExchangeModal } = useAppStore();
  const { currencies, exchanges, deleteExchange } = useData();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'single' });
  
  const hasDateFilter = dateFilter.startDate || dateFilter.endDate;
  
  // Sort exchanges by date (newest first) and apply date filter
  const sortedExchanges = useMemo(() => {
    let filtered = exchanges;
    
    // Apply date filter using helper function
    if (hasDateFilter) {
      filtered = exchanges.filter(exchange => 
        isDateInRange(exchange.date, dateFilter)
      );
    }
    
    return [...filtered].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [exchanges, dateFilter, hasDateFilter]);
  
  // Calculate total profit
  const totalProfit = useMemo(() => {
    return sortedExchanges.reduce((sum, exchange) => sum + exchange.profit, 0);
  }, [sortedExchanges]);
  
  // Handle delete exchange
  const handleDeleteExchange = async (id: string) => {
    try {
      await deleteExchange(id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف عملية الصرف بنجاح',
        className: 'bg-emerald-500 text-white'
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الحذف',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-md"
        >
          <p className="text-sm text-white/80">إجمالي العمليات</p>
          <p className="text-2xl font-bold">{sortedExchanges.length}</p>
          <p className="text-xs text-white/60 mt-1">عملية صرف</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl p-4 text-white shadow-md ${
            totalProfit >= 0 
              ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
              : 'bg-gradient-to-br from-red-500 to-rose-500'
          }`}
        >
          <p className="text-sm text-white/80">إجمالي الربح</p>
          <p className="text-2xl font-bold">
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} $
          </p>
          <p className="text-xs text-white/60 mt-1">USD</p>
        </motion.div>
      </div>
      
      {/* Add Button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={openExchangeModal}
          className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
        >
          <Plus className="w-5 h-5 ml-2" />
          عملية صرف جديدة
        </Button>
      </motion.div>
      
      {/* Date Filter */}
      <DateFilter
        value={dateFilter}
        onChange={setDateFilter}
        className="w-full"
      />
      
      {/* Exchanges List */}
      {sortedExchanges.length === 0 ? (
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
                  <div className="p-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900">
                    <RefreshCw className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">لا توجد عمليات صرف</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      اضغط على زر "عملية صرف جديدة" لإضافة عملية
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
            <Clock className="w-4 h-4" />
          </div>
          <AnimatePresence mode="popLayout">
            {sortedExchanges.map((exchange) => (
              <ExchangeCard
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
