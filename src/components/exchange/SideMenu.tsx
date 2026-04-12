'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Wallet,
  Calculator,
  Printer,
  BarChart3,
  BookOpen,
  HelpCircle,
  Coins,
  PiggyBank,
  LogOut,
  ShieldCheck,
  Car,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

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
  {
    id: 'calculators',
    title: 'الآلات الحاسبة',
    description: 'حساب التحويلات والأجور',
    icon: Calculator,
    color: 'bg-amber-500',
  },
];

export function SideMenu() {
  const { isSideMenuOpen, closeSideMenu, openVaultQuery, openAccountStatement, openCurrencyModal, openOpeningBalanceModal, setActiveTab } = useAppStore();
  const { toast } = useToast();
  const [showExitDialog, setShowExitDialog] = useState(false);
  
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
    }
    closeSideMenu();
  };
  
  const handleExit = () => {
    setShowExitDialog(true);
  };
  
  const handleConfirmExit = () => {
    // Close the app - in PWA this will minimize/close
    window.close();
    // Fallback for browsers that don't allow window.close
    setShowExitDialog(false);
    closeSideMenu();
    toast({
      title: 'يمكنك إغلاق التطبيق الآن',
      description: 'بياناتك محفوظة بأمان',
    });
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
          
          {/* Exit Button */}
          <div className="absolute bottom-20 left-4 right-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleExit}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl',
                'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
                'hover:border-red-400 dark:hover:border-red-600',
                'transition-all duration-200 text-right',
                'hover:shadow-md active:scale-[0.98]'
              )}
            >
              <div className="p-2.5 rounded-lg bg-red-500 text-white">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-600 dark:text-red-400">الخروج</h3>
                <p className="text-xs text-muted-foreground">
                  إغلاق التطبيق
                </p>
              </div>
            </motion.button>
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
      
      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" />
              الخروج من التطبيق
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل تريد الخروج من التطبيق؟</span>
              <span className="block text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                لا تقلق، جميع بياناتك محفوظة تلقائياً ولن تُفقد.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-red-500 hover:bg-red-600">
              خروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
