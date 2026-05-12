'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import type { Vault, Currency } from '@/lib/localDb';
import { useAppStore } from '@/store/useAppStore';
import { useSYPSettings } from '@/store/useSYPSettings';
import { isSYPCurrency, formatSYPDualDisplay, getSypPerUnitRate } from '@/lib/syp-conversion';

interface VaultCardProps {
  vault: Vault;
  index: number;
}

export function VaultCard({ vault, index }: VaultCardProps) {
  const balance = vault.balance || 0;
  const openingBalance = vault.openingBalance || 0;
  const isPositive = balance >= 0;
  const { openVaultQuery, openOpeningBalanceModal, currencies } = useAppStore();
  
  // Find currency for this vault
  const currency = currencies.find((c: Currency) => c.id === vault.currencyId);
  const { displayVersion } = useSYPSettings();
  const isSYP = isSYPCurrency(currency?.id, currency?.code);
  
  // SYP display formatting - show BOTH versions
  const balanceDualDisplay = isSYP
    ? formatSYPDualDisplay(Math.abs(balance))
    : null;
  const openingBalanceDualDisplay = isSYP
    ? formatSYPDualDisplay(Math.abs(openingBalance))
    : null;
  // لعرض "كم ليرة = 1 دولار" نستخدم الدالة المخصصة التي تحسب 1/exchangeRate مع التحويل
  const displayRate = isSYP
    ? getSypPerUnitRate(currency?.exchangeRate || 0, displayVersion)
    : currency?.exchangeRate || 1;
  
  // Calculate balance in USD using the correct conversion method
  const balanceInUSD = currency 
    ? (currency.conversionMethod === 'DIVIDE' 
        ? balance / currency.exchangeRate 
        : balance * currency.exchangeRate)
    : 0;
  const showUSDConversion = currency && currency.code !== 'USD' && currency.exchangeRate !== 1;
  
  // Get gradient colors based on currency
  const getGradient = () => {
    const gradients: Record<string, string> = {
      'USD': 'from-emerald-500/10 to-emerald-600/5',
      'EUR': 'from-blue-500/10 to-blue-600/5',
      'GBP': 'from-purple-500/10 to-purple-600/5',
      'SAR': 'from-green-500/10 to-green-600/5',
      'AED': 'from-cyan-500/10 to-cyan-600/5',
      'KWD': 'from-amber-500/10 to-amber-600/5',
      'BHD': 'from-orange-500/10 to-orange-600/5',
      'QAR': 'from-rose-500/10 to-rose-600/5',
      'OMR': 'from-teal-500/10 to-teal-600/5',
      'JOD': 'from-indigo-500/10 to-indigo-600/5',
      'EGP': 'from-yellow-500/10 to-yellow-600/5',
      'TRY': 'from-red-500/10 to-red-600/5',
      'default': 'from-gray-500/10 to-gray-600/5',
    };
    return gradients[currency?.code || ''] || gradients['default'];
  };
  
  const handleCardClick = () => {
    openVaultQuery(vault);
  };
  
  const handleEditOpeningBalance = (e: React.MouseEvent) => {
    e.stopPropagation();
    openOpeningBalanceModal(vault);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={handleCardClick}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br border border-border/50 p-4 shadow-sm',
        'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-300',
        getGradient()
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-current" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-current" />
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold',
              'bg-background/80 backdrop-blur-sm shadow-sm'
            )}>
              {currency?.symbol || '$'}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                {currency?.name || 'غير معروف'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {currency?.code || '---'}
              </p>
            </div>
          </div>
          
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
              <Wallet className="w-4 h-4" />
            </button>
            
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
        
        {/* Opening Balance */}
        {openingBalance !== 0 && (
          <div className="mb-3 pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">رصيد أول المدة</span>
              <span className={cn(
                'text-sm font-medium',
                openingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {openingBalance >= 0 ? '' : '-'}{formatNumber(Math.abs(openingBalance))} {currency?.symbol}
              </span>
              {openingBalanceDualDisplay && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{openingBalanceDualDisplay}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Balance */}
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">الرصيد الحالي</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-2xl font-bold tracking-tight',
              isPositive ? 'text-foreground' : 'text-red-500'
            )}>
              {isPositive ? '' : '-'}{formatNumber(Math.abs(balance))}
            </span>
            <span className="text-sm text-muted-foreground">
              {currency?.symbol}
            </span>
          </div>
          {balanceDualDisplay && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{balanceDualDisplay}</p>
          )}
          
          {/* USD Conversion */}
          {showUSDConversion && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>يعادل {formatNumber(balanceInUSD, 2)} USD</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isSYP ? (
                  // لليرة السورية: عرض الإصدارين معاً
                  <>{formatNumber(getSypPerUnitRate(currency?.exchangeRate || 0, 'OLD'), 0)} (قديم) / {formatNumber(getSypPerUnitRate(currency?.exchangeRate || 0, 'NEW'), 2)} (جديد) = 1 $</>
                ) : currency?.conversionMethod === 'DIVIDE' ? (
                  <>{formatNumber(displayRate, 4)} {currency?.code} = 1 $</>
                ) : (
                  <>1 {currency?.code} = {formatNumber(displayRate, 4)} $</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Click indicator */}
      <div className="absolute bottom-2 left-4 text-[10px] text-muted-foreground/50">
        اضغط للتفاصيل
      </div>
    </motion.div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: number;
  currency: string;
  type: 'income' | 'expense' | 'debt';
  index: number;
}

export function SummaryCard({ title, value, currency, type, index }: SummaryCardProps) {
  const typeStyles = {
    income: {
      bg: 'bg-emerald-500/10',
      icon: TrendingUp,
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/20',
    },
    expense: {
      bg: 'bg-red-500/10',
      icon: TrendingDown,
      text: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/20',
    },
    debt: {
      bg: 'bg-amber-500/10',
      icon: TrendingDown,
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/20',
    },
  };
  
  const style = typeStyles[type];
  const Icon = style.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={cn(
        'rounded-xl p-4 border border-border/50',
        style.bg
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', style.iconBg)}>
          <Icon className={cn('w-5 h-5', style.text)} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={cn('text-lg font-semibold', style.text)}>
            {formatNumber(value)} {currency}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
