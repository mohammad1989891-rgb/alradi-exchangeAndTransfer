'use client';

import { useEffect, useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Activity, Wallet } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { formatCurrency } from '@/lib/api';

export function Header() {
  const { stats } = useAppStore();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative overflow-hidden">
      {/* Main Header - Compact with subtle gradient */}
      <div className="bg-gradient-to-l from-emerald-700 via-emerald-600 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-1 ring-1 ring-white/20">
                  <img src="/logo.png" alt="الراضي" className="h-10 w-10 rounded-lg object-cover" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                  الراضي للصرافة والحوالات
                </h1>
                <p className="text-emerald-200/80 text-xs mt-0.5 font-light">
                  Al-Radhi Exchange & Remittances
                </p>
              </div>
            </div>

            {/* Clock */}
            <div className="hidden sm:flex items-center gap-2 bg-white/8 backdrop-blur-sm rounded-lg px-3 py-1.5 ring-1 ring-white/10">
              <Clock className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs text-emerald-100">{currentTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar - Sleek strip */}
      <div className="bg-emerald-800/70 border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
              <div className="bg-amber-500/20 rounded-md p-1">
                <Activity className="h-3 w-3 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-emerald-300/70 text-xs">معاملات اليوم</span>
                <span className="font-bold text-white text-sm">{stats.todayTransactions}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
              <div className="bg-emerald-500/20 rounded-md p-1">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-emerald-300/70 text-xs">التحويلات</span>
                <span className="font-bold text-white text-sm">{formatCurrency(stats.transferAmount, 'SYP')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
              <div className="bg-orange-500/20 rounded-md p-1">
                <TrendingDown className="h-3 w-3 text-orange-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-emerald-300/70 text-xs">معلقة</span>
                <span className="font-bold text-amber-400 text-sm">{stats.pendingTransactions}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
              <div className="bg-teal-500/20 rounded-md p-1">
                <Wallet className="h-3 w-3 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-emerald-300/70 text-xs">الرصيد</span>
                <span className="font-bold text-white text-sm">{formatCurrency(stats.availableBalance, 'SYP')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom edge */}
      <div className="h-0.5 bg-gradient-to-l from-amber-500/40 via-amber-400/60 to-amber-500/40" />
    </header>
  );
}
