'use client';

import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Wallet,
  BarChart3,
  BookOpen,
  Coins,
  PiggyBank,
  ShieldCheck,
  Car,
} from 'lucide-react';
import { motion } from 'framer-motion';

const menuItems = [
  {
    id: 'vault-query',
    title: 'استعلام رصيد الصناديق',
    description: 'عرض رصيد كل صندوق بالتفصيل',
    icon: Wallet,
    color: 'bg-blue-500',
  },
  {
    id: 'opening-balance',
    title: 'رصيد أول المدة',
    description: 'تعديل أرصدة أول المدة للصناديق',
    icon: PiggyBank,
    color: 'bg-orange-500',
  },
  {
    id: 'account-statement',
    title: 'كشف حساب دفتر الأستاذ',
    description: 'كشف حساب مفصل لكل حساب',
    icon: BookOpen,
    color: 'bg-purple-500',
  },
  {
    id: 'vehicles',
    title: 'المركبات',
    description: 'إدارة شراكات المركبات',
    icon: Car,
    color: 'bg-cyan-500',
  },
  {
    id: 'currencies',
    title: 'إدارة العملات',
    description: 'إضافة وحذف العملات',
    icon: Coins,
    color: 'bg-teal-500',
  },
  {
    id: 'reports',
    title: 'التقارير',
    description: 'تقارير إحصائية مفصلة',
    icon: BarChart3,
    color: 'bg-green-500',
  },
];

export function SideMenu() {
  const { isSideMenuOpen, closeSideMenu, openVaultQuery, openAccountStatement, openCurrencyModal, openOpeningBalanceModal, setActiveTab } = useAppStore();

  const handleMenuClick = (id: string) => {
    switch (id) {
      case 'vault-query':
        openVaultQuery();
        break;
      case 'account-statement':
        openAccountStatement();
        break;
      case 'currencies':
        openCurrencyModal();
        break;
      case 'opening-balance':
        openOpeningBalanceModal();
        break;
      case 'vehicles':
        setActiveTab('vehicles');
        break;
      case 'reports':
        setActiveTab('reports');
        break;
    }
    closeSideMenu();
  };

  return (
    <>
      <Sheet open={isSideMenuOpen} onOpenChange={closeSideMenu}>
        <SheetContent side="right" className="w-[320px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle className="text-xl">القائمة الرئيسية</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleMenuClick(item.id)}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-xl',
                    'bg-card border border-border hover:border-primary/50',
                    'transition-all duration-200 text-right',
                    'hover:shadow-md active:scale-[0.98]'
                  )}
                >
                  <div className={cn('p-2.5 rounded-lg text-white', item.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* Help Section */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">بياناتك محفوظة تلقائياً</p>
                  <p className="text-[10px] text-muted-foreground">الإصدار 1.0.0</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
