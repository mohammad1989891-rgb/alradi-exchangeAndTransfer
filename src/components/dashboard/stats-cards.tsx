'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ArrowRightLeft, Clock, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { formatCurrency } from '@/lib/api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function StatsCards() {
  const { stats } = useAppStore();

  const cards = [
    {
      title: 'إجمالي المعاملات اليوم',
      value: stats.todayTransactions.toString(),
      subtitle: 'معاملة',
      icon: ArrowRightLeft,
      accentColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
    },
    {
      title: 'مبلغ التحويلات',
      value: formatCurrency(stats.transferAmount, 'SYP'),
      subtitle: 'اليوم',
      icon: TrendingUp,
      accentColor: 'bg-amber-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
    },
    {
      title: 'الحركات غير المكتملة',
      value: stats.pendingTransactions.toString(),
      subtitle: 'بانتظار المراجعة',
      icon: Clock,
      accentColor: 'bg-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-700',
    },
    {
      title: 'الرصيد المتاح',
      value: formatCurrency(stats.availableBalance, 'SYP'),
      subtitle: 'الرصيد الحالي',
      icon: Wallet,
      accentColor: 'bg-teal-500',
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      valueColor: 'text-teal-700',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => (
        <motion.div key={card.title} variants={item}>
          <Card className="card-hover overflow-hidden border border-gray-100 shadow-sm bg-white">
            <CardContent className="p-0">
              {/* Accent bar */}
              <div className={`h-1 ${card.accentColor}`} />
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground text-xs font-medium mb-1.5 truncate">
                      {card.title}
                    </p>
                    <p className={`text-xl sm:text-2xl font-bold ${card.valueColor} leading-tight truncate`}>
                      {card.value}
                    </p>
                    <p className="text-muted-foreground/60 text-[11px] mt-1">
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={`${card.iconBg} rounded-xl p-2.5 shrink-0`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
