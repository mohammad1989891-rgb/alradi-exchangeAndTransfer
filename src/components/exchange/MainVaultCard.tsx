'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Crown, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import type { Vault } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface MainVaultCardProps {
  vault: Vault | null;
  subVaults: Vault[];
  mainCurrencySymbol: string;
  mainCurrencyName: string;
  index: number;
}

export function MainVaultCard({ vault, subVaults, mainCurrencySymbol, mainCurrencyName, index }: MainVaultCardProps) {
  const { openVaultQuery, openOpeningBalanceModal } = useAppStore();
  
  // Calculate total from sub-vaults (converted to main currency)
  const totalFromSubVaults = subVaults.reduce((total, subVault) => {
    const subBalance = subVault.balance || 0;
    const factor = subVault.conversionFactorToMain || 1;
    // For now, we assume the stored factor is always for multiplication
    // The conversion method is handled in the vault card
    const converted = subBalance * factor;
    return total + converted;
  }, 0);
  
  // Main vault balance (if exists)
  const mainVaultBalance = vault?.balance || 0;
  const openingBalance = vault?.openingBalance || 0;
  
  // Total = main vault balance + converted sub-vaults
  const grandTotal = mainVaultBalance + totalFromSubVaults;
  const isPositive = grandTotal >= 0;
  
  const handleCardClick = () => {
    if (vault) {
      openVaultQuery(vault);
    }
  };
  
  const handleEditOpeningBalance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vault) {
      openOpeningBalanceModal(vault);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={handleCardClick}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br border-2 border-primary/30 p-4 shadow-lg',
        'hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-300',
        'from-primary/10 via-primary/5 to-background'
      )}
    >
      {/* Crown Badge */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
        <div className="flex items-center gap-1 bg-primary/20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1">
          <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          <span className="text-[10px] sm:text-xs font-medium text-primary">الصندوق الرئيسي</span>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute -top-4 -right-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-current" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-current" />
      </div>
      
      <div className="relative z-10 mt-6 sm:mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold',
              'bg-background/80 backdrop-blur-sm shadow-md'
            )}>
              {mainCurrencySymbol}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base sm:text-lg">
                {mainCurrencyName}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                إجمالي الأرصدة
              </p>
            </div>
          </div>
          
          {vault && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditOpeningBalance}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'hover:bg-background/60 active:scale-95',
                  openingBalance !== 0 ? 'text-primary' : 'text-muted-foreground'
                )}
                title="تعديل رصيد أول المدة"
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {isPositive ? (
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        {/* Opening Balance */}
        {vault && openingBalance !== 0 && (
          <div className="mb-3 pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">رصيد أول المدة</span>
              <span className={cn(
                'text-sm sm:text-base font-medium',
                openingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {openingBalance >= 0 ? '' : '-'}{formatNumber(Math.abs(openingBalance))} {mainCurrencySymbol}
              </span>
            </div>
          </div>
        )}
        
        {/* Grand Total */}
        <div className="mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">الرصيد الإجمالي</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-3xl sm:text-4xl font-bold tracking-tight',
              isPositive ? 'text-foreground' : 'text-red-500'
            )}>
              {isPositive ? '' : '-'}{formatNumber(Math.abs(grandTotal))}
            </span>
            <span className="text-base sm:text-lg text-muted-foreground">
              {mainCurrencySymbol}
            </span>
          </div>
        </div>
        
        {/* Sub-vaults Summary */}
        {subVaults.length > 0 && (
          <div className="pt-3 sm:pt-4 border-t border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">تفاصيل الصناديق الفرعية</span>
            </div>
            <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {subVaults.map((subVault) => {
                const factor = subVault.conversionFactorToMain || 1;
                const converted = (subVault.balance || 0) * factor;
                return (
                  <div key={subVault.id} className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{subVault.currency?.symbol}</span>
                      <span className="text-xs text-muted-foreground">{subVault.currency?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatNumber(subVault.balance || 0)} × {formatNumber(factor, 4)}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        = {formatNumber(converted)} {mainCurrencySymbol}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30 bg-primary/5 rounded-lg px-3 py-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">مجموع الصناديق الفرعية</span>
              <span className="text-sm sm:text-base font-bold text-primary">
                {formatNumber(totalFromSubVaults)} {mainCurrencySymbol}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Click indicator */}
      {vault && (
        <div className="absolute bottom-2 left-4 text-[10px] text-muted-foreground/50">
          اضغط للتفاصيل
        </div>
      )}
    </motion.div>
  );
}
