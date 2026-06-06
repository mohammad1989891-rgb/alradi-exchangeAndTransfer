'use client';

import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { Wallet, Plus, DollarSign, Coins, RefreshCcw } from 'lucide-react';
import { VaultCard } from './VaultCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import type { Vault } from '@/lib/supabaseDb';
// 🔸 ملاحظة: تم نقل قسم ملخص الديون وتفاصيل الديون إلى صفحة التقارير (ReportsPage)

export function BalancesPage() {
  const { isLoading, setIsLoading, openCurrencyModal } = useAppStore();
  // استخدام البيانات من useLocalData مباشرة لضمان التحديث الفوري
  const { refreshData, totalBalanceUSD, vaults, currencies } = useSupabaseData();

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshData();
    setIsLoading(false);
  };

  // ============================================
  // حساب إجمالي الأرصدة الصحيح
  // ============================================
  // إجمالي الأرصدة = أرصدة الصناديق النقدية فقط
  // الديون الآجلة لا تدخل في الحساب لأنها غير نقدية
  // الديون النقدية أثرت بالفعل على الصناديق عند إضافتها

  // إجمالي الأرصدة النهائي = أرصدة الصناديق فقط (النقد الفعلي)
  // لا نضيف الديون الآجلة لأنها التزامات/مستحقات غير نقدية
  const finalTotalBalance = totalBalanceUSD;
  
  // Get active vaults only
  const activeVaults = vaults.filter((v: Vault) =>
    currencies.some(c => c.id === v.currencyId && c.isActive)
  );

  return (
    <div className="space-y-6 pb-4">
      {/* Header — Sticky */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/30"
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
          <DollarSign className="w-5 h-5 text-white/60" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">
            {formatNumber(finalTotalBalance)}
          </span>
          <span className="text-xl text-white/80">$</span>
        </div>

        <div className="text-xs text-white/60 mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>عدد الصناديق المفعلة: {activeVaults.length}</span>
        </div>
      </motion.div>

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
