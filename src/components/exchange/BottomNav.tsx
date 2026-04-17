'use client';

import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Users,
  ArrowLeftRight,
  ArrowDownUp,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// الشريط السفلي: الأرصدة | الحسابات | الصرافة (في المنتصف) | الحركات | الديون
const tabs = [
  { id: 'balances' as const, label: 'الأرصدة', icon: Wallet },
  { id: 'accounts' as const, label: 'الحسابات', icon: Users },
  { id: 'exchange' as const, label: 'الصرافة', icon: ArrowLeftRight },
  { id: 'transactions' as const, label: 'الحركات', icon: ArrowDownUp },
  { id: 'debts' as const, label: 'الديون', icon: AlertCircle },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]',
                isActive 
                  ? 'text-emerald-500 dark:text-emerald-400' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  isActive && 'scale-110'
                )} />
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full"
                    />
                  )}
                </AnimatePresence>
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all duration-200',
                isActive && 'font-semibold text-emerald-500 dark:text-emerald-400'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
